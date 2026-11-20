// node pruebas/react-rapido.mjs <carpeta con .jsx> [pasos]
import fs from 'node:fs'; import path from 'node:path';
import { comprobarReact } from '../src/react.js';
import { nuevaCarpeta, borrar } from '../src/procesos.js';
const [dirSol, ids = 'r1,r2,r3,r4,r5,r6'] = process.argv.slice(2);
const archivos = {}; for (const f of fs.readdirSync(dirSol)) archivos[f] = fs.readFileSync(path.join(dirSol, f), 'utf8');
const compilar = { r1: ['Saludo.jsx'], r2: ['EstadoBadge.jsx'], r3: ['EstadoBadge.jsx', 'ListaEstudiantes.jsx'], r4: ['EstadoBadge.jsx', 'ListaEstudiantes.jsx', 'FiltroAprobados.jsx'], r5: ['FormularioEstudiante.jsx'], r6: Object.keys(archivos) };
const d = nuevaCarpeta(); const t0 = Date.now();
const r = await comprobarReact(d, archivos, ids.split(',').map(id => ({ id, compilar: compilar[id] })), 20000);
for (const [id, p] of Object.entries(r.pasos)) { console.log('== ' + id); for (const e of p.errores) console.log('COMPILA ' + JSON.stringify(e)); for (const x of p.pruebas) console.log((x.ok ? 'OK ' : 'XX ') + x.nombre + (x.ok ? '' : '\n   ' + x.mensaje.replace(/\n/g, '\n   '))); }
console.log('ms', Date.now() - t0); borrar(d);
