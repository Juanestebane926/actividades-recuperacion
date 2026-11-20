// Evaluador React: esbuild arma (y revisa la sintaxis de) los archivos del estudiante como lo haría
// Vite, y las pruebas se ejecutan con React 18 + Testing Library en un DOM real (jsdom), en un
// proceso de Node aparte con el modelo de permisos activado (sin escritura, sin procesos hijos).
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import * as esbuild from 'esbuild';
import { NODE, SERVIDOR } from './config.js';
import { esperarResultado, opcionesProceso } from './procesos.js';

const MODULOS = path.join(SERVIDOR, 'node_modules');
const PRUEBAS = path.join(SERVIDOR, 'react', 'pruebas');
const AYUDAS = path.join(SERVIDOR, 'react', 'ayudas.js');
const CORRER = path.join(SERVIDOR, 'react', 'correr-pruebas.cjs');

const [mayor, menor] = process.versions.node.split('.').map(Number);
const FLAG_PERMISOS = mayor > 23 || (mayor === 23 && menor >= 5) ? '--permission' : '--experimental-permission';

/** Escribe los archivos del estudiante en dir/estudiante. */
function escribir(dir, archivos) {
  const d = path.join(dir, 'estudiante');
  fs.mkdirSync(d, { recursive: true });
  for (const [n, src] of Object.entries(archivos)) {
    if (!/^[\w-]+\.jsx?$/.test(n)) continue;
    fs.writeFileSync(path.join(d, n), String(src));
  }
  return d;
}

/** Convierte los errores de esbuild (sintaxis, imports) al formato del editor. */
function errores(e, carpeta) {
  const lista = [];
  for (const m of (e.errors || [])) {
    const loc = m.location;
    const archivo = loc ? path.basename(loc.file) : '';
    const deEstudiante = loc && path.dirname(path.resolve(loc.file)) === path.resolve(carpeta);
    lista.push({ archivo, linea: loc ? loc.line : 0, columna: loc ? loc.column + 1 : 0, mensaje: m.text, codigo: loc ? loc.lineText : '', dePrueba: loc && !deEstudiante });
  }
  if (!lista.length) lista.push({ archivo: '', linea: 0, mensaje: String(e.message || e) });
  return lista;
}

function pluginEstudiante(carpeta) {
  return {
    name: 'estudiante',
    setup(b) {
      b.onResolve({ filter: /^@estudiante\// }, a => ({ path: path.join(carpeta, a.path.slice(12) + '.jsx') }));
      b.onResolve({ filter: /^@ayudas$/ }, () => ({ path: AYUDAS }));
    }
  };
}

/** Arma las pruebas de un paso junto con los componentes del estudiante. */
async function armarPruebas(dir, carpeta, pasoId) {
  const salida = path.join(dir, 'pruebas-' + pasoId + '.cjs');
  await esbuild.build({
    entryPoints: [path.join(PRUEBAS, pasoId + '.test.jsx')],
    outfile: salida,
    bundle: true, platform: 'node', format: 'cjs', target: 'node20',
    jsx: 'automatic', sourcemap: 'inline', sourcesContent: false, logLevel: 'silent',
    external: ['react', 'react-dom', 'react-dom/*', 'react/*', '@testing-library/*', 'expect'],
    resolveExtensions: ['.jsx', '.js'],
    nodePaths: [MODULOS],
    plugins: [pluginEstudiante(carpeta)],
  });
  return salida;
}

async function correrPaso(dir, carpeta, paso, ms) {
  let bundle;
  try {
    bundle = await armarPruebas(dir, carpeta, paso.id);
  } catch (e) {
    const errs = errores(e, carpeta);
    const deEstudiante = errs.filter(x => !x.dePrueba);
    if (deEstudiante.length) return { errores: deEstudiante, pruebas: [] };
    return {
      errores: [], pruebas: [{
        nombre: 'Las pruebas de este paso pudieron usar tu código', ok: false, noCompila: true,
        mensaje: 'Las pruebas no encontraron lo que necesitaban en tu código:\n' + errs.map(x => '  • ' + x.mensaje).join('\n') +
          '\nRevisa que no hayas cambiado el nombre de los componentes ni quitado el export.'
      }]
    };
  }
  const args = ['--enable-source-maps', '--stack-trace-limit=30', FLAG_PERMISOS,
    '--allow-fs-read=' + SERVIDOR + path.sep + '*', '--allow-fs-read=' + dir + path.sep + '*', '--max-old-space-size=256',
    CORRER, bundle, carpeta];
  if (FLAG_PERMISOS === '--experimental-permission') args.splice(2, 0, '--no-warnings');
  const proc = spawn(NODE, args, opcionesProceso(dir, { NODE_PATH: MODULOS, NODE_ENV: 'test' }));
  proc.stdin.end();
  const r = await esperarResultado(proc, ms);
  if (r.tiempoAgotado) return { tiempoAgotado: true };
  if (r.fallo) return { errorInterno: r.fallo };
  const x = r.resultado;
  if (x.errorInterno) return { errorInterno: x.errorInterno };
  if (x.cargar) {
    return { errores: [], consola: x.consola, pruebas: [{ nombre: 'Tu código se pudo cargar', ok: false, mensaje: x.cargar }] };
  }
  return { errores: [], pruebas: x.pruebas, consola: x.consola };
}

/** Comprobar (uno o varios pasos). Devuelve { pasos: { id: {errores, pruebas} }, consola }. */
export async function comprobarReact(dir, archivos, pasos, ms) {
  const salida = { pasos: {}, consola: '' };
  for (const paso of pasos) {
    const sub = path.join(dir, paso.id);
    fs.mkdirSync(sub, { recursive: true });
    const propios = {};
    for (const n of paso.compilar) if (n in archivos) propios[n] = archivos[n];
    const carpeta = escribir(sub, propios);
    const r = await correrPaso(sub, carpeta, paso, ms);
    if (r.tiempoAgotado) { salida.pasos[paso.id] = { errores: [], pruebas: [], tiempoAgotado: true }; continue; }
    if (r.errorInterno) throw new Error(r.errorInterno);
    salida.pasos[paso.id] = { errores: r.errores, pruebas: r.pruebas };
    if (r.consola) salida.consola += r.consola + '\n';
  }
  return salida;
}

/**
 * Ejecutar: arma una vista previa para el navegador. React y ReactDOM los sirve el propio
 * servidor (/vendor), así que el paquete del estudiante pesa pocos KB.
 */
export async function vistaPreviaReact(dir, archivos, paso, componentes) {
  const propios = {};
  for (const n of paso.compilar) if (n in archivos) propios[n] = archivos[n];
  const carpeta = escribir(dir, propios);
  let indice = '';
  for (const n of Object.keys(propios)) {
    const base = n.replace(/\.jsx?$/, '');
    indice += `export * from './${base}';\n`;
    if (/^\s*export\s+default\b/m.test(propios[n])) indice += `export { default as ${base} } from './${base}';\n`;
  }
  fs.writeFileSync(path.join(carpeta, '__todos.jsx'), indice);
  const nombres = componentes.filter(c => new RegExp('\\b' + c + '\\b').test(paso.demo));
  const entrada = `import * as __C from './__todos';\nconst { ${nombres.join(', ')} } = __C;\n` +
    `window.__montar(${paso.demo});\n`;
  fs.writeFileSync(path.join(carpeta, '__demo.jsx'), entrada);
  try {
    const r = await esbuild.build({
      entryPoints: [path.join(carpeta, '__demo.jsx')], write: false, bundle: true, format: 'iife', platform: 'browser',
      jsx: 'transform', jsxFactory: 'React.createElement', jsxFragment: 'React.Fragment', banner: { js: 'var React = window.React;' },
      logLevel: 'silent', sourcemap: 'inline', sourcesContent: true, resolveExtensions: ['.jsx', '.js'],
      plugins: [{
        name: 'globales',
        setup(b) {
          b.onResolve({ filter: /^react(-dom)?(\/client)?$/ }, a => ({ path: a.path, namespace: 'global' }));
          b.onLoad({ filter: /.*/, namespace: 'global' }, a => ({
            contents: a.path.startsWith('react-dom') ? 'module.exports = window.ReactDOM;' : 'module.exports = window.React;', loader: 'js'
          }));
        }
      }],
    });
    return { errores: [], js: r.outputFiles[0].text };
  } catch (e) {
    const todos = errores(e, carpeta);
    const propiosErr = todos.filter(x => !x.archivo.startsWith('__'));
    return { errores: propiosErr.length ? propiosErr : todos.map(x => ({ ...x, archivo: '', mensaje: 'No se pudo armar la vista previa: ' + x.mensaje })) };
  }
}
