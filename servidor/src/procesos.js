// Cola de ejecución y procesos aislados para evaluar código de estudiantes.
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { DATOS, MAX_PARALELO, SANDBOX } from './config.js';

// ---------------------------------------------------------------- semáforo (máximo de evaluaciones a la vez)
let activos = 0;
const espera = [];
export function enCola() { return espera.length; }
export async function conTurno(fn) {
  if (activos >= MAX_PARALELO) await new Promise(r => espera.push(r));
  activos++;
  try { return await fn(); } finally {
    activos--;
    const sig = espera.shift();
    if (sig) sig();
  }
}

// ---------------------------------------------------------------- carpetas de trabajo
export const TRABAJOS = process.env.TRABAJOS || path.join(DATOS, 'trabajos');
fs.mkdirSync(TRABAJOS, { recursive: true });
if (SANDBOX) { try { fs.chmodSync(TRABAJOS, 0o711); } catch (e) { /* sin permisos */ } }

export function nuevaCarpeta() {
  const d = path.join(TRABAJOS, Date.now().toString(36) + '-' + crypto.randomBytes(4).toString('hex'));
  fs.mkdirSync(d, { recursive: true });
  if (SANDBOX) fs.chownSync(d, SANDBOX.uid, SANDBOX.gid);
  return d;
}

export function borrar(d) {
  fs.rm(d, { recursive: true, force: true, maxRetries: 3 }, () => {});
}

/** Opciones comunes de spawn: usuario sin privilegios (en Docker) y sin variables secretas. */
export function opcionesProceso(cwd, extraEnv = {}) {
  const env = { PATH: process.env.PATH, LANG: 'C.UTF-8', HOME: cwd, TMPDIR: cwd, TEMP: cwd, TMP: cwd, ...extraEnv };
  if (process.platform === 'win32') { env.SystemRoot = process.env.SystemRoot; env.USERPROFILE = cwd; }
  const o = { cwd, env, stdio: ['pipe', 'pipe', 'pipe'], windowsHide: true };
  if (SANDBOX) { o.uid = SANDBOX.uid; o.gid = SANDBOX.gid; }
  return o;
}

/**
 * Lee la salida de un proceso hasta la línea "@@RESULTADO@@{json}". Si se pasa el tiempo, lo mata.
 * Devuelve { resultado } o { tiempoAgotado } o { fallo }.
 */
export function esperarResultado(proc, ms) {
  return new Promise(resolve => {
    let out = '', err = '', listo = false;
    const fin = r => { if (listo) return; listo = true; clearTimeout(t); try { proc.kill('SIGKILL'); } catch (e) { } resolve(r); };
    const t = setTimeout(() => fin({ tiempoAgotado: true }), ms);
    proc.stdout.on('data', d => {
      out += d;
      if (out.length > 8_000_000) return fin({ fallo: 'La salida fue demasiado grande.' });
      const i = out.indexOf('@@RESULTADO@@');
      if (i >= 0) {
        const j = out.indexOf('\n', i);
        if (j >= 0) {
          try { fin({ resultado: JSON.parse(out.slice(i + 13, j)) }); }
          catch (e) { fin({ fallo: 'Respuesta ilegible del evaluador: ' + e.message }); }
        }
      }
    });
    proc.stderr.on('data', d => { if (err.length < 20000) err += d; });
    proc.on('error', e => fin({ fallo: 'No se pudo iniciar el evaluador: ' + e.message }));
    proc.on('exit', code => setTimeout(() => fin({ fallo: 'El evaluador terminó sin resultado (código ' + code + '). ' + err.slice(-1500) }), 50));
  });
}
