// Servidor de las actividades de recuperación.
//   - Sirve el sitio (portada, actividades, panel docente).
//   - /api: sesión del estudiante, avance, ▶ Ejecutar / ✔ Comprobar / 🏁 Calificar con ejecución real.
//   - /api/docente: notas, avance y código de cada estudiante (protegido con DOCENTE_CLAVE).
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { PUERTO, HOST, RAIZ, SERVIDOR, DOCENTE_CLAVE, CLAVE_GENERADA, SECRETO, MAX_PARALELO, ORIGENES } from './config.js';
import { Estudiantes, Progreso, Intentos, Entregas, pinCorrecto, resumen } from './db.js';
import { ACTIVIDADES, archivosValidos } from './actividades.js';
import { evaluarPaso, calificar } from './evaluar.js';
import { javaDisponible, precalentar } from './java.js';
import { enCola } from './procesos.js';

// ---------------------------------------------------------------- utilidades HTTP
class ErrorHttp extends Error { constructor(status, msg) { super(msg); this.status = status; } }
const fallar = (status, msg) => { throw new ErrorHttp(status, msg); };

function enviarJson(res, status, obj, extra = {}) {
  const cuerpo = JSON.stringify(obj);
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...extra });
  res.end(cuerpo);
}

async function leerJson(req, max = 1_500_000) {
  let tam = 0;
  const partes = [];
  for await (const c of req) {
    tam += c.length;
    if (tam > max) fallar(413, 'El código enviado es demasiado grande.');
    partes.push(c);
  }
  if (!tam) return {};
  try { return JSON.parse(Buffer.concat(partes).toString('utf8')); } catch (e) { fallar(400, 'JSON inválido'); }
}

function cookies(req) {
  const r = {};
  for (const p of String(req.headers.cookie || '').split(';')) {
    const i = p.indexOf('=');
    if (i > 0) r[p.slice(0, i).trim()] = decodeURIComponent(p.slice(i + 1).trim());
  }
  return r;
}

// ---------------------------------------------------------------- sesión del docente (token firmado)
// Se usa un token en la cabecera X-Docente (y no una cookie) porque la página puede estar en otro
// dominio (GitHub Pages) que la API.
function firmar(texto) { return crypto.createHmac('sha256', SECRETO).update(texto).digest('base64url'); }
function tokenDocente() {
  const exp = Date.now() + 12 * 3600_000;
  return exp + '.' + firmar('docente:' + exp);
}
function esDocente(req) {
  const c = req.headers['x-docente'] || new URL(req.url, 'http://x').searchParams.get('docente') || cookies(req).docente;
  if (!c) return false;
  const [exp, f] = String(c).split('.');
  if (!exp || !f || Number(exp) < Date.now()) return false;
  const esperado = firmar('docente:' + exp);
  return f.length === esperado.length && crypto.timingSafeEqual(Buffer.from(f), Buffer.from(esperado));
}
function claveCorrecta(clave) {
  const a = crypto.createHash('sha256').update(String(clave)).digest();
  const b = crypto.createHash('sha256').update(DOCENTE_CLAVE).digest();
  return crypto.timingSafeEqual(a, b);
}

// ---------------------------------------------------------------- límites de intentos
const fallosPin = new Map();     // "actividad|doc" o "docente|ip" -> { n, desde }
function bloqueado(clave) {
  const f = fallosPin.get(clave);
  if (!f) return false;
  if (Date.now() - f.desde > 15 * 60_000) { fallosPin.delete(clave); return false; }
  return f.n >= 8;
}
function fallo(clave) {
  const f = fallosPin.get(clave) || { n: 0, desde: Date.now() };
  f.n++;
  fallosPin.set(clave, f);
}

const ocupados = new Set();      // estudiantes con una evaluación en curso

// ---------------------------------------------------------------- estudiante
function estudianteDe(req) {
  const t = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  const e = t && Estudiantes.porToken(t);
  if (!e) fallar(401, 'Tu sesión no es válida. Vuelve a entrar con tu documento y PIN.');
  const act = ACTIVIDADES[e.actividad];
  if (!act) fallar(404, 'Actividad desconocida');
  return { e, act };
}

function estadoInicial(act) {
  return { v: 2, archivos: { ...act.originales }, paso: 0, pistas: {}, peticiones: {}, res: {}, inicio: Date.now() };
}

function estadoDe(e, act) {
  const s = Progreso.leer(e.id) || estadoInicial(act);
  s.archivos = archivosValidos(act, s.archivos);
  return s;
}

/** Mezcla lo que envía el navegador con lo guardado. Los resultados (res) solo los escribe el servidor. */
function guardarEstado(e, act, recibido) {
  const s = estadoDe(e, act);
  if (recibido.archivos) s.archivos = archivosValidos(act, { ...s.archivos, ...recibido.archivos });
  if (Number.isInteger(recibido.paso) && recibido.paso >= 0 && recibido.paso <= act.pasos.length) s.paso = recibido.paso;
  if (recibido.pistas && typeof recibido.pistas === 'object') {
    for (const p of act.pasos) { const v = Number(recibido.pistas[p.id]); if (v > 0 && v <= 10) s.pistas[p.id] = Math.max(s.pistas[p.id] || 0, v); }
  }
  if (recibido.peticiones && typeof recibido.peticiones === 'object') {
    for (const p of act.pasos) { const v = recibido.peticiones[p.id]; if (typeof v === 'string') s.peticiones[p.id] = v.slice(0, 3000); }
  }
  Progreso.guardar(e.id, s);
  Estudiantes.tocar(e.id);
  return s;
}

function publico(e, s) {
  return { nombre: e.nombre, doc: e.doc, actividad: e.actividad, estado: s, entregas: Entregas.de(e.id).slice(0, 5) };
}

const rutasApi = {
  'POST /api/sesion': async (req, res) => {
    const b = await leerJson(req, 10_000);
    const act = ACTIVIDADES[b.actividad] || fallar(404, 'Actividad desconocida');
    const nombre = String(b.nombre || '').trim().replace(/\s+/g, ' ').slice(0, 80);
    const doc = String(b.doc || '').trim().replace(/\s+/g, '').slice(0, 30);
    const pin = String(b.pin || '').trim();
    if (!/^[\w.-]{3,30}$/.test(doc)) fallar(400, 'Escribe tu documento o código de estudiante (solo números, letras, punto o guion).');
    if (!/^\d{4,8}$/.test(pin)) fallar(400, 'El PIN debe tener de 4 a 8 números.');
    const clave = act.id + '|' + doc;
    if (bloqueado(clave)) fallar(429, 'Demasiados intentos con un PIN incorrecto. Espera 15 minutos o pídele al profesor que restablezca tu PIN.');
    let e = Estudiantes.porDoc(act.id, doc);
    if (e) {
      if (!pinCorrecto(pin, e.pin)) {
        fallo(clave);
        fallar(401, 'Ya hay una actividad con ese documento y el PIN no coincide. Escribe el PIN que elegiste al empezar (si lo olvidaste, pídele al profesor que lo restablezca).');
      }
    } else {
      if (nombre.length < 5 || !/\s/.test(nombre)) fallar(400, 'Escribe tu nombre completo (nombre y apellido).');
      e = Estudiantes.crear(act.id, doc, nombre, pin);
      Progreso.guardar(e.id, estadoInicial(act));
    }
    Estudiantes.tocar(e.id);
    enviarJson(res, 200, { token: e.token, ...publico(e, estadoDe(e, act)) });
  },

  'GET /api/yo': async (req, res) => {
    const { e, act } = estudianteDe(req);
    enviarJson(res, 200, publico(e, estadoDe(e, act)));
  },

  'PUT /api/progreso': async (req, res) => {
    const { e, act } = estudianteDe(req);
    const b = await leerJson(req);
    guardarEstado(e, act, b);
    enviarJson(res, 200, { ok: true });
  },

  'POST /api/evaluar': async (req, res) => {
    const { e, act } = estudianteDe(req);
    const b = await leerJson(req);
    const paso = act.pasos.find(p => p.id === b.paso) || fallar(404, 'Paso desconocido');
    const modo = b.modo === 'ejecutar' ? 'ejecutar' : 'comprobar';
    if (ocupados.has(e.id)) fallar(429, 'Ya hay una evaluación tuya en curso. Espera a que termine.');
    ocupados.add(e.id);
    try {
      const s = guardarEstado(e, act, { archivos: b.archivos, peticiones: b.peticiones ? { [paso.id]: b.peticiones } : undefined });
      const r = await evaluarPaso(act, paso, s.archivos, modo, b.peticiones);
      if (modo === 'comprobar') {
        const ok = (r.pruebas || []).filter(x => x.ok).length;
        const total = Math.max(paso.nPruebas || 0, (r.pruebas || []).length);
        const s2 = estadoDe(e, act);
        s2.res[paso.id] = { ok, total, t: Date.now() };
        Progreso.guardar(e.id, s2);
        Intentos.registrar(e.id, paso.id, modo, ok, total, r.ms);
        r.progreso = s2.res;
      } else {
        Intentos.registrar(e.id, paso.id, modo, null, null, r.ms);
      }
      enviarJson(res, 200, r);
    } finally {
      ocupados.delete(e.id);
    }
  },

  'POST /api/calificar': async (req, res) => {
    const { e, act } = estudianteDe(req);
    const b = await leerJson(req);
    if (ocupados.has(e.id)) fallar(429, 'Ya hay una evaluación tuya en curso. Espera a que termine.');
    ocupados.add(e.id);
    try {
      const s = guardarEstado(e, act, { archivos: b.archivos });
      const r = await calificar(act, s.archivos);
      const archivos = {};
      for (const n of Object.keys(act.archivos)) if (!act.archivos[n].soloLectura) archivos[n] = s.archivos[n];
      const id = Entregas.guardar(e.id, r.nota, r.detalle, archivos);
      const s2 = estadoDe(e, act);
      for (const d of r.detalle) s2.res[d.paso] = { ok: d.ok, total: d.total, t: Date.now() };
      Progreso.guardar(e.id, s2);
      enviarJson(res, 200, { ...r, id, fecha: Date.now(), progreso: s2.res });
    } finally {
      ocupados.delete(e.id);
    }
  },

  'GET /api/estado': async (req, res) => {
    enviarJson(res, 200, { java: javaDisponible(), enCola: enCola(), paralelo: MAX_PARALELO });
  },

  // ------------------------------------------------------------ docente
  'POST /api/docente/entrar': async (req, res) => {
    const b = await leerJson(req, 2000);
    const ip = 'docente|' + (req.socket.remoteAddress || '');
    if (bloqueado(ip)) fallar(429, 'Demasiados intentos. Espera 15 minutos.');
    if (!claveCorrecta(b.clave || '')) { fallo(ip); fallar(401, 'Clave incorrecta.'); }
    enviarJson(res, 200, { ok: true, token: tokenDocente() });
  },
  'POST /api/docente/salir': async (req, res) => {
    enviarJson(res, 200, { ok: true });
  },
  'GET /api/docente/estudiantes': async (req, res) => {
    soloDocente(req);
    const filas = resumen().map(r => {
      const act = ACTIVIDADES[r.actividad];
      const s = r.estado ? JSON.parse(r.estado) : { res: {} };
      const pasos = act ? act.pasos.map(p => { const x = (s.res || {})[p.id]; return x ? [x.ok, x.total] : null; }) : [];
      return {
        id: r.id, actividad: r.actividad, curso: act?.curso || r.actividad, doc: r.doc, nombre: r.nombre, creado: r.creado, ultimo: r.ultimo,
        pasoActual: s.paso, pasos, ultimaNota: r.ultima_nota, ultimaFecha: r.ultima_fecha, mejorNota: r.mejor_nota,
        entregas: r.n_entregas, comprobaciones: r.n_comprobar, ejecuciones: r.n_ejecutar,
      };
    });
    const actividades = Object.values(ACTIVIDADES).map(a => ({ id: a.id, curso: a.curso, pasos: a.pasos.map(p => p.titulo) }));
    enviarJson(res, 200, { estudiantes: filas, actividades });
  },
  'GET /api/docente/notas.csv': async (req, res) => {
    soloDocente(req);
    const filas = [['Curso', 'Documento', 'Nombre', 'Última nota', 'Fecha última nota', 'Mejor nota', 'Entregas', 'Comprobaciones', 'Última actividad']];
    const f = t => t ? new Date(t).toLocaleString('es-CO', { timeZone: 'America/Bogota' }) : '';
    for (const r of resumen()) {
      filas.push([ACTIVIDADES[r.actividad]?.curso || r.actividad, r.doc, r.nombre, r.ultima_nota ?? '', f(r.ultima_fecha), r.mejor_nota ?? '', r.n_entregas, r.n_comprobar, f(r.ultimo)]);
    }
    const csv = '﻿' + filas.map(l => l.map(c => '"' + String(c).replace(/"/g, '""') + '"').join(';')).join('\r\n');
    res.writeHead(200, { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': 'attachment; filename="notas-recuperacion.csv"', 'Cache-Control': 'no-store' });
    res.end(csv);
  },
};

function soloDocente(req) { if (!esDocente(req)) fallar(401, 'Inicia sesión como docente.'); }

// Rutas con :id
const rutasDocenteId = {
  'GET': async (req, res, id) => {
    const e = Estudiantes.porId(id) || fallar(404, 'No existe');
    const act = ACTIVIDADES[e.actividad];
    enviarJson(res, 200, {
      id: e.id, nombre: e.nombre, doc: e.doc, actividad: e.actividad, curso: act.curso, creado: e.creado, ultimo: e.ultimo,
      estado: estadoDe(e, act), entregas: Entregas.de(e.id), intentos: Intentos.de(e.id),
      pasos: act.pasos.map(p => ({ id: p.id, titulo: p.titulo })), editables: Object.keys(act.archivos).filter(n => !act.archivos[n].soloLectura),
    });
  },
  'POST recalificar': async (req, res, id) => {
    const e = Estudiantes.porId(id) || fallar(404, 'No existe');
    const act = ACTIVIDADES[e.actividad];
    const b = await leerJson(req, 2000);
    let archivos;
    if (b.entrega) {
      const en = Entregas.una(Number(b.entrega));
      if (!en || en.estudiante_id !== e.id) fallar(404, 'Entrega no encontrada');
      archivos = archivosValidos(act, en.archivos);
    } else {
      archivos = estadoDe(e, act).archivos;
    }
    enviarJson(res, 200, await calificar(act, archivos));
  },
  'POST pin': async (req, res, id) => {
    const e = Estudiantes.porId(id) || fallar(404, 'No existe');
    const b = await leerJson(req, 2000);
    if (!/^\d{4,8}$/.test(String(b.pin || ''))) fallar(400, 'El PIN debe tener de 4 a 8 números.');
    Estudiantes.cambiarPin(e.id, String(b.pin));
    fallosPin.delete(e.actividad + '|' + e.doc);
    enviarJson(res, 200, { ok: true });
  },
  'DELETE': async (req, res, id) => {
    Estudiantes.borrar(id);
    enviarJson(res, 200, { ok: true });
  },
};

// ---------------------------------------------------------------- archivos estáticos
const TIPOS = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.jsx': 'text/plain; charset=utf-8', '.java': 'text/plain; charset=utf-8', '.md': 'text/plain; charset=utf-8',
  '.png': 'image/png', '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.json': 'application/json' };
const PUBLICAS = ['assets', 'spring-boot', 'react', 'java-web', 'docente'];
const MODULOS = path.join(SERVIDOR, 'node_modules');
const VENDOR = {
  'react.js': path.join(MODULOS, 'react', 'umd', 'react.development.js'),
  'react-dom.js': path.join(MODULOS, 'react-dom', 'umd', 'react-dom.development.js'),
};

function archivoEstatico(url) {
  let p = decodeURIComponent(url.split('?')[0]);
  if (p.includes('\0') || p.includes('..')) return null;
  if (p.startsWith('/vendor/')) {
    const n = p.slice(8);
    if (VENDOR[n]) return VENDOR[n];
    if (n.startsWith('codemirror/')) {
      const f = path.join(MODULOS, 'codemirror', n.slice(11));
      return /\.(js|css)$/.test(f) && f.startsWith(path.join(MODULOS, 'codemirror')) ? f : null;
    }
    return null;
  }
  if (p === '/' || p === '/index.html') return path.join(RAIZ, 'index.html');
  const partes = p.split('/').filter(Boolean);
  if (!PUBLICAS.includes(partes[0])) return null;
  let f = path.join(RAIZ, ...partes);
  if (p.endsWith('/')) f = path.join(f, 'index.html');
  return f;
}

function servirEstatico(req, res) {
  const f = archivoEstatico(req.url);
  if (!f) { res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }); return res.end('No encontrado'); }
  fs.stat(f, (err, st) => {
    if (err || !st.isFile()) {
      // /react -> /react/
      if (!err && st.isDirectory()) { res.writeHead(301, { Location: req.url.split('?')[0] + '/' }); return res.end(); }
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }); return res.end('No encontrado');
    }
    const vendor = req.url.startsWith('/vendor/');
    res.writeHead(200, {
      'Content-Type': TIPOS[path.extname(f)] || 'application/octet-stream',
      'Content-Length': st.size,
      'Cache-Control': vendor ? 'public, max-age=86400' : 'no-cache',
      'X-Content-Type-Options': 'nosniff',
    });
    if (req.method === 'HEAD') return res.end();
    fs.createReadStream(f).pipe(res);
  });
}

// ---------------------------------------------------------------- servidor
/** CORS: la página (GitHub Pages) llama a esta API desde otro dominio. */
function cors(req, res) {
  const origen = req.headers.origin;
  if (!origen) return true;
  const permitido = ORIGENES.includes('*') || ORIGENES.includes(origen) || /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origen);
  if (!permitido) return false;
  res.setHeader('Access-Control-Allow-Origin', origen);
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Docente');
  res.setHeader('Access-Control-Max-Age', '86400');
  return true;
}

const servidor = http.createServer(async (req, res) => {
  try {
    const ruta = req.url.split('?')[0];
    if (ruta.startsWith('/api/')) {
      if (!cors(req, res)) fallar(403, 'Origen no permitido');
      if (req.method === 'OPTIONS') { res.writeHead(204); return res.end(); }
      const h = rutasApi[req.method + ' ' + ruta];
      if (h) return await h(req, res);
      const m = ruta.match(/^\/api\/docente\/estudiantes\/(\d+)(?:\/(\w+))?$/);
      if (m) {
        soloDocente(req);
        const hd = rutasDocenteId[req.method + (m[2] ? ' ' + m[2] : '')];
        if (hd) return await hd(req, res, Number(m[1]));
      }
      fallar(404, 'Ruta desconocida');
    }
    if (req.method !== 'GET' && req.method !== 'HEAD') fallar(405, 'Método no permitido');
    servirEstatico(req, res);
  } catch (e) {
    if (res.headersSent) return res.end();
    if (e instanceof ErrorHttp) return enviarJson(res, e.status, { error: e.message });
    console.error(new Date().toISOString(), req.method, req.url, e);
    enviarJson(res, 500, { error: 'Error del evaluador: ' + String(e.message || e).split('\n').slice(0, 6).join('\n') });
  }
});
servidor.requestTimeout = 300_000;
servidor.headersTimeout = 60_000;

servidor.listen(PUERTO, HOST, () => {
  console.log(`Actividades de recuperación en http://localhost:${PUERTO}  (evaluaciones simultáneas: ${MAX_PARALELO})`);
  if (!javaDisponible()) console.warn('⚠ No está construido evaluador-java/build: ejecuta evaluador-java/build.sh (las actividades de Java no funcionarán).');
  if (CLAVE_GENERADA) console.log(`⚠ No se definió DOCENTE_CLAVE. Clave del panel docente para esta ejecución: ${DOCENTE_CLAVE}`);
  precalentar();
});

for (const s of ['SIGINT', 'SIGTERM']) process.on(s, () => { servidor.close(); process.exit(0); });
