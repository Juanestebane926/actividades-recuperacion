/*
 * Corre las pruebas de React de un paso (escritas con Testing Library y expect, igual que en
 * Vitest/Jest) contra el código del estudiante, dentro de un DOM real de jsdom.
 *
 *   node --enable-source-maps correr-pruebas.cjs <bundle.cjs> <carpetaEstudiante>
 *
 * El bundle (lo arma esbuild en el servidor) contiene el archivo de pruebas y los componentes del
 * estudiante; react, react-dom y @testing-library/react se cargan desde node_modules.
 * Imprime una línea "@@RESULTADO@@{json}".
 */
'use strict';
const path = require('node:path');
const salidaReal = process.stdout.write.bind(process.stdout);
const [bundle, carpeta] = process.argv.slice(2);

// ---------------------------------------------------------------- DOM real (jsdom)
const { JSDOM } = require('jsdom');
const dom = new JSDOM('<!doctype html><html><head><title></title></head><body></body></html>', { url: 'http://localhost/', pretendToBeVisual: true });
const w = dom.window;
const globales = ['window', 'document', 'navigator', 'HTMLElement', 'HTMLInputElement', 'HTMLTextAreaElement', 'HTMLFormElement',
  'HTMLButtonElement', 'Node', 'NodeList', 'Element', 'Text', 'Event', 'KeyboardEvent', 'MouseEvent', 'InputEvent', 'FocusEvent',
  'SubmitEvent', 'CustomEvent', 'MutationObserver', 'getComputedStyle', 'requestAnimationFrame', 'cancelAnimationFrame', 'DocumentFragment'];
for (const g of globales) if (w[g] !== undefined) Object.defineProperty(global, g, { value: g === 'window' ? w : w[g], configurable: true, writable: true });
global.IS_REACT_ACT_ENVIRONMENT = true;
process.env.DEBUG_PRINT_LIMIT = '1500';

// ---------------------------------------------------------------- consola capturada
const consola = [];
let erroresConsola = [];
let excepciones = [];   // errores que el código lanzó dentro de un evento (clic, envío, onChange)
const texto = a => a.map(x => typeof x === 'string' ? x : (x instanceof Error ? x.message : safeJson(x))).join(' ');
function safeJson(x) { try { return JSON.stringify(x); } catch (e) { return String(x); } }
console.log = (...a) => consola.push(texto(a));
console.info = console.log;
console.warn = (...a) => consola.push('⚠ ' + texto(a));
console.error = (...a) => {
  // jsdom informa así un error lanzado dentro de un evento: "Error: Uncaught [TypeError: …]" con el error original en .detail
  for (const x of a) {
    if (x && x.detail instanceof Error) excepciones.push(x.detail);
    else if (x instanceof Error && !/^Warning/.test(x.message)) excepciones.push(x);
  }
  const t = formato(a); erroresConsola.push(t); consola.push('✖ ' + t);
};
// React usa "Warning: ... %s" con sustituciones
function formato(a) {
  if (typeof a[0] === 'string' && a[0].includes('%s')) { let i = 1; return a[0].replace(/%s/g, () => String(a[i++])).split('\n')[0]; }
  return texto(a).split('\n')[0];
}

// ---------------------------------------------------------------- API de pruebas (compatible con Vitest/Jest)
const pruebas = [], antes = [], despues = [];
let prefijo = '';
global.describe = (n, fn) => { const p = prefijo; prefijo = p + n + ' › '; fn(); prefijo = p; };
global.test = global.it = (nombre, fn) => pruebas.push({ nombre: prefijo + nombre, fn });
global.beforeEach = fn => antes.push(fn);
global.afterEach = fn => despues.push(fn);
global.expect = require('expect').expect;
const espias = [];
global.vi = {
  fn(impl) {
    const f = (...a) => { f.mock.calls.push(a); return impl ? impl(...a) : undefined; };
    f.mock = { calls: [] };
    f._isMockFunction = true;
    f.getMockName = () => 'vi.fn()';
    return f;
  },
  spyOn(obj, met) {
    const orig = obj[met];
    const f = global.vi.fn((...a) => orig.apply(obj, a));
    f.mockImplementation = impl => { obj[met] = (...a) => { f.mock.calls.push(a); return impl(...a); }; Object.assign(obj[met], { mock: f.mock, _isMockFunction: true }); return obj[met]; };
    f.mockRestore = () => { obj[met] = orig; };
    obj[met] = f;
    espias.push(f);
    return f;
  }
};
/** Errores que React escribió en console.error durante la prueba actual (p. ej. la advertencia de key). */
global.erroresDeReact = () => erroresConsola.slice();
/** Código fuente de un archivo del estudiante, sin comentarios (para revisar cómo se escribió algo). */
global.fuente = nombre => {
  try {
    return require('node:fs').readFileSync(path.join(carpeta, nombre), 'utf8')
      .replace(/\{\/\*[\s\S]*?\*\/\}/g, '').replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
  } catch (e) { return ''; }
};

// ---------------------------------------------------------------- explicar fallas
const ANSI = /\u001b\[[0-9;]*m/g;
function dondeOcurrio(e) {
  const pila = String(e && e.stack || '');
  const re = /([\w-]+\.jsx?):(\d+):(\d+)/g;
  let m;
  while ((m = re.exec(pila))) {
    if (/\.test\.jsx?$/.test(m[1]) || /^test\.jsx?$/.test(m[1]) || m[1] === 'correr-pruebas.cjs') continue;
    const linea = pila.slice(0, m.index).split('\n').pop();
    if (linea.includes('node_modules')) continue;
    return `en ${m[1]}, línea ${m[2]}`;
  }
  return null;
}
function explicar(e) {
  if (!e) return 'Error desconocido';
  let msg = String(e.message || e).replace(ANSI, '').trim();
  if (e.pista) msg = e.pista + '\n\n' + msg;
  const esAssert = e.matcherResult || /^expect\(/.test(String(e.message || '').replace(ANSI, '')) || e.pista;
  if (!esAssert) {
    if (/Too many re-renders/.test(msg)) msg = 'Se está llamando una función que cambia el estado mientras React dibuja el componente. ¿Pusiste paréntesis donde debías pasar la función sin llamarla?\n\n' + msg;
    msg = 'Tu código lanzó un error: ' + (e.name && e.name !== 'Error' ? e.name + ': ' : '') + msg;
    const d = dondeOcurrio(e);
    if (d) msg += '\n   ' + d;
  }
  return msg.length > 2500 ? msg.slice(0, 2500) + '\n…' : msg;
}

// ---------------------------------------------------------------- correr
async function correr() {
  const resultados = [];
  try {
    require(path.resolve(bundle));
  } catch (e) {
    return { cargar: explicar(e), pruebas: [] };
  }
  const rtl = require('@testing-library/react');
  for (const p of pruebas) {
    erroresConsola = [];
    excepciones = [];
    const desde = consola.length;
    document.title = '';
    let ok = true, mensaje = '';
    try {
      for (const f of antes) await f();
      await Promise.race([
        Promise.resolve().then(() => p.fn()),
        new Promise((_, rej) => setTimeout(() => rej(Object.assign(new Error('La prueba no terminó en 5 segundos. ¿Hay un ciclo infinito o un useEffect que se ejecuta sin parar?'), { pista: ' ' })), 5000))
      ]);
    } catch (e) {
      ok = false;
      mensaje = explicar(e);
      // Si además el código lanzó un error dentro de un evento, eso es lo primero que hay que ver
      const x = excepciones[0];
      if (x && !mensaje.startsWith('Tu código lanzó')) {
        const d = dondeOcurrio(x);
        mensaje = `Tu código lanzó un error al escribir, hacer clic o enviar: ${x.name && x.name !== 'Error' ? x.name + ': ' : ''}${String(x.message).replace(ANSI, '')}${d ? '\n   ' + d : ''}\n\n` + mensaje;
      }
    }
    try { for (const f of despues) await f(); } catch (e) { /* limpieza */ }
    rtl.cleanup();
    while (espias.length) espias.pop().mockRestore();
    const r = { nombre: p.nombre, ok };
    if (!ok) r.mensaje = mensaje;
    const impreso = consola.slice(desde).join('\n');
    if (impreso) r.salida = impreso.slice(0, 3000);
    resultados.push(r);
  }
  return { pruebas: resultados };
}

correr().then(r => {
  r.consola = consola.join('\n').slice(0, 20000);
  salidaReal('@@RESULTADO@@' + JSON.stringify(r) + '\n', () => process.exit(0));
}, e => {
  salidaReal('@@RESULTADO@@' + JSON.stringify({ errorInterno: String(e && e.stack || e) }) + '\n', () => process.exit(0));
});
