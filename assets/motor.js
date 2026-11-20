/*
 * Motor de actividades paso a paso (estilo DataCamp).
 * Lee window.ACTIVIDAD y usa un evaluador: window.MotorJava o window.MotorReact.
 */
(function () {
  'use strict';
  const A = window.ACTIVIDAD;
  const EV = A.motor === 'java' ? window.MotorJava : window.MotorReact;
  const CLAVE = 'rec:' + A.id;
  const $ = (s, r) => (r || document).querySelector(s);
  const esc = t => String(t == null ? '' : t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  let app = null;

  let estado = null;            // lo que se guarda en el navegador del estudiante
  let originales = {};          // código inicial de cada archivo
  let revision = null;          // comprobante cargado por el docente (modo revisión)
  let editor = null, archivoActual = null, ocupado = false;

  // ------------------------------------------------------------------ almacenamiento
  function guardar() {
    if (revision) return;
    try { localStorage.setItem(CLAVE, JSON.stringify(estado)); } catch (e) { /* sin almacenamiento */ }
  }
  function cargarGuardado() {
    try { return JSON.parse(localStorage.getItem(CLAVE) || 'null'); } catch (e) { return null; }
  }
  function nuevoEstado(nombre, doc) {
    return { v: 1, nombre, doc, archivos: Object.assign({}, originales), paso: 0, res: {}, pistas: {}, inicio: Date.now(), nota: null };
  }

  // ------------------------------------------------------------------ arranque
  async function iniciar() {
    app = document.getElementById('app');
    A.pasos.forEach(p => { if (!p.nPruebas && p.pruebas) p.nPruebas = p.pruebas.length; });
    app.innerHTML = '<div class="portada"><div class="tarjeta"><div class="estado-carga"><span class="girando"></span> Cargando actividad…</div></div></div>';
    const nombres = Object.keys(A.archivos);
    await Promise.all(nombres.map(async n => {
      const r = await fetch(A.archivos[n].ruta, { cache: 'no-cache' });
      originales[n] = (await r.text()).replace(/\r\n/g, '\n');
    }));
    const params = new URLSearchParams(location.search);
    if (params.has('revisar')) {
      try {
        revision = JSON.parse(localStorage.getItem('rec:revision') || 'null');
      } catch (e) { revision = null; }
      if (revision && revision.act === A.id) {
        estado = nuevoEstado(revision.nombre, revision.doc);
        Object.assign(estado.archivos, revision.archivos || {});
        estado.paso = A.pasos.length;
        mostrarTrabajo();
        return;
      }
      revision = null;
    }
    portada();
  }

  function portada() {
    const g = cargarGuardado();
    const temas = A.temas.map(t => '<span class="chip">' + esc(t) + '</span>').join('');
    app.innerHTML = `
      <div class="portada">
        <div class="tarjeta">
          <div class="num" style="color:var(--primario);font-weight:700">Actividad de recuperación · ${esc(A.curso)}</div>
          <h1>${esc(A.titulo)}</h1>
          <p class="sub">${A.descripcion}</p>
          <div class="chips">${temas}</div>
          <div class="chips"><span class="chip">⏱ ${esc(A.duracion)}</span><span class="chip">🧩 ${A.pasos.length} pasos + entrega</span><span class="chip">💻 Nada que instalar</span></div>
        </div>
        <div class="tarjeta">
          <h3 style="margin-top:0">¿Cómo funciona?</h3>
          <ol>
            <li>Cada paso trae una <b>explicación</b> y un <b>código para completar</b>. Los espacios <code>____</code> son los que debes llenar.</li>
            <li><b>▶ Ejecutar</b> corre tu código y te muestra el resultado. <b>✔ Comprobar</b> revisa si quedó bien y te dice qué corregir.</li>
            <li>Si te atascas, abre las <b>pistas</b>. Puedes volver a intentar cuantas veces quieras.</li>
            <li>Al final, en <b>Entrega</b>, se califica todo tu código y obtienes tu <b>nota</b> con un <b>código de verificación</b> para tu profesor.</li>
          </ol>
          ${A.aviso ? '<div class="nota-info">' + A.aviso + '</div>' : ''}
          <p style="color:var(--suave);font-size:14px">Tu avance se guarda automáticamente en este navegador. Si cierras la pestaña, al volver continúas donde ibas (usa el mismo navegador y equipo).</p>
        </div>
        <div class="tarjeta">
          ${g ? `<div class="aviso info">Tienes una actividad en curso como <b>${esc(g.nombre)}</b>.</div>
                 <div class="acciones" style="margin-bottom:16px"><button class="btn primario grande" id="continuar">Continuar como ${esc(g.nombre)} →</button></div>
                 <h3>¿Eres otra persona o quieres empezar de cero?</h3>` : '<h3 style="margin-top:0">Tus datos</h3>'}
          <div class="fila">
            <div class="campo"><label for="nombre">Nombre completo</label><input id="nombre" autocomplete="name" placeholder="Ej: Ana María Pérez"></div>
            <div class="campo"><label for="doc">Documento o código de estudiante</label><input id="doc" placeholder="Ej: 1012345678"></div>
          </div>
          <div class="acciones"><button class="btn ${g ? '' : 'primario'} grande" id="empezar">${g ? 'Empezar de nuevo' : 'Empezar la actividad →'}</button></div>
          <p id="error-datos" class="aviso mal oculto"></p>
        </div>
        <p style="text-align:center;color:var(--suave);font-size:13px"><a href="../">← Todas las actividades</a></p>
      </div>`;
    if (g) $('#continuar').onclick = () => { estado = g; for (const n in originales) if (!(n in estado.archivos)) estado.archivos[n] = originales[n]; mostrarTrabajo(); };
    $('#empezar').onclick = () => {
      const nombre = $('#nombre').value.trim(), doc = $('#doc').value.trim();
      const e = $('#error-datos');
      if (nombre.length < 5 || !/\s/.test(nombre)) { e.textContent = 'Escribe tu nombre completo (nombre y apellido).'; e.classList.remove('oculto'); return; }
      if (doc.length < 3) { e.textContent = 'Escribe tu documento o código de estudiante.'; e.classList.remove('oculto'); return; }
      if (g && !confirm('Se borrará el avance guardado de ' + g.nombre + '. ¿Continuar?')) return;
      estado = nuevoEstado(nombre, doc);
      guardar();
      mostrarTrabajo();
    };
  }

  // ------------------------------------------------------------------ estructura
  function mostrarTrabajo() {
    app.innerHTML = `
      ${revision ? '<div class="revision">Modo revisión docente · comprobante de ' + esc(revision.nombre) + ' (' + esc(revision.doc) + ') · nota declarada ' + Number(revision.nota).toFixed(1) + '</div>' : ''}
      <header class="barra">
        <div class="marca">${esc(A.curso)}<small>Actividad de recuperación</small></div>
        <nav class="progreso" id="progreso" aria-label="Pasos"></nav>
        <div class="estudiante">${esc(estado.nombre)}<br>${esc(estado.doc)}</div>
      </header>
      <main id="vista"></main>
      <footer class="navegacion">
        <button class="btn" id="anterior">← Anterior</button>
        <button class="btn primario" id="siguiente">Siguiente →</button>
      </footer>`;
    $('#anterior').onclick = () => irA(estado.paso - 1);
    $('#siguiente').onclick = () => irA(estado.paso + 1);
    if (EV.preparar) EV.preparar(A, () => {});
    irA(estado.paso);
  }

  function pintarProgreso() {
    const p = $('#progreso');
    let h = '';
    A.pasos.forEach((paso, i) => {
      const r = estado.res[paso.id];
      const cls = [i === estado.paso ? 'actual' : '', r ? (r.ok === r.total ? 'hecho' : 'fallo') : ''].join(' ');
      h += `<button class="${cls}" data-i="${i}" title="Paso ${i + 1}: ${esc(paso.titulo)}">${r && r.ok === r.total ? '✓' : i + 1}</button>`;
    });
    h += `<button class="${estado.paso === A.pasos.length ? 'actual' : ''} ${estado.nota != null ? 'hecho' : ''}" data-i="${A.pasos.length}" title="Entrega y nota" style="width:auto;border-radius:16px;padding:0 10px">🏁 Nota</button>`;
    p.innerHTML = h;
    p.querySelectorAll('button').forEach(b => b.onclick = () => irA(+b.dataset.i));
    $('#anterior').disabled = estado.paso === 0;
    $('#siguiente').classList.toggle('oculto', estado.paso >= A.pasos.length);
  }

  function irA(i) {
    if (ocupado) return;
    i = Math.max(0, Math.min(A.pasos.length, i));
    estado.paso = i;
    guardar();
    if (i === A.pasos.length) vistaEntrega(); else vistaPaso(A.pasos[i], i);
    pintarProgreso();
    window.scrollTo(0, 0);
  }

  // ------------------------------------------------------------------ vista de paso
  function vistaPaso(paso, i) {
    const pistasVistas = estado.pistas[paso.id] || 0;
    const pistas = (paso.pistas || []).map((p, k) => `<details ${k < pistasVistas ? 'open' : ''} data-k="${k}"><summary>Pista ${k + 1}</summary><div>${p}</div></details>`).join('');
    $('#vista').innerHTML = `
      <div class="trabajo">
        <section class="explicacion">
          <div class="num">Paso ${i + 1} de ${A.pasos.length}</div>
          <h2>${esc(paso.titulo)}</h2>
          ${paso.explicacion}
          <div class="tarea"><h3>🎯 Tu tarea</h3>${paso.tarea}</div>
          ${pistas ? '<h3>¿Te atascaste?</h3><div class="pistas">' + pistas + '</div>' : ''}
        </section>
        <section class="editor-col">
          <div class="editor-caja">
            <div class="pestanas" id="pestanas"></div>
            <div id="editor"></div>
          </div>
          <div class="acciones">
            <button class="btn" id="ejecutar" title="Corre tu código y muestra lo que produce">▶ Ejecutar</button>
            <button class="btn primario" id="comprobar" title="Revisa si tu código cumple la tarea">✔ Comprobar</button>
            <span class="espacio"></span>
            <button class="btn" id="reiniciar" title="Vuelve este archivo a su versión inicial">↺ Reiniciar archivo</button>
          </div>
          <div class="estado-carga oculto" id="cargando"><span class="girando"></span><span id="cargando-txt"></span></div>
          <div class="salida"><div class="cab"><span id="salida-titulo">Resultado</span></div><div class="cuerpo" id="salida"><p class="vacio">Pulsa <b>▶ Ejecutar</b> para ver qué hace tu código o <b>✔ Comprobar</b> para revisarlo.</p></div></div>
        </section>
      </div>`;
    $('#vista').querySelectorAll('.pistas details').forEach(d => d.addEventListener('toggle', () => {
      if (d.open) { estado.pistas[paso.id] = Math.max(estado.pistas[paso.id] || 0, +d.dataset.k + 1); guardar(); }
    }));
    crearEditor(paso);
    $('#ejecutar').onclick = () => evaluar(paso, 'ejecutar');
    $('#comprobar').onclick = () => evaluar(paso, 'comprobar');
    $('#reiniciar').onclick = () => {
      const f = A.archivos[archivoActual];
      if (f.soloLectura) return;
      if (!confirm('¿Volver ' + archivoActual + ' a su código inicial? Perderás lo que escribiste en este archivo.')) return;
      estado.archivos[archivoActual] = originales[archivoActual];
      guardar();
      editor.setValue(originales[archivoActual]);
    };
    const r = estado.res[paso.id];
    if (r && r.ultimo) pintarResultado(r.ultimo, 'comprobar');
  }

  function crearEditor(paso) {
    const tabs = $('#pestanas');
    const modo = A.motor === 'java' ? 'text/x-java' : 'text/jsx';
    editor = CodeMirror($('#editor'), {
      value: '', mode: modo, theme: 'material-darker', lineNumbers: true, indentUnit: 4, tabSize: 4,
      matchBrackets: true, autoCloseBrackets: true, lineWrapping: false,
      extraKeys: { 'Ctrl-Enter': () => evaluar(paso, 'comprobar'), 'Cmd-Enter': () => evaluar(paso, 'comprobar'), Tab: cm => cm.replaceSelection('    ') }
    });
    let marcas = [];
    const marcarBlancos = () => {
      marcas.forEach(m => m.clear()); marcas = [];
      editor.eachLine(l => {
        const n = editor.getLineNumber(l), re = /_{4,}/g; let m;
        while ((m = re.exec(l.text))) marcas.push(editor.markText({ line: n, ch: m.index }, { line: n, ch: m.index + m[0].length }, { className: 'cm-blanco' }));
      });
    };
    let t = null;
    editor.on('change', () => {
      if (A.archivos[archivoActual].soloLectura) return;
      estado.archivos[archivoActual] = editor.getValue();
      clearTimeout(t); t = setTimeout(() => { guardar(); marcarBlancos(); }, 300);
    });
    const abrir = n => {
      archivoActual = n;
      editor.setOption('readOnly', !!A.archivos[n].soloLectura);
      editor.setValue(estado.archivos[n]);
      editor.clearHistory();
      marcarBlancos();
      tabs.querySelectorAll('button').forEach(b => b.classList.toggle('activa', b.dataset.n === n));
      const primero = editor.getValue().indexOf('____');
      if (primero >= 0 && !A.archivos[n].soloLectura) { const pos = editor.posFromIndex(primero); editor.scrollIntoView({ line: pos.line, ch: 0 }, 120); }
    };
    tabs.innerHTML = paso.archivos.map(n => `<button data-n="${esc(n)}">${esc(n)}${A.archivos[n].soloLectura ? ' <span class="candado" title="Solo lectura">🔒</span>' : ''}</button>`).join('');
    tabs.querySelectorAll('button').forEach(b => b.onclick = () => abrir(b.dataset.n));
    abrir(paso.archivos.find(n => !A.archivos[n].soloLectura) || paso.archivos[0]);
    crearEditor.abrir = abrir;
    setTimeout(() => editor.refresh(), 50);
  }

  function setCargando(txt) {
    const c = $('#cargando');
    if (!c) return;
    c.classList.toggle('oculto', !txt);
    $('#cargando-txt').textContent = txt || '';
  }

  /** Busca espacios ____ sin completar en los archivos indicados. */
  function blancos(nombres) {
    const r = [];
    nombres.forEach(n => {
      if (A.archivos[n].soloLectura) return;
      estado.archivos[n].split('\n').forEach((l, k) => { if (/_{4,}/.test(l)) r.push({ archivo: n, linea: k + 1 }); });
    });
    return r;
  }

  async function evaluar(paso, modo) {
    if (ocupado) return;
    ocupado = true;
    ['#ejecutar', '#comprobar', '#reiniciar'].forEach(s => { const b = $(s); if (b) b.disabled = true; });
    try {
      const b = blancos(paso.compilar);
      if (b.length) {
        pintarResultado({ blancos: b }, modo);
        if (modo === 'comprobar') registrar(paso, { blancos: b, resultados: [] });
        return;
      }
      const res = await EV.evaluarPaso(A, paso, estado.archivos, modo, setCargando);
      if (modo === 'comprobar') registrar(paso, res);
      pintarResultado(res, modo);
    } catch (e) {
      console.error(e);
      pintarResultado({ errorInterno: String(e && e.message || e) }, modo);
    } finally {
      ocupado = false;
      setCargando('');
      ['#ejecutar', '#comprobar', '#reiniciar'].forEach(s => { const b = $(s); if (b) b.disabled = false; });
    }
  }

  function registrar(paso, res) {
    const total = (paso.nPruebas || (res.resultados || []).length) || 1;
    const ok = (res.resultados || []).filter(r => r.ok).length;
    estado.res[paso.id] = { ok, total, ultimo: res };
    guardar();
    pintarProgreso();
  }

  const TRAD = [
    [/cannot find symbol/, 'No encuentro ese nombre. Revisa mayúsculas/minúsculas, que la variable o método exista y que esté importado.'],
    [/';' expected/, 'Falta un punto y coma ; al final de la instrucción.'],
    [/not a statement/, 'Esa línea no es una instrucción válida de Java (¿quedó un ____ o algo incompleto?).'],
    [/incompatible types/, 'Tipos incompatibles: el valor no es del tipo que se espera en ese lugar.'],
    [/missing return statement/, 'Falta un return: el método debe devolver un valor en todos los caminos.'],
    [/reached end of file while parsing/, 'Falta cerrar una llave }.'],
    [/class, interface, or enum expected/, 'Sobra una llave } o hay código fuera de la clase.'],
    [/unclosed string literal/, 'Falta cerrar unas comillas "…".'],
    [/illegal start of (expression|type)/, 'Algo está mal escrito antes de este punto (revisa paréntesis, llaves y comillas).'],
    [/'\)' expected/, 'Falta cerrar un paréntesis ).'],
    [/'\(' expected/, 'Falta abrir un paréntesis (.'],
    [/<identifier> expected/, 'Se esperaba un nombre (identificador) en este punto.'],
    [/is not abstract and does not override/, 'Falta implementar un método obligatorio.'],
    [/variable .* might not have been initialized/, 'Usas una variable antes de darle un valor.'],
    [/variable .* is already defined/, 'Declaraste dos veces la misma variable.'],
    [/cannot be applied to given types/, 'Llamas un método o constructor con parámetros que no coinciden (cantidad o tipo).'],
    [/unreported exception/, 'Este código puede lanzar una excepción que debes manejar (try/catch) o declarar con throws.'],
    [/annotation type not applicable/, 'Esa anotación no se puede poner en ese lugar.'],
    [/cannot assign a value to final variable/, 'No puedes cambiar una variable final.'],
    [/Unexpected token/, 'Hay un símbolo inesperado: revisa llaves, paréntesis, comillas y etiquetas.'],
    [/Adjacent JSX elements/, 'Un componente debe devolver UN solo elemento raíz: envuelve todo en un <div> o en <>…</>.'],
    [/Expected corresponding JSX closing tag/, 'Una etiqueta JSX no está bien cerrada.'],
    [/is not defined/, 'Usas un nombre que no existe (revisa cómo lo escribiste).'],
  ];
  function traducir(m) { for (const [re, t] of TRAD) if (re.test(m)) return t; return ''; }

  function pintarResultado(res, modo) {
    const s = $('#salida');
    if (!s) return;
    $('#salida-titulo').textContent = modo === 'ejecutar' ? 'Resultado de la ejecución' : 'Comprobación';
    let h = '';
    if (res.errorInterno) {
      h = `<div class="aviso mal">No se pudo evaluar tu código por un problema del evaluador: ${esc(res.errorInterno)}<br>Revisa tu conexión a internet y vuelve a intentarlo. Si persiste, recarga la página (tu código está guardado).</div>`;
    } else if (res.blancos) {
      const lista = res.blancos.map(b => `<li><a href="#" data-a="${esc(b.archivo)}" data-l="${b.linea}">${esc(b.archivo)}, línea ${b.linea}</a></li>`).join('');
      h = `<div class="aviso info">✏️ Aún tienes espacios <code>____</code> por completar. Reemplaza cada <code>____</code> por el código correcto:</div><ul>${lista}</ul>`;
    } else if (res.errores && res.errores.length) {
      h = `<div class="aviso mal">❌ Tu código tiene errores de sintaxis/compilación, así que todavía no se puede ejecutar. Corrige el primero y vuelve a intentar.</div>`;
      h += res.errores.slice(0, 5).map(e => {
        const es = traducir(e.mensaje);
        return `<div class="error-comp"><div class="donde">${e.archivo ? `<a href="#" data-a="${esc(e.archivo)}" data-l="${e.linea || 1}">${esc(e.archivo)}${e.linea ? ', línea ' + e.linea : ''}</a>` : ''}</div>
          ${es ? '<div class="es">💡 ' + esc(es) + '</div>' : ''}<pre>${esc(e.mensaje)}${e.contexto ? '\n' + esc(e.contexto) : ''}</pre></div>`;
      }).join('');
    } else {
      const rs = res.resultados || [];
      if (modo === 'comprobar') {
        const ok = rs.filter(r => r.ok).length;
        h += ok === rs.length && rs.length
          ? `<div class="aviso ok">🎉 ¡Muy bien! Pasaste las ${rs.length} comprobaciones de este paso. Puedes seguir al siguiente.</div>`
          : `<div class="aviso mal">Vas ${ok} de ${rs.length}. Lee el mensaje de lo que falta, corrige y vuelve a comprobar.</div>`;
        h += rs.map(r => `<div class="prueba ${r.ok ? 'ok' : 'mal'}"><span class="icono">${r.ok ? '✔' : '✘'}</span><div><div class="nombre">${esc(r.nombre)}</div>${r.ok ? '' : '<div class="msg">' + esc(r.mensaje) + '</div>'}</div></div>`).join('');
      }
      if (res.consola && res.consola.length) {
        h += `<div style="margin-top:8px;font-weight:600;font-size:14px">${modo === 'ejecutar' ? (A.motor === 'java' ? 'Peticiones simuladas y lo que respondió tu código:' : 'Consola:') : 'Detalle de la ejecución:'}</div><div class="consola">${esc(res.consola.join('\n'))}</div>`;
      } else if (modo === 'ejecutar' && !res.preview) {
        h += '<p class="vacio">Tu código compiló, pero no produjo salida.</p>';
      }
      if (modo === 'ejecutar' && res.preview) h += '<div style="font-weight:600;font-size:14px;margin:4px 0">Vista previa:</div>';
    }
    s.innerHTML = h;
    if (modo === 'ejecutar' && res.preview) s.appendChild(res.preview);
    s.querySelectorAll('a[data-a]').forEach(a => a.onclick = ev => {
      ev.preventDefault();
      crearEditor.abrir(a.dataset.a);
      const l = Math.max(0, +a.dataset.l - 1);
      editor.focus(); editor.setCursor({ line: l, ch: 0 }); editor.scrollIntoView({ line: l, ch: 0 }, 100);
    });
    if (window.innerWidth < 900) s.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  // ------------------------------------------------------------------ entrega y nota
  function vistaEntrega() {
    const filas = A.pasos.map((p, i) => {
      const r = estado.res[p.id];
      const st = !r ? '<span style="color:var(--suave)">Sin comprobar</span>' : r.ok === r.total ? '<span style="color:var(--ok)">✔ Completo</span>' : `<span style="color:var(--aviso)">${r.ok}/${r.total}</span>`;
      return `<tr><td>${i + 1}. ${esc(p.titulo)}</td><td>${st}</td></tr>`;
    }).join('');
    $('#vista').innerHTML = `
      <div class="entrega">
        <div class="tarjeta">
          <h2 style="margin-top:0">🏁 Entrega y nota</h2>
          <p>Cuando pulses <b>Calificar mi actividad</b> se ejecutan <b>todas</b> las comprobaciones sobre el código que tienes ahora en todos los pasos. Cada paso vale lo mismo. La nota va de <b>0.0 a 5.0</b> y se aprueba con <b>3.0</b>.</p>
          <table class="tabla"><tr><th>Paso</th><th>Tu última comprobación</th></tr>${filas}</table>
          <p style="color:var(--suave);font-size:14px">Puedes calificar varias veces: vale la última nota que envíes a tu profesor.</p>
          <div class="acciones"><button class="btn primario grande" id="calificar">🧮 Calificar mi actividad</button></div>
          <div class="estado-carga oculto" id="cargando"><span class="girando"></span><span id="cargando-txt"></span></div>
        </div>
        <div id="resultado-final"></div>
      </div>`;
    $('#calificar').onclick = calificar;
    if (revision) calificar();
    else if (estado.nota && estado.nota.comprobante) pintarNota(estado.nota);
  }

  async function calificar() {
    if (ocupado) return;
    ocupado = true;
    const btn = $('#calificar');
    btn.disabled = true;
    try {
      const porPaso = {};
      const evaluables = [];
      A.pasos.forEach(p => {
        const b = blancos(p.compilar);
        if (b.length) porPaso[p.id] = { ok: 0, total: p.nPruebas, nota: 'Tiene espacios ____ sin completar' };
        else evaluables.push(p);
      });
      if (evaluables.length) {
        const r = await EV.evaluarTodo(A, evaluables, estado.archivos, setCargando);
        evaluables.forEach(p => {
          const rs = r[p.id] || { resultados: [] };
          porPaso[p.id] = { ok: (rs.resultados || []).filter(x => x.ok).length, total: p.nPruebas, nota: rs.error || '' };
        });
      }
      let suma = 0;
      const detalle = A.pasos.map(p => {
        const x = porPaso[p.id];
        suma += x.ok / x.total;
        return [p.id, x.ok, x.total];
      });
      const nota = Math.round((5 * suma / A.pasos.length) * 10) / 10;
      const d = new Date();
      const fecha = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0') + ' ' + String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
      const pistas = Object.values(estado.pistas).reduce((a, b) => a + b, 0);
      const minutos = Math.round((Date.now() - (estado.inicio || Date.now())) / 60000);
      if (revision) {
        pintarRevision(nota, detalle, porPaso);
      } else {
        const archivos = {};
        Object.keys(A.archivos).filter(n => !A.archivos[n].soloLectura).forEach(n => archivos[n] = estado.archivos[n]);
        const c = { v: 1, act: A.id, nombre: estado.nombre, doc: estado.doc, nota, fecha, detalle, minutos, pistas, archivos };
        const firmado = await Firma.crearComprobante(c);
        estado.nota = { nota, fecha, detalle, porPaso, codigo: firmado.codigo, comprobante: firmado.texto, minutos, pistas };
        guardar();
        pintarNota(estado.nota);
        pintarProgreso();
      }
    } catch (e) {
      console.error(e);
      $('#resultado-final').innerHTML = `<div class="aviso mal">No se pudo calificar: ${esc(e.message || e)}. Revisa tu conexión y vuelve a intentar.</div>`;
    } finally {
      ocupado = false;
      btn.disabled = false;
      setCargando('');
    }
  }

  function tablaDetalle(detalle, porPaso) {
    return '<table class="tabla"><tr><th>Paso</th><th>Comprobaciones</th><th>Aporte a la nota</th></tr>' + detalle.map(([id, ok, total], i) => {
      const p = A.pasos.find(x => x.id === id);
      const extra = porPaso && porPaso[id] && porPaso[id].nota ? '<br><small style="color:var(--aviso)">' + esc(porPaso[id].nota) + '</small>' : '';
      return `<tr><td>${i + 1}. ${esc(p ? p.titulo : id)}${extra}</td><td>${ok} / ${total}</td><td>${(5 / A.pasos.length * ok / total).toFixed(2)} / ${(5 / A.pasos.length).toFixed(2)}</td></tr>`;
    }).join('') + '</table>';
  }

  function pintarNota(n) {
    const aprueba = n.nota >= 3;
    $('#resultado-final').innerHTML = `
      <div class="tarjeta">
        <div class="nota-grande">
          <div><div style="color:var(--suave);font-size:14px">Tu nota</div><div class="valor ${aprueba ? 'aprueba' : 'pierde'}">${n.nota.toFixed(1)}</div></div>
          <div><div style="font-size:20px;font-weight:700">${aprueba ? '¡Aprobaste la recuperación! 🎉' : 'Aún no alcanzas 3.0'}</div>
          <div style="color:var(--suave)">${esc(estado.nombre)} · ${esc(estado.doc)} · ${esc(n.fecha)}</div>
          ${aprueba ? '' : '<div style="margin-top:4px">Puedes volver a los pasos incompletos, corregir y calificar de nuevo.</div>'}</div>
        </div>
        ${tablaDetalle(n.detalle, n.porPaso)}
      </div>
      <div class="tarjeta">
        <h3 style="margin-top:0">📨 Entrega a tu profesor</h3>
        <p>Código de verificación de esta nota:</p>
        <div class="codigo-ver" id="codigo">${esc(n.codigo)}</div>
        <p style="margin-top:14px">Envía a tu profesor <b>el comprobante completo</b> (incluye tu código para que lo pueda revisar). Cópialo o descárgalo:</p>
        <div class="campo"><textarea id="comprobante" readonly>${esc(n.comprobante)}</textarea></div>
        <div class="acciones">
          <button class="btn primario" id="copiar">📋 Copiar comprobante</button>
          <button class="btn" id="descargar">⬇ Descargar .txt</button>
        </div>
        <p style="color:var(--suave);font-size:13px;margin-bottom:0">El código de verificación depende de tu nombre, documento, nota y fecha. Si alguien cambia cualquiera de esos datos, el código deja de coincidir.</p>
      </div>`;
    const texto = () => `Actividad de recuperación: ${A.curso}\nEstudiante: ${estado.nombre}\nDocumento: ${estado.doc}\nNota: ${n.nota.toFixed(1)}\nFecha: ${n.fecha}\nCódigo de verificación: ${n.codigo}\n\nComprobante (no lo modifiques):\n${n.comprobante}\n`;
    $('#copiar').onclick = async () => {
      try { await navigator.clipboard.writeText(texto()); $('#copiar').textContent = '✔ Copiado'; }
      catch (e) { const t = $('#comprobante'); t.select(); document.execCommand('copy'); $('#copiar').textContent = '✔ Copiado'; }
    };
    $('#descargar').onclick = () => {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob([texto()], { type: 'text/plain' }));
      a.download = 'recuperacion-' + A.id + '-' + estado.doc.replace(/[^\w-]/g, '') + '.txt';
      a.click();
    };
  }

  function pintarRevision(nota, detalle, porPaso) {
    const igual = Math.abs(nota - revision.nota) < 0.05;
    $('#resultado-final').innerHTML = `
      <div class="tarjeta">
        <h3 style="margin-top:0">Re-calificación del docente</h3>
        <div class="nota-grande">
          <div><div style="color:var(--suave);font-size:14px">Nota recalculada ahora</div><div class="valor ${nota >= 3 ? 'aprueba' : 'pierde'}">${nota.toFixed(1)}</div></div>
          <div><div>Nota declarada en el comprobante: <b>${Number(revision.nota).toFixed(1)}</b></div>
          <div class="aviso ${igual ? 'ok' : 'mal'}">${igual ? '✔ Coinciden: el código entregado produce esa nota.' : '✘ No coinciden: el código del comprobante NO produce la nota declarada.'}</div></div>
        </div>
        ${tablaDetalle(detalle, porPaso)}
        <p style="color:var(--suave);font-size:14px">Puedes abrir cada paso (arriba) para leer el código del estudiante. En modo revisión nada se guarda.</p>
      </div>`;
  }

  window.addEventListener('DOMContentLoaded', iniciar);
})();
