// Orquesta la evaluación: revisa seguridad y espacios ____, arma el trabajo y llama al motor real.
import { TIEMPOS } from './config.js';
import { conTurno, nuevaCarpeta, borrar } from './procesos.js';
import { correrJava } from './java.js';
import { comprobarReact, vistaPreviaReact } from './react.js';
import { revisarJava, revisarReact } from './seguridad.js';
import { COSTO_PISTA } from './pistas.js';

/** Espacios ____ sin completar en los archivos editables indicados. */
export function blancos(act, nombres, archivos) {
  const r = [];
  for (const n of nombres) {
    if (act.archivos[n]?.soloLectura) continue;
    String(archivos[n] || '').split('\n').forEach((l, i) => { if (/_{4,}/.test(l)) r.push({ archivo: n, linea: i + 1 }); });
  }
  return r;
}

function subconjunto(archivos, nombres) {
  const r = {};
  for (const n of nombres) if (n in archivos) r[n] = archivos[n];
  return r;
}

/** "GET /api/hola" / "POST /api/vacantes {json}" / "POST /api/estudiantes nombre=Ana&edad=17" */
export function leerPeticiones(texto) {
  const lista = [];
  for (const linea of String(texto || '').split('\n')) {
    const l = linea.trim();
    if (!l || l.startsWith('#')) continue;
    const m = l.match(/^(GET|POST|PUT|PATCH|DELETE)\s+(\/\S*)(?:\s+([\s\S]+))?$/i);
    if (!m) { lista.push({ invalida: l }); continue; }
    lista.push({ metodo: m[1].toUpperCase(), ruta: m[2], cuerpo: (m[3] || '').trim() });
    if (lista.length >= 12) break;
  }
  return lista;
}

const AGOTADO = s => ({ tiempoAgotado: true, mensaje: `Tu código tardó más de ${s} segundos y se detuvo. ¿Hay un ciclo infinito (un for o while que nunca termina)?` });

async function trabajoJava(act, archivos, pasos, modo, ejecutar, ms) {
  const dir = nuevaCarpeta();
  try {
    // Se envía el proyecto completo: el evaluador compila todo junto y, si algo no compila,
    // aísla cada paso con sus propios archivos (ver Evaluador.compilarParaPaso).
    const trabajo = {
      dir, modo, paquete: act.motor.paquete, extras: act.motor.extras,
      archivos,
      pasos: pasos.map(p => ({ id: p.id, compilar: p.compilar, prueba: p.prueba })),
    };
    if (ejecutar) trabajo.ejecutar = ejecutar;
    const r = await conTurno(() => correrJava(act.motor.lib, trabajo, ms));
    if (r.tiempoAgotado) return AGOTADO(Math.round(ms / 1000));
    if (r.fallo) throw new Error(r.fallo);
    if (r.resultado.errorInterno) throw new Error(r.resultado.errorInterno);
    return r.resultado;
  } finally {
    borrar(dir);
  }
}

/**
 * ▶ Ejecutar o ✔ Comprobar un paso. Los espacios ____ pendientes no detienen la evaluación: el estudiante ve los
 * errores reales del compilador y, aparte, la lista de espacios que le faltan (pendientes).
 */
export async function evaluarPaso(act, paso, archivos, modo, textoPeticiones) {
  const r = await evaluarSinAvisos(act, paso, archivos, modo, textoPeticiones);
  const b = blancos(act, paso.compilar, archivos);
  return b.length ? { ...r, pendientes: b } : r;
}

async function evaluarSinAvisos(act, paso, archivos, modo, textoPeticiones) {
  const t0 = Date.now();
  const seg = act.motor.tipo === 'java' ? revisarJava(archivos) : revisarReact(subconjunto(archivos, paso.compilar));
  if (seg.length) return { errores: seg };

  if (act.motor.tipo === 'react') {
    const dir = nuevaCarpeta();
    try {
      if (modo === 'ejecutar') {
        const r = await conTurno(() => vistaPreviaReact(dir, archivos, paso, act.componentes));
        return { ...r, ms: Date.now() - t0 };
      }
      const r = await conTurno(() => comprobarReact(dir, archivos, [paso], TIEMPOS.comprobar));
      const p = r.pasos[paso.id];
      if (p.tiempoAgotado) return AGOTADO(5);
      return { errores: p.errores, pruebas: p.pruebas, consola: r.consola, ms: Date.now() - t0 };
    } finally {
      borrar(dir);
    }
  }

  // Java
  if (modo === 'ejecutar') {
    const e = paso.ejecutar || {};
    let cfg;
    if (e.codigo) cfg = { tipo: 'java', codigo: e.codigo };
    else {
      const peticiones = leerPeticiones(textoPeticiones ?? e.peticiones);
      const malas = peticiones.filter(p => p.invalida);
      if (malas.length) return { peticionesInvalidas: malas.map(p => p.invalida) };
      if (!peticiones.length) return { peticionesInvalidas: ['(no escribiste ninguna petición)'] };
      cfg = { tipo: 'http', aplicacion: act.motor.aplicacion, peticiones };
    }
    const r = await trabajoJava(act, archivos, [paso], 'ejecutar', cfg, TIEMPOS.ejecutar);
    return { ...r, ms: Date.now() - t0 };
  }
  const r = await trabajoJava(act, archivos, [paso], 'comprobar', null, TIEMPOS.comprobar);
  if (r.tiempoAgotado) return r;
  const p = r.pasos[paso.id];
  return { errores: p.errores || [], pruebas: p.pruebas || [], consola: r.consola, ms: Date.now() - t0 };
}

/**
 * 🏁 Calificar toda la actividad: corre todas las pruebas de todos los pasos.
 * pistas = { idPaso: pistas abiertas }: cada una resta COSTO_PISTA del valor de su paso.
 */
export async function calificar(act, archivos, pistas = {}) {
  const porPaso = {};
  const evaluables = [];
  for (const p of act.pasos) {
    const b = blancos(act, p.compilar, archivos);
    const seg = act.motor.tipo === 'java' ? revisarJava(archivos) : revisarReact(subconjunto(archivos, p.compilar));
    if (b.length) porPaso[p.id] = { ok: 0, total: p.nPruebas, nota: 'Tiene espacios ____ sin completar' };
    else if (seg.length) porPaso[p.id] = { ok: 0, total: p.nPruebas, nota: seg[0].mensaje };
    else evaluables.push(p);
  }
  if (evaluables.length) {
    let r;
    if (act.motor.tipo === 'java') {
      r = await trabajoJava(act, archivos, evaluables, 'comprobar', null, TIEMPOS.calificar);
      if (r.tiempoAgotado) r = { pasos: {} , agotado: true };
    } else {
      const dir = nuevaCarpeta();
      try { r = await conTurno(() => comprobarReact(dir, archivos, evaluables, 20_000)); } finally { borrar(dir); }
    }
    for (const p of evaluables) {
      const x = r.pasos[p.id];
      if (!x) { porPaso[p.id] = { ok: 0, total: p.nPruebas, nota: r.agotado ? 'Se agotó el tiempo (¿ciclo infinito?)' : 'No se pudo evaluar' }; continue; }
      if (x.tiempoAgotado) { porPaso[p.id] = { ok: 0, total: p.nPruebas, nota: 'Se agotó el tiempo (¿ciclo infinito?)' }; continue; }
      if (x.errores && x.errores.length) {
        const e = x.errores[0];
        porPaso[p.id] = { ok: 0, total: p.nPruebas, nota: `No compila: ${e.archivo}${e.linea ? ', línea ' + e.linea : ''}: ${String(e.mensaje).split('\n')[0]}` };
        continue;
      }
      const ok = x.pruebas.filter(t => t.ok).length;
      porPaso[p.id] = { ok, total: Math.max(p.nPruebas || 0, x.pruebas.length), pruebas: x.pruebas.map(t => [t.nombre, t.ok]) };
    }
  }
  let suma = 0;
  const valorPaso = 5 / act.pasos.length;
  const detalle = act.pasos.map(p => {
    const x = porPaso[p.id];
    const usadas = Math.max(0, Number(pistas[p.id]) || 0);
    const factor = Math.max(0, 1 - COSTO_PISTA * usadas);
    const aporte = valorPaso * (x.total ? x.ok / x.total : 0) * factor;
    suma += aporte;
    return { paso: p.id, titulo: p.titulo, ok: x.ok, total: x.total, nota: x.nota || '', pruebas: x.pruebas || [],
      pistas: usadas, aporte: Math.round(aporte * 100) / 100 };
  });
  const nota = Math.round(suma * 10) / 10;
  return { nota, detalle };
}
