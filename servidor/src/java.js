// Evaluador Java: JVM con javac, JUnit 5 y Spring Boot / Tomcat reales (evaluador-java/).
//
// Hay UN proceso Java vivo por curso ("trabajador") que atiende las evaluaciones una tras otra con
// todo ya cargado y el JIT caliente, así cada clic tarda segundos y no lo que tarda arrancar una JVM.
// Cada trabajo usa sus propios classloaders (el código de un estudiante no ve el de otro). El
// trabajador se apaga solo tras un rato sin uso (para no ocupar RAM) y se recicla cada cierto número
// de trabajos o si se pasa de tiempo (ciclo infinito): en ese caso se mata y se crea otro.
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { EVALUADOR_JAVA, JAVA, MEMORIA_JAVA, POOL } from './config.js';
import { opcionesProceso, TRABAJOS } from './procesos.js';

const SEP = process.platform === 'win32' ? ';' : ':';
const INACTIVIDAD = Number(process.env.JAVA_INACTIVIDAD_MIN || 15) * 60_000;

function classpath(lib) {
  const b = path.join(EVALUADOR_JAVA, 'build');
  return path.join(b, 'clases-' + lib) + SEP + path.join(b, 'lib-' + lib, '*');
}

export function javaDisponible() {
  return ['spring', 'web'].every(l => fs.existsSync(path.join(EVALUADOR_JAVA, 'build', 'clases-' + l)));
}

class Trabajador {
  constructor(lib) {
    this.lib = lib;
    const args = ['-Xmx' + MEMORIA_JAVA, '-Xss2m', '-XX:+UseSerialGC', '-XX:MaxMetaspaceSize=256m', '-XX:-UsePerfData',
      '-XX:+UseStringDeduplication', '-Dfile.encoding=UTF-8', '-Dstdout.encoding=UTF-8', '-Duser.language=en',
      '-Djava.awt.headless=true', '-cp', classpath(lib), 'curso.eval.Evaluador', '--servidor'];
    this.proc = spawn(JAVA, args, opcionesProceso(TRABAJOS));
    this.vivo = true;
    this.buf = '';
    this.pendiente = null;
    this.listo = new Promise(res => { this._listo = res; });
    this.proc.stdout.setEncoding('utf8');
    this.proc.stdout.on('data', d => this.datos(d));
    this.proc.stderr.resume();
    this.proc.stdin.on('error', () => {});
    const fin = () => {
      this.vivo = false;
      this._listo(false);
      if (this.pendiente) this.pendiente.resolve({ fallo: 'El evaluador Java se detuvo inesperadamente. Vuelve a intentarlo.' });
      this.pendiente = null;
    };
    this.proc.on('exit', fin);
    this.proc.on('error', fin);
    this.tocar();
  }

  datos(d) {
    this.buf += d;
    if (this.buf.includes('@@LISTO@@')) { this.buf = this.buf.slice(this.buf.indexOf('@@LISTO@@') + 9); this._listo(true); }
    let i;
    while (this.pendiente && (i = this.buf.indexOf('@@RESULTADO@@')) >= 0) {
      const j = this.buf.indexOf('\n', i);
      if (j < 0) break;
      const linea = this.buf.slice(i + 13, j);
      this.buf = this.buf.slice(j + 1);
      const p = this.pendiente;
      this.pendiente = null;
      clearTimeout(p.timer);
      try { p.resolve({ resultado: JSON.parse(linea) }); } catch (e) { p.resolve({ fallo: 'Respuesta ilegible del evaluador: ' + e.message }); }
    }
    if (this.buf.length > 8_000_000) this.matar();
  }

  tocar() {
    clearTimeout(this.reposo);
    this.reposo = setTimeout(() => this.matar(), INACTIVIDAD);
  }

  matar() {
    this.vivo = false;
    clearTimeout(this.reposo);
    try { this.proc.kill('SIGKILL'); } catch (e) { }
  }

  async correr(ruta, ms) {
    this.tocar();
    return new Promise(resolve => {
      const timer = setTimeout(() => {
        // Ciclo infinito o algo trabado: se descarta el proceso entero y el próximo trabajo usa uno nuevo
        this.pendiente = null;
        this.matar();
        resolve({ tiempoAgotado: true });
      }, ms);
      this.pendiente = { resolve, timer };
      this.proc.stdin.write(ruta + '\n');
    });
  }
}

const trabajadores = {};

function trabajador(lib) {
  let t = trabajadores[lib];
  if (!t || !t.vivo) t = trabajadores[lib] = new Trabajador(lib);
  return t;
}

/** Arranca (si no está) el proceso Java del curso, p. ej. cuando el estudiante entra a la actividad. */
export function precalentarCurso(lib) {
  if (javaDisponible() && (lib === 'spring' || lib === 'web')) trabajador(lib);
}

/** Al iniciar el servidor: precalienta solo si se pidió (POOL_SPRING / POOL_WEB > 0). */
export function precalentar() {
  if (!javaDisponible()) return;
  if (POOL.spring > 0) trabajador('spring');
  if (POOL.web > 0) trabajador('web');
}

/** Ejecuta un trabajo. trabajo.dir debe existir. Los trabajos de un curso van uno tras otro. */
const colas = {};
export function correrJava(lib, trabajo, ms) {
  const anterior = colas[lib] || Promise.resolve();
  const p = anterior.then(() => correrJava1(lib, trabajo, ms));
  colas[lib] = p.catch(() => {});
  return p;
}

async function correrJava1(lib, trabajo, ms) {
  const ruta = path.join(trabajo.dir, 'trabajo.json');
  fs.writeFileSync(ruta, JSON.stringify(trabajo));
  for (let intento = 0; intento < 2; intento++) {
    const t = trabajador(lib);
    const ok = await t.listo;
    if (!ok) {
      if (intento === 0) continue;
      throw new Error('No se pudo iniciar Java. ¿Está instalado el JDK 17+ y construido evaluador-java (build.sh)?');
    }
    // El trabajador puede reciclarse justo después de un trabajo: si murió al recibirlo, se reintenta
    const r = await t.correr(ruta, ms);
    if (r.fallo && !t.vivo && intento === 0) continue;
    return r;
  }
}
