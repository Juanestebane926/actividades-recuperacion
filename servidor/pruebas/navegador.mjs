// Herramienta para probar la página de las actividades en un Chrome sin ventana (protocolo CDP), sin dependencias.
//
// La regla de oro: al navegador se le pasan FUNCIONES, no cadenas de código. `nav.ev(fn, ...args)` envía el código
// de la función tal cual y los argumentos como JSON, así que no hay que escapar comillas, \n ni ${...}.
// Ver .claude/skills/probar-en-navegador/SKILL.md y el ejemplo en pruebas/ejemplo-navegador.mjs.
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SERVIDOR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const dormir = ms => new Promise(r => setTimeout(r, ms));

export function buscarChrome() {
  return [
    process.env.CHROME,
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
    '/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  ].filter(Boolean).find(c => fs.existsSync(c));
}

// ------------------------------------------------------------------ servidor del curso
/**
 * Levanta el servidor del curso en otro puerto y con una base de datos propia (temporal), para no tocar la de nadie.
 * Devuelve { url, clave, datos, log(), cerrar() }. Siempre llama a cerrar() en un finally.
 */
export async function servidorLocal({ puerto = 8092, clave = 'prueba', datos } = {}) {
  datos = datos || fs.mkdtempSync(path.join(os.tmpdir(), 'rec-datos-'));
  const hijo = spawn(process.execPath, ['src/servidor.js'], {
    cwd: SERVIDOR, env: { ...process.env, PORT: String(puerto), DOCENTE_CLAVE: clave, DATOS: datos }, stdio: ['ignore', 'pipe', 'pipe'],
  });
  let log = '';
  hijo.stdout.on('data', d => { log += d; });
  hijo.stderr.on('data', d => { log += d; });
  const url = `http://localhost:${puerto}`;
  for (let i = 0; ; i++) {
    if (hijo.exitCode !== null) throw new Error(`El servidor no arrancó (¿puerto ${puerto} ocupado?):\n${log}`);
    try { if ((await fetch(url + '/api/estado')).ok) break; } catch (e) { /* todavía no escucha */ }
    if (i > 150) { hijo.kill(); throw new Error('El servidor no respondió en 30 s:\n' + log); }
    await dormir(200);
  }
  return { url, clave, datos, log: () => log, cerrar: () => hijo.kill() };
}

// ------------------------------------------------------------------ navegador
const TECLAS = { Enter: 13, Backspace: 8, Tab: 9, Escape: 27, Delete: 46, Space: 32, ArrowLeft: 37, ArrowUp: 38, ArrowRight: 39, ArrowDown: 40, Home: 36, End: 35, Slash: 191 };

/**
 * Abre un Chrome sin ventana y devuelve `nav` con: ir, ev, esperar, escribir, tecla, foto, tamano, cdp, erroresPagina, cerrar.
 * Siempre llama a nav.cerrar() en un finally (si no, queda un Chrome vivo).
 */
export async function abrirNavegador({ ancho = 1366, alto = 768, oscuro = false } = {}) {
  const chrome = buscarChrome();
  if (!chrome) throw new Error('No encontré Chrome. Define la variable CHROME con su ruta.');
  const puerto = 9300 + Math.floor(Math.random() * 600);
  const perfil = fs.mkdtempSync(path.join(os.tmpdir(), 'rec-chrome-'));
  const proc = spawn(chrome, ['--headless=new', `--remote-debugging-port=${puerto}`, `--user-data-dir=${perfil}`,
    '--no-first-run', '--no-default-browser-check', '--hide-scrollbars', 'about:blank'], { stdio: 'ignore' });
  let wsUrl = null;
  for (let i = 0; i < 100 && !wsUrl; i++) {
    try { wsUrl = (await (await fetch(`http://127.0.0.1:${puerto}/json/list`)).json()).find(x => x.type === 'page')?.webSocketDebuggerUrl; } catch (e) { /* arrancando */ }
    if (!wsUrl) await dormir(150);
  }
  if (!wsUrl) { proc.kill(); throw new Error('Chrome no abrió el puerto de depuración'); }

  const ws = new WebSocket(wsUrl);
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
  let id = 0;
  const pendientes = new Map(), oyentes = new Map();
  ws.onmessage = ev => {
    const m = JSON.parse(ev.data);
    if (m.id && pendientes.has(m.id)) { const p = pendientes.get(m.id); pendientes.delete(m.id); m.error ? p.rej(new Error(p.metodo + ': ' + m.error.message)) : p.res(m.result); }
    else if (m.method) (oyentes.get(m.method) || []).forEach(f => f(m.params));
  };
  const cdp = (metodo, params = {}) => new Promise((res, rej) => { const i = ++id; pendientes.set(i, { res, rej, metodo }); ws.send(JSON.stringify({ id: i, method: metodo, params })); });
  const al = (evento, f) => oyentes.set(evento, [...(oyentes.get(evento) || []), f]);

  await cdp('Page.enable');
  await cdp('Runtime.enable');
  // Diálogos (el "¿salir sin guardar?" de beforeunload, alert, confirm): se aceptan solos para que nada se cuelgue
  al('Page.javascriptDialogOpening', () => { cdp('Page.handleJavaScriptDialog', { accept: true }).catch(() => {}); });
  const erroresPagina = [];
  al('Runtime.exceptionThrown', p => erroresPagina.push(p.exceptionDetails?.exception?.description || p.exceptionDetails?.text));
  al('Runtime.consoleAPICalled', p => { if (p.type === 'error') erroresPagina.push(p.args.map(a => a.value ?? a.description).join(' ')); });

  const nav = {
    cdp, erroresPagina,

    async tamano(w, h, osc = false) {
      await cdp('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: 1, mobile: w < 600 });
      await cdp('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: osc ? 'dark' : 'light' }] });
    },

    /** Navega y espera a que la página termine de cargar. */
    async ir(url) {
      const cargada = new Promise(res => al('Page.loadEventFired', res));
      await cdp('Page.navigate', { url });
      await Promise.race([cargada, dormir(15000)]);
      await dormir(300);
    },

    /**
     * Ejecuta una función DENTRO de la página y devuelve su resultado (puede ser async).
     * Los argumentos viajan como JSON: nada de escapar. Lo que devuelve se convierte a JSON (un objeto que no se
     * puede convertir, como el editor de CodeMirror, vuelve como texto en lugar de romper).
     *   await nav.ev((sel, txt) => document.querySelector(sel).textContent.includes(txt), '#salida', 'Muy bien')
     */
    async ev(fn, ...args) {
      if (typeof fn !== 'function') throw new Error('nav.ev recibe una función, no una cadena de código');
      const expr = `(async () => { const v = await (${fn.toString()})(...${JSON.stringify(args)});
        try { return JSON.parse(JSON.stringify(v === undefined ? null : v)); } catch (e) { return String(v); } })()`;
      const r = await cdp('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true });
      if (r.exceptionDetails) throw new Error('Error dentro de la página: ' + (r.exceptionDetails.exception?.description || r.exceptionDetails.text));
      return r.result.value;
    },

    /** Repite fn (en la página) hasta que devuelva algo verdadero. Lanza error si pasa el tiempo. */
    async esperar(fn, args = [], { hasta = 15000, cada = 150 } = {}) {
      const t0 = Date.now();
      for (;;) {
        const v = await nav.ev(fn, ...args).catch(() => null);
        if (v) return v;
        if (Date.now() - t0 > hasta) throw new Error('Se agotó la espera de: ' + fn.toString().slice(0, 120));
        await dormir(cada);
      }
    },

    /**
     * Escribe texto donde esté el foco, letra por letra como una persona: así CodeMirror abre el autocompletado
     * (solo lo abre cuando entra UNA letra, punto o @). de_golpe: true inserta todo junto (más rápido, sin sugerencias).
     * Ojo: si queda un menú de sugerencias abierto, Enter elige la sugerencia en vez de bajar de línea.
     */
    async escribir(texto, { de_golpe = false } = {}) {
      const trozos = de_golpe ? String(texto).split(/(\n)/) : [...String(texto)];
      for (const t of trozos) {
        if (t === '\n') await nav.tecla('Enter'); else if (t) await cdp('Input.insertText', { text: t });
        await dormir(de_golpe ? 40 : 25);
      }
      await dormir(150);
    },

    /** Pulsa una tecla: 'Enter', 'Backspace', 'Tab', 'Escape', 'ArrowDown'… y combinaciones 'Ctrl+Enter', 'Shift+Tab', 'Ctrl+Space', 'Ctrl+Slash'. */
    async tecla(combinacion, veces = 1) {
      const partes = combinacion.split('+');
      const nombre = partes.pop();
      const mods = (partes.includes('Alt') ? 1 : 0) | (partes.includes('Ctrl') ? 2 : 0) | (partes.includes('Meta') ? 4 : 0) | (partes.includes('Shift') ? 8 : 0);
      const codigo = TECLAS[nombre] ?? nombre.toUpperCase().charCodeAt(0);
      const key = nombre === 'Space' ? ' ' : nombre === 'Slash' ? '/' : nombre;
      for (let i = 0; i < veces; i++) {
        await cdp('Input.dispatchKeyEvent', { type: 'rawKeyDown', key, code: nombre.length === 1 ? 'Key' + nombre.toUpperCase() : nombre, windowsVirtualKeyCode: codigo, nativeVirtualKeyCode: codigo, modifiers: mods });
        await cdp('Input.dispatchKeyEvent', { type: 'keyUp', key, windowsVirtualKeyCode: codigo, nativeVirtualKeyCode: codigo, modifiers: mods });
        await dormir(40);
      }
      await dormir(100);
    },

    /** Captura de pantalla PNG. completa: toda la página (alto real), no solo lo visible. */
    async foto(ruta, { completa = false } = {}) {
      let restaurar = null;
      if (completa) {
        const [w, h] = await nav.ev(() => [innerWidth, document.documentElement.scrollHeight]);
        restaurar = await nav.ev(() => [innerWidth, innerHeight]);
        await cdp('Emulation.setDeviceMetricsOverride', { width: w, height: Math.min(h, 6000), deviceScaleFactor: 1, mobile: w < 600 });
        await dormir(250);
      }
      const r = await cdp('Page.captureScreenshot', { format: 'png' });
      fs.mkdirSync(path.dirname(path.resolve(ruta)), { recursive: true });
      fs.writeFileSync(ruta, Buffer.from(r.data, 'base64'));
      if (restaurar) await cdp('Emulation.setDeviceMetricsOverride', { width: restaurar[0], height: restaurar[1], deviceScaleFactor: 1, mobile: restaurar[0] < 600 });
      return path.resolve(ruta);
    },

    async cerrar() {
      try { ws.close(); } catch (e) { /* ya cerrado */ }
      proc.kill();
      await dormir(200);
      try { fs.rmSync(perfil, { recursive: true, force: true }); } catch (e) { /* Chrome aún suelta archivos */ }
    },
  };
  await nav.tamano(ancho, alto, oscuro);
  return nav;
}

// ------------------------------------------------------------------ atajos para esta aplicación
/**
 * Crea un estudiante NUEVO por la API, deja su sesión guardada en la página y abre el paso indicado (0 = paso 1).
 * guia: true para ver la guía de la primera vez (por defecto se marca como vista para que no tape la pantalla).
 */
export async function entrarComoEstudiante(nav, base, curso, { paso = 0, guia = false, correo } = {}) {
  correo = correo || `prueba${Date.now()}${Math.floor(Math.random() * 1000)}@ejemplo.com`;
  await nav.ir(`${base}/${curso}/`);
  await nav.ev(async (curso, correo, guia) => {
    const r = await fetch((window.API_URL || '') + '/api/sesion', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ actividad: curso, nombre: 'Prueba', apellido: 'Automática', correo }),
    });
    const d = await r.json();
    if (!d.token) throw new Error(d.error || 'El servidor no devolvió token');
    localStorage.setItem('rec2:token:' + curso, d.token);
    if (guia) localStorage.removeItem('rec2:guia:' + curso); else localStorage.setItem('rec2:guia:' + curso, '1');
    return true;
  }, curso, correo, guia);
  await nav.ir(`${base}/${curso}/`);
  await nav.esperar(() => !!document.querySelector('#menu-pasos'));
  if (paso) {
    await nav.ev(i => { document.querySelector(`#menu-pasos button[data-i="${i}"]`).click(); return true; }, paso);
    await dormir(400);
  }
  if (!guia) await nav.esperar(() => !!document.querySelector('.CodeMirror') || !!document.querySelector('.entrega'));
  return { correo };
}

/** Acciones frecuentes sobre la página del estudiante. Todas reciben `nav` primero. */
export const pagina = {
  /** Abre la pestaña de un archivo ('VacanteController.java') o 'peticiones.http'. */
  pestana: (nav, nombre) => nav.ev(n => {
    const b = [...document.querySelectorAll('#pestanas button')].find(x => x.dataset.n === n);
    if (!b) throw new Error('No hay pestaña ' + n + '. Hay: ' + [...document.querySelectorAll('#pestanas button')].map(x => x.dataset.n).join(', '));
    b.click();
    return true;
  }, nombre),

  /** Texto del archivo abierto en el editor. */
  codigo: nav => nav.ev(() => document.querySelector('.CodeMirror').CodeMirror.getValue()),

  /**
   * Reemplaza todo el archivo abierto como si el estudiante pegara (Ctrl+A, Ctrl+V): así se guarda.
   * OJO: cm.setValue() NO sirve para simular al estudiante, porque la página ignora los cambios con origen setValue.
   */
  ponerCodigo: (nav, texto) => nav.ev(t => {
    const cm = document.querySelector('.CodeMirror').CodeMirror;
    cm.focus(); cm.execCommand('selectAll'); cm.replaceSelection(t, null, 'paste');
    return cm.getValue().length;
  }, texto),

  /** Pone el cursor justo después de `ancla` (texto que exista en el archivo). lineaNueva: abre una línea debajo, con sangría. */
  cursorDespuesDe: (nav, ancla, { lineaNueva = false } = {}) => nav.ev((a, nueva) => {
    const cm = document.querySelector('.CodeMirror').CodeMirror;
    const i = cm.getValue().indexOf(a);
    if (i < 0) throw new Error('No encontré en el editor: ' + a);
    cm.focus();
    cm.setCursor(cm.posFromIndex(i + a.length));
    if (nueva) cm.execCommand('newlineAndIndent');
    return cm.getCursor();
  }, ancla, lineaNueva),

  /** Sugerencias del autocompletado que se ven ahora (null si no hay menú abierto). */
  sugerencias: nav => nav.ev(() => {
    const h = document.querySelector('.CodeMirror-hints');
    return h ? [...h.querySelectorAll('li')].map(li => (li.querySelector('.sug-texto') || li).textContent) : null;
  }),

  /** Pulsa Ejecutar o Comprobar y espera a que termine. Devuelve el texto del resultado. */
  async evaluar(nav, modo = 'comprobar', { hasta = 90000 } = {}) {
    await nav.ev(m => { document.querySelector('#' + m).click(); return true; }, modo);
    await nav.esperar(() => document.querySelector('#comprobar')?.disabled, [], { hasta: 3000 }).catch(() => null);
    await nav.esperar(() => !document.querySelector('#comprobar')?.disabled, [], { hasta });
    return nav.ev(() => document.querySelector('#salida')?.innerText || '');
  },

  /** Texto del panel de resultados. */
  resultado: nav => nav.ev(() => document.querySelector('#salida')?.innerText || ''),

  /** Hace clic en lo que indique el selector CSS. */
  clic: (nav, selector) => nav.ev(s => {
    const el = document.querySelector(s);
    if (!el) throw new Error('No existe ' + s);
    el.click();
    return true;
  }, selector),
};

/** Lee la solución de referencia de un archivo (repositorio privado al lado de este). curso: spring | web | react. */
export function solucion(curso, archivo) {
  const p = path.resolve(SERVIDOR, '..', '..', 'actividades-recuperacion-docente', 'soluciones', curso, archivo);
  return fs.readFileSync(p, 'utf8');
}
