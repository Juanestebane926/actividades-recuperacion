/*
 * Evaluador de React en el navegador: transforma JSX con Babel y ejecuta los componentes
 * del estudiante en un iframe con React 18. Las pruebas revisan el DOM (comportamiento),
 * no comparan el texto del código con una respuesta.
 */
window.MotorReact = (function () {
  'use strict';
  const CDN = 'https://cdnjs.cloudflare.com/ajax/libs/';
  const REACT = CDN + 'react/18.3.1/umd/react.development.js';
  const REACTDOM = CDN + 'react-dom/18.3.1/umd/react-dom.development.js';
  const CSS = `body{font:15px/1.5 system-ui,sans-serif;margin:12px;color:#1d2333;background:#fff}
    .badge{display:inline-block;padding:1px 9px;border-radius:999px;font-size:12px;font-weight:700;margin-left:6px}
    .badge-ok{background:#d3f9d8;color:#2b8a3e}.badge-mal{background:#ffe3e3;color:#c92a2a}
    ul{padding-left:20px} li{margin:4px 0} button{font:inherit;padding:5px 12px;border-radius:6px;border:1px solid #bbb;background:#f3f4f8;cursor:pointer}
    input{font:inherit;padding:5px 8px;margin:0 6px 6px 0;border:1px solid #bbb;border-radius:6px} .error{color:#c92a2a}
    .vacio{color:#777} .contenedor{max-width:640px} #consola{font:12px monospace;background:#263238;color:#e0e6ea;padding:6px 8px;border-radius:6px;white-space:pre-wrap;margin-top:10px}
    #consola:empty{display:none} .falla{color:#c92a2a;font:13px monospace;white-space:pre-wrap;background:#fff0f0;padding:8px;border-radius:6px}`;
  const PRELUDIO = 'const { useState, useEffect, useRef, useMemo, Fragment } = React;\n';

  function limpiar(src) {
    // Quita import/export (en Vite cada archivo es un módulo; aquí se unen en un solo script).
    // Se reemplazan por líneas vacías para conservar los números de línea.
    return src
      .replace(/^[ \t]*import\s[^\n]*$/gm, '')
      .replace(/^([ \t]*)export\s+default\s+function\b/gm, '$1function')
      .replace(/^([ \t]*)export\s+default\s+[A-Za-z_$][\w$]*\s*;?[ \t]*$/gm, '')
      .replace(/^([ \t]*)export\s+(function|const|let|class)\b/gm, '$1$2');
  }

  function mensajeBabel(e) {
    const primera = String(e.message || e).split('\n')[0].replace(/^[^:]*\.jsx?:\s*/, '');
    const marco = String(e.message || '').split('\n').slice(1).join('\n').trim();
    return { mensaje: primera, contexto: marco };
  }

  function transformar(nombres, archivos) {
    const errores = [];
    let codigo = '';
    for (const n of nombres) {
      try {
        const r = Babel.transform(limpiar(archivos[n]), { presets: [['react', { runtime: 'classic' }]], filename: n, sourceType: 'script', retainLines: true });
        codigo += '\n// ---- ' + n + '\n' + r.code + '\n';
      } catch (e) {
        const m = mensajeBabel(e);
        errores.push({ archivo: n, linea: e.loc ? e.loc.line : 0, mensaje: m.mensaje, contexto: m.contexto });
      }
    }
    return { codigo, errores };
  }

  function exportar(A) {
    return '\nreturn {' + A.componentes.map(c => `${c}: typeof ${c} !== 'undefined' ? ${c} : undefined`).join(', ') + '};';
  }

  // ------------------------------------------------------------------ vista previa (Ejecutar)
  function vistaPrevia(A, codigo, demo) {
    const d = transformar(['demo'], { demo: 'const __demo = (' + demo + ');' });
    const f = document.createElement('iframe');
    f.className = 'preview';
    f.setAttribute('sandbox', 'allow-scripts allow-modals');
    f.title = 'Vista previa';
    const script = `
      const consola = document.getElementById('consola');
      const escribir = (...a) => { consola.textContent += a.map(x => typeof x === 'string' ? x : JSON.stringify(x)).join(' ') + '\\n'; };
      console.log = escribir;
      window.onerror = (m) => { document.getElementById('root').innerHTML = '<div class="falla">Error: ' + String(m).replace(/</g, '&lt;') + '</div>'; };
      class Limite extends React.Component {
        constructor(p) { super(p); this.state = { error: null }; }
        static getDerivedStateFromError(error) { return { error }; }
        render() { return this.state.error ? React.createElement('div', { className: 'falla' }, 'Tu componente lanzó un error: ' + this.state.error.message) : this.props.children; }
      }
      try {
        ${PRELUDIO}${codigo}
        ${d.codigo}
        ReactDOM.createRoot(document.getElementById('root')).render(React.createElement(Limite, null, __demo));
      } catch (e) { document.getElementById('root').innerHTML = '<div class="falla">Error: ' + String(e.message).replace(/</g, '&lt;') + '</div>'; }`;
    f.srcdoc = `<!doctype html><html><head><meta charset="utf-8"><style>${CSS}</style><script src="${REACT}"><\/script><script src="${REACTDOM}"><\/script></head>
      <body><div id="root"></div><pre id="consola"></pre><script>${script.replace(/<\/script/gi, '<\\/script')}<\/script></body></html>`;
    return f;
  }

  // ------------------------------------------------------------------ pruebas (Comprobar / Calificar)
  function marcoOculto() {
    return new Promise((res, rej) => {
      const f = document.createElement('iframe');
      f.style.cssText = 'position:absolute;left:-10000px;top:0;width:900px;height:700px;border:0';
      f.setAttribute('aria-hidden', 'true');
      const t = setTimeout(() => rej(new Error('No cargó React. Revisa tu conexión a internet.')), 30000);
      f.onload = () => {
        clearTimeout(t);
        if (!f.contentWindow.React || !f.contentWindow.ReactDOM) return rej(new Error('No cargó React. Revisa tu conexión a internet.'));
        res(f);
      };
      f.srcdoc = `<!doctype html><html><head><meta charset="utf-8"><script src="${REACT}"><\/script><script src="${REACTDOM}"><\/script></head><body></body></html>`;
      document.body.appendChild(f);
    });
  }

  class Falla extends Error {}

  function ayudante(win, comps, archivos, errores) {
    const React = win.React, ReactDOM = win.ReactDOM, doc = win.document;
    let ultimo = null;
    const comprobarErrores = (que) => {
      if (errores.length) {
        const e = errores.splice(0)[0];
        throw new Falla(que + ' tu código lanzó un error: ' + (e && e.message || e));
      }
    };
    const t = {
      h: React.createElement,
      comp(nombre) {
        const c = comps[nombre];
        if (typeof c !== 'function') throw new Falla('No encontré el componente ' + nombre + '. Revisa que la función se llame exactamente ' + nombre + ' (con mayúscula inicial).');
        return c;
      },
      montar(el) {
        const div = doc.createElement('div');
        doc.body.appendChild(div);
        try { ReactDOM.render(el, div); } catch (e) { errores.splice(0); throw new Falla('Tu componente lanzó un error al dibujarse: ' + e.message); }
        comprobarErrores('Al dibujar,');
        ultimo = div;
        return div;
      },
      $(sel, raiz) { return (raiz || ultimo || doc).querySelector(sel); },
      $$(sel, raiz) { return Array.from((raiz || ultimo || doc).querySelectorAll(sel)); },
      texto(el) { return el ? el.textContent.replace(/\s+/g, ' ').trim() : ''; },
      click(el) {
        if (!el) throw new Falla('No encontré el botón para hacer clic.');
        el.click();
        comprobarErrores('Al hacer clic,');
      },
      escribir(el, valor) {
        if (!el) throw new Falla('No encontré el campo de texto para escribir.');
        const proto = el.tagName === 'TEXTAREA' ? win.HTMLTextAreaElement.prototype : win.HTMLInputElement.prototype;
        Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, valor);
        el.dispatchEvent(new win.Event('input', { bubbles: true }));
        comprobarErrores('Al escribir,');
      },
      enviar(form) {
        if (!form) throw new Falla('No encontré el <form>.');
        const ev = new win.Event('submit', { bubbles: true, cancelable: true });
        form.dispatchEvent(ev);
        comprobarErrores('Al enviar el formulario,');
        return ev.defaultPrevented;
      },
      esperar(ms) { return new Promise(r => setTimeout(r, ms || 30)); },
      si(cond, msg) { if (!cond) throw new Falla(msg); },
      igual(esp, real, que) {
        const ok = typeof esp === 'number' && typeof real === 'number' ? Math.abs(esp - real) < 1e-9 : esp === real;
        if (!ok) throw new Falla(`${que}: se esperaba ${JSON.stringify(esp)} pero se obtuvo ${JSON.stringify(real)}.`);
      },
      avisos: [],
      fuente(n) { return (archivos[n] || '').replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '').replace(/\{\/\*[\s\S]*?\*\/\}/g, ''); },
      win, doc
    };
    return t;
  }

  async function correrPruebas(A, paso, archivos) {
    const tr = transformar(paso.compilar, archivos);
    if (tr.errores.length) return { errores: tr.errores, resultados: [] };
    const f = await marcoOculto();
    const win = f.contentWindow;
    const errores = [];
    const avisos = [];
    win.addEventListener('error', ev => { errores.push(ev.error || ev.message); ev.preventDefault(); });
    const errorOriginal = win.console.error;
    win.console.error = (...a) => { avisos.push(a.map(String).join(' ')); };
    win.console.warn = () => {};
    let comps;
    try {
      comps = new win.Function('React', 'ReactDOM', PRELUDIO + tr.codigo + exportar(A))(win.React, win.ReactDOM);
    } catch (e) {
      f.remove();
      return { errores: [{ archivo: '', linea: 0, mensaje: 'Tu código lanzó un error al cargarse: ' + e.message }], resultados: [] };
    }
    const resultados = [];
    for (const [nombre, fn] of paso.pruebas) {
      const t = ayudante(win, comps, archivos, errores);
      avisos.length = 0;
      t.avisos = avisos;
      try {
        await Promise.race([fn(t), new Promise((_, rej) => setTimeout(() => rej(new Falla('La prueba no terminó a tiempo.')), 6000))]);
        resultados.push({ nombre, ok: true, mensaje: '' });
      } catch (e) {
        resultados.push({ nombre, ok: false, mensaje: e instanceof Falla ? e.message : 'Tu código lanzó un error: ' + (e && e.message || e) });
      }
      errores.length = 0;
    }
    win.console.error = errorOriginal;
    f.remove();
    return { errores: [], resultados };
  }

  return {
    preparar() { /* Babel y React se cargan desde el CDN al abrir la página */ },
    async evaluarPaso(A, paso, archivos, modo, aviso) {
      if (typeof Babel === 'undefined') throw new Error('No cargó Babel (el traductor de JSX). Revisa tu conexión a internet y recarga la página.');
      if (modo === 'ejecutar') {
        const tr = transformar(paso.compilar, archivos);
        if (tr.errores.length) return { errores: tr.errores };
        return { resultados: [], consola: [], preview: vistaPrevia(A, tr.codigo, paso.demo) };
      }
      aviso && aviso('Probando tu componente…');
      return correrPruebas(A, paso, archivos);
    },
    async evaluarTodo(A, pasos, archivos, aviso) {
      const salida = {};
      for (let i = 0; i < pasos.length; i++) {
        aviso && aviso('Calificando paso ' + (i + 1) + ' de ' + pasos.length + '…');
        const r = await correrPruebas(A, pasos[i], archivos);
        salida[pasos[i].id] = r.errores.length
          ? { resultados: [], error: 'Tiene errores: ' + (r.errores[0].archivo || '') + ' ' + r.errores[0].mensaje }
          : { resultados: r.resultados };
      }
      return salida;
    }
  };
})();
