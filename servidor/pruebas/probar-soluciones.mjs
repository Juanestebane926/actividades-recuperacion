// Prueba de punta a punta contra un servidor en marcha:
//   node pruebas/probar-soluciones.mjs <url> <carpeta soluciones del repo docente>
// Para cada actividad: entra como estudiante de prueba, ejecuta y comprueba cada paso con la
// solución de referencia y califica (debe dar 5.0). Luego borra al estudiante de prueba.
import fs from 'node:fs';
import path from 'node:path';

const [URL_BASE = 'http://localhost:8080', SOL = '../../actividades-recuperacion-docente/soluciones'] = process.argv.slice(2);
const CLAVE = process.env.DOCENTE_CLAVE;
const carpetas = { 'spring-boot': 'spring', 'java-web': 'web', 'react': 'react' };
let fallos = 0;

async function api(metodo, url, cuerpo, token, cookie) {
  const r = await fetch(URL_BASE + url, {
    method: metodo,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}), ...(cookie ? { Cookie: cookie } : {}) },
    body: cuerpo ? JSON.stringify(cuerpo) : undefined,
  });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(metodo + ' ' + url + ' → ' + r.status + ' ' + (d.error || ''));
  return { d, r };
}

function cargarActividad(id) {
  const w = {};
  new Function('window', fs.readFileSync(path.join(import.meta.dirname, '..', '..', id, 'actividad.js'), 'utf8'))(w);
  return w.ACTIVIDAD;
}

for (const [id, dir] of Object.entries(carpetas)) {
  const A = cargarActividad(id);
  const sol = {};
  for (const f of fs.readdirSync(path.join(SOL, dir))) sol[f] = fs.readFileSync(path.join(SOL, dir, f), 'utf8');
  const doc = 'prueba' + Date.now().toString().slice(-6);
  const { d: s } = await api('POST', '/api/sesion', { actividad: id, nombre: 'Estudiante De Prueba', doc, pin: '1234' });
  console.log(`\n=== ${A.curso} (${doc})`);
  // Con el código inicial deben aparecer los ____ pendientes
  const ini = await api('POST', '/api/evaluar', { paso: A.pasos[0].id, modo: 'comprobar', archivos: {} }, s.token);
  console.log(ini.d.blancos ? `  inicial: ${ini.d.blancos.length} espacios ____ detectados ✔` : '  ✘ el código inicial no mostró espacios ____');
  if (!ini.d.blancos) fallos++;
  for (const p of A.pasos) {
    const archivos = {};
    for (const n of p.compilar) if (sol[n]) archivos[n] = sol[n];
    const t0 = Date.now();
    const e = await api('POST', '/api/evaluar', { paso: p.id, modo: 'ejecutar', archivos }, s.token);
    const te = Date.now() - t0;
    const okE = !(e.d.errores && e.d.errores.length) && !e.d.excepcion && !e.d.errorInterno;
    const t1 = Date.now();
    const c = await api('POST', '/api/evaluar', { paso: p.id, modo: 'comprobar', archivos }, s.token);
    const tc = Date.now() - t1;
    const ok = (c.d.pruebas || []).filter(x => x.ok).length, total = (c.d.pruebas || []).length;
    const bien = okE && ok === total && total === p.nPruebas;
    if (!bien) fallos++;
    console.log(`  ${bien ? '✔' : '✘'} ${p.id} ejecutar ${okE ? 'ok' : 'FALLÓ'} (${te} ms) · comprobar ${ok}/${total} de ${p.nPruebas} (${tc} ms)`);
    if (!bien) console.log(JSON.stringify(c.d.errores || c.d.pruebas?.filter(x => !x.ok) || e.d, null, 1).slice(0, 1500));
  }
  const todos = {};
  for (const n of Object.keys(A.archivos)) if (sol[n] && !A.archivos[n].soloLectura) todos[n] = sol[n];
  const t2 = Date.now();
  const n = await api('POST', '/api/calificar', { archivos: todos }, s.token);
  console.log(`  ${n.d.nota === 5 ? '✔' : '✘'} nota con la solución: ${n.d.nota} (${Date.now() - t2} ms)`);
  if (n.d.nota !== 5) { fallos++; console.log(JSON.stringify(n.d.detalle, null, 1).slice(0, 2000)); }
  if (CLAVE) {
    const { r } = await api('POST', '/api/docente/entrar', { clave: CLAVE });
    const cookie = r.headers.get('set-cookie').split(';')[0];
    const { d: lista } = await api('GET', '/api/docente/estudiantes', null, null, cookie);
    const yo = lista.estudiantes.find(x => x.doc === doc);
    console.log(`  panel docente: ${yo ? 'aparece con última nota ' + yo.ultimaNota : '✘ no aparece'}`);
    if (yo) await api('DELETE', '/api/docente/estudiantes/' + yo.id, null, null, cookie);
  }
}
console.log(fallos ? `\n✘ ${fallos} fallos` : '\n✔ Todo bien');
process.exit(fallos ? 1 : 0);
