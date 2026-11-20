// Evaluador Java: lanza la JVM con javac, JUnit 5 y Spring Boot / Tomcat reales (evaluador-java/).
// Se mantienen procesos "precalentados" (JVM ya iniciada, javac y Spring/Tomcat cargados) para que
// cada evaluación tarde menos. Cada proceso atiende UN solo trabajo y luego muere: así un estudiante
// nunca comparte memoria, hilos ni archivos con otro.
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { EVALUADOR_JAVA, JAVA, MEMORIA_JAVA, POOL } from './config.js';
import { esperarResultado, opcionesProceso, TRABAJOS } from './procesos.js';

const SEP = process.platform === 'win32' ? ';' : ':';

function classpath(lib) {
  const b = path.join(EVALUADOR_JAVA, 'build');
  return path.join(b, 'clases-' + lib) + SEP + path.join(b, 'lib-' + lib, '*');
}

export function javaDisponible() {
  return ['spring', 'web'].every(l => fs.existsSync(path.join(EVALUADOR_JAVA, 'build', 'clases-' + l)));
}

function lanzar(lib) {
  const args = ['-Xmx' + MEMORIA_JAVA, '-Xss2m', '-XX:+UseSerialGC', '-XX:TieredStopAtLevel=1', '-XX:-UsePerfData',
    '-Dfile.encoding=UTF-8', '-Dstdout.encoding=UTF-8', '-Duser.language=en', '-Djava.awt.headless=true',
    '-cp', classpath(lib), 'curso.eval.Evaluador', '--esperar'];
  const proc = spawn(JAVA, args, opcionesProceso(TRABAJOS));
  proc.listo = new Promise(res => {
    let buf = '';
    const f = d => {
      buf += d;
      if (buf.includes('@@LISTO@@')) { proc.stdout.off('data', f); res(true); }
    };
    proc.stdout.on('data', f);
    proc.on('exit', () => res(false));
    proc.on('error', () => res(false));
  });
  proc.stderr.resume();
  return proc;
}

const reserva = { spring: [], web: [] };

function reponer(lib) {
  const lista = reserva[lib];
  while (lista.length < POOL[lib]) {
    const p = lanzar(lib);
    lista.push(p);
    p.on('exit', () => { const i = lista.indexOf(p); if (i >= 0) lista.splice(i, 1); });
  }
}

export function precalentar() {
  if (!javaDisponible()) return;
  reponer('spring');
  reponer('web');
}

async function tomar(lib) {
  const lista = reserva[lib];
  let p = lista.shift();
  if (!p || p.exitCode !== null) p = lanzar(lib);
  setTimeout(() => reponer(lib), 200);
  const ok = await p.listo;
  if (!ok) throw new Error('No se pudo iniciar Java. ¿Está instalado el JDK 17+ y construido evaluador-java (build.sh)?');
  return p;
}

/** Ejecuta un trabajo en un proceso Java nuevo. trabajo.dir debe existir. */
export async function correrJava(lib, trabajo, ms) {
  const ruta = path.join(trabajo.dir, 'trabajo.json');
  fs.writeFileSync(ruta, JSON.stringify(trabajo));
  const p = await tomar(lib);
  const espera = esperarResultado(p, ms);
  p.stdin.write(ruta + '\n');
  p.stdin.end();
  return espera;
}
