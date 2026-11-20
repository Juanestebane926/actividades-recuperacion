/*
 * Motor de actividades paso a paso (estilo DataCamp).
 * Lee window.ACTIVIDAD (explicaciones y pasos) y habla con el servidor del curso, que es quien
 * compila y ejecuta de verdad el código, corre las pruebas y guarda avance y notas.
 */
(function () {
  'use strict';
  const A = window.ACTIVIDAD;
  const CLAVE_TOKEN = 'rec2:token:' + A.id;
  const $ = (s, r) => (r || document).querySelector(s);
  const esc = t => String(t == null ? '' : t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const HTTP = 'peticiones.http';
  const API = (window.API_URL || '').replace(/\/$/, '');
  let app = null;

  let token = null, estudiante = null, estado = null, entregas = [];
  let originales = {};
  let editor = null, archivoActual = null, ocupado = false, pasoActual = null;
  let cambios = {}, timerGuardar = null, guardando = false;

  // ------------------------------------------------------------------ servidor
  async function api(metodo, url, cuerpo) {
    let r;
    try {
      r = await fetch(API + url, {
        method: metodo,
        headers: Object.assign({ 'Content-Type': 'application/json' }, token ? { Authorization: 'Bearer ' + token } : {}),
        body: cuerpo ? JSON.stringify(cuerpo) : undefined
      });
    } catch (e) {
      throw new Error('No hay conexión con el servidor del curso. Revisa tu internet y vuelve a intentar (tu código no se pierde).');
    }
    let datos = {};
    try { datos = await r.json(); } catch (e) { /* sin cuerpo */ }
    if (!r.ok) {
      const err = new Error(datos.error || ('Error ' + r.status));
      err.status = r.status;
      throw err;
    }
    return datos;
  }

  function marcarGuardado(texto, error) {
    const g = $('#guardado');
    if (!g) return;
    g.textContent = texto;
    g.classList.toggle('error', !!error);
  }

  /** Guarda en el servidor (con una pequeña espera para no enviar en cada tecla). */
  function guardar(inmediato) {
    clearTimeout(timerGuardar);
    timerGuardar = setTimeout(enviarCambios, inmediato ? 0 : 1200);
    marcarGuardado('Sin guardar…');
  }
  async function enviarCambios() {
    if (guardando) { guardar(); return; }
    guardando = true;
    const enviar = { paso: estado.paso, pistas: estado.pistas, peticiones: estado.peticiones };
    if (Object.keys(cambios).length) enviar.archivos = cambios;
    const enviados = cambios;
    cambios = {};
    try {
      await api('PUT', '/api/progreso', enviar);
      marcarGuardado('✓ Guardado');
    } catch (e) {
      cambios = Object.assign({}, enviados, cambios);
      marcarGuardado(e.status === 401 ? 'Sesión vencida' : '⚠ Sin conexión: reintentando…', true);
      if (e.status !== 401) setTimeout(() => guardar(true), 5000);
    } finally {
      guardando = false;
    }
  }
  window.addEventListener('beforeunload', ev => {
    if (Object.keys(cambios).length) { enviarCambios(); ev.preventDefault(); ev.returnValue = ''; }
  });

  // ------------------------------------------------------------------ arranque
  async function iniciar() {
    app = document.getElementById('app');
    app.innerHTML = '<div class="portada"><div class="tarjeta"><div class="estado-carga"><span class="girando"></span> Cargando actividad…</div></div></div>';
    await Promise.all(Object.keys(A.archivos).map(async n => {
      const r = await fetch(A.archivos[n].ruta, { cache: 'no-cache' });
      originales[n] = (await r.text()).replace(/\r\n/g, '\n');
    }));
    try { token = localStorage.getItem(CLAVE_TOKEN); } catch (e) { token = null; }
    if (token) {
      try {
        entrar(await api('GET', '/api/yo'));
        return;
      } catch (e) {
        if (e.status === 401) { try { localStorage.removeItem(CLAVE_TOKEN); } catch (x) { } token = null; }
        else { portada(e.message); return; }
      }
    }
    portada();
  }

  function entrar(d) {
    estudiante = { nombre: d.nombre, doc: d.doc };
    estado = d.estado;
    estado.peticiones = estado.peticiones || {};
    estado.pistas = estado.pistas || {};
    estado.res = estado.res || {};
    entregas = d.entregas || [];
    for (const n in originales) if (!(n in estado.archivos)) estado.archivos[n] = originales[n];
    mostrarTrabajo();
  }

  function portada(error) {
    const temas = A.temas.map(t => '<span class="chip">' + esc(t) + '</span>').join('');
    app.innerHTML = `
      <div class="portada">
        <div class="tarjeta">
          <div style="color:var(--primario);font-weight:700">Actividad de recuperación · ${esc(A.curso)}</div>
          <h1>${esc(A.titulo)}</h1>
          <p class="sub">${A.descripcion}</p>
          <div class="chips">${temas}</div>
          <div class="chips"><span class="chip">⏱ ${esc(A.duracion)}</span><span class="chip">🧩 ${A.pasos.length} pasos + nota</span><span class="chip">💻 Nada que instalar</span></div>
        </div>
        <div class="tarjeta">
          <h3 style="margin-top:0">¿Cómo funciona?</h3>
          <ol>
            <li>Cada paso trae una <b>explicación</b> y un <b>código para completar</b>. Los espacios <code>____</code> son los que debes llenar.</li>
            <li><b>▶ Ejecutar</b> corre tu código de verdad y te muestra lo que hace. <b>✔ Comprobar</b> corre las pruebas automáticas y te dice qué falla, con los mensajes reales del compilador y del framework.</li>
            <li>Si te atascas, abre las <b>pistas</b>. Puedes intentar cuantas veces quieras.</li>
            <li>Al final, en <b>🏁 Nota</b>, se califica todo tu código y la nota <b>queda registrada para tu profesor</b> automáticamente.</li>
          </ol>
          ${A.aviso ? '<div class="nota-info">' + A.aviso + '</div>' : ''}
        </div>
        <div class="tarjeta">
          <h3 style="margin-top:0">Entrar</h3>
          <p style="color:var(--suave);font-size:14px;margin-top:0">La primera vez escribe tus datos y <b>elige un PIN</b> de 4 a 8 números. Tu avance se guarda en el servidor: para continuar después (en este u otro computador) escribe el <b>mismo documento y PIN</b>.</p>
          <form id="form-entrar">
            <div class="fila">
              <div class="campo"><label for="doc">Documento o código de estudiante</label><input id="doc" autocomplete="username" placeholder="Ej: 1012345678" required></div>
              <div class="campo"><label for="pin">PIN (4 a 8 números)</label><input id="pin" type="password" inputmode="numeric" autocomplete="current-password" placeholder="Ej: 2580" required></div>
            </div>
            <div class="campo"><label for="nombre">Nombre completo</label><input id="nombre" autocomplete="name" placeholder="Ej: Ana María Pérez"><small>Solo se pide la primera vez.</small></div>
            <div class="acciones"><button class="btn primario grande" id="empezar" type="submit">Entrar a la actividad →</button></div>
          </form>
          <p id="error-datos" class="aviso mal ${error ? '' : 'oculto'}">${esc(error || '')}</p>
        </div>
        <p style="text-align:center;color:var(--suave);font-size:13px"><a href="../">← Todas las actividades</a></p>
      </div>`;
    $('#form-entrar').onsubmit = async ev => {
      ev.preventDefault();
      const e = $('#error-datos');
      const b = $('#empezar');
      b.disabled = true;
      try {
        const d = await api('POST', '/api/sesion', { actividad: A.id, nombre: $('#nombre').value, doc: $('#doc').value, pin: $('#pin').value });
        token = d.token;
        try { localStorage.setItem(CLAVE_TOKEN, token); } catch (x) { }
        entrar(d);
      } catch (x) {
        e.textContent = x.message;
        e.classList.remove('oculto');
      } finally {
        b.disabled = false;
      }
    };
  }

  function salir() {
    enviarCambios();
    try { localStorage.removeItem(CLAVE_TOKEN); } catch (x) { }
    token = null;
    portada();
  }

  // ------------------------------------------------------------------ estructura
  function mostrarTrabajo() {
    app.innerHTML = `
      <header class="barra">
        <div class="marca">${esc(A.curso)}<small>Recuperación</small></div>
        <nav class="navpasos" aria-label="Pasos">
          <button class="flecha" id="anterior" title="Paso anterior (Alt + ←)">‹ Anterior</button>
          <div class="progreso" id="progreso"></div>
          <button class="flecha primaria" id="siguiente" title="Paso siguiente (Alt + →)">Siguiente ›</button>
        </nav>
        <div class="estudiante">${esc(estudiante.nombre)} · ${esc(estudiante.doc)}<br><span class="guardado" id="guardado">✓ Guardado</span> · <button id="salir" title="Cerrar sesión en este computador">Salir</button></div>
      </header>
      <main id="vista"></main>`;
    $('#anterior').onclick = () => irA(estado.paso - 1);
    $('#siguiente').onclick = () => irA(estado.paso + 1);
    $('#salir').onclick = salir;
    irA(Math.min(estado.paso || 0, A.pasos.length));
  }
  document.addEventListener('keydown', ev => {
    if (!ev.altKey || !estado || !$('#vista')) return;
    if (ev.key === 'ArrowLeft') { ev.preventDefault(); irA(estado.paso - 1); }
    if (ev.key === 'ArrowRight') { ev.preventDefault(); irA(estado.paso + 1); }
  });

  function pintarProgreso() {
    const p = $('#progreso');
    let h = '';
    A.pasos.forEach((paso, i) => {
      const r = estado.res[paso.id];
      const completo = r && r.total && r.ok === r.total;
      const cls = [i === estado.paso ? 'actual' : '', r ? (completo ? 'hecho' : 'fallo') : ''].join(' ');
      h += `<button class="${cls}" data-i="${i}" title="Paso ${i + 1}: ${esc(paso.titulo)}${r ? ' (' + r.ok + '/' + r.total + ')' : ''}">${completo ? '✓' : i + 1}</button>`;
    });
    h += `<button class="nota ${estado.paso === A.pasos.length ? 'actual' : ''} ${entregas.length ? 'hecho' : ''}" data-i="${A.pasos.length}" title="Calificar y ver la nota">🏁 Nota</button>`;
    p.innerHTML = h;
    p.querySelectorAll('button').forEach(b => b.onclick = () => irA(+b.dataset.i));
    $('#anterior').disabled = estado.paso === 0;
    $('#siguiente').disabled = estado.paso >= A.pasos.length;
    const actual = p.querySelector('.actual');
    if (actual) actual.scrollIntoView({ block: 'nearest', inline: 'center' });
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
  function tienePeticiones(paso) { return !!(paso.ejecutar && paso.ejecutar.peticiones); }

  function vistaPaso(paso, i) {
    pasoActual = paso;
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
        <section class="editor-col" id="editor-col">
          <div class="editor-caja">
            <div class="pestanas" id="pestanas"></div>
            <div id="editor"></div>
            <div class="peticiones oculto" id="peticiones"></div>
          </div>
          <div class="acciones">
            <button class="btn" id="ejecutar" title="Corre tu código de verdad y muestra lo que hace">▶ Ejecutar</button>
            <button class="btn primario" id="comprobar" title="Corre las pruebas automáticas (Ctrl + Enter)">✔ Comprobar</button>
            <span class="estado-carga oculto" id="cargando"><span class="girando"></span><span id="cargando-txt"></span></span>
            <span class="espacio"></span>
            <button class="btn chico" id="reiniciar" title="Vuelve este archivo a su versión inicial">↺ Reiniciar archivo</button>
          </div>
          <div class="salida">
            <div class="cab"><span id="salida-titulo">Resultado</span><button class="btn chico" id="agrandar" title="Agrandar o achicar el panel de resultados">⤢ Agrandar</button></div>
            <div class="cuerpo" id="salida"><p class="vacio">Pulsa <b>▶ Ejecutar</b> para ver qué hace tu código o <b>✔ Comprobar</b> para revisarlo.</p></div>
          </div>
        </section>
      </div>`;
    $('#vista').querySelectorAll('.pistas details').forEach(d => d.addEventListener('toggle', () => {
      if (d.open) { estado.pistas[paso.id] = Math.max(estado.pistas[paso.id] || 0, +d.dataset.k + 1); guardar(); }
    }));
    crearEditor(paso);
    $('#ejecutar').onclick = () => evaluar(paso, 'ejecutar');
    $('#comprobar').onclick = () => evaluar(paso, 'comprobar');
    $('#agrandar').onclick = () => {
      const c = $('#editor-col');
      c.classList.toggle('salida-grande');
      $('#agrandar').textContent = c.classList.contains('salida-grande') ? '⤡ Achicar' : '⤢ Agrandar';
      setTimeout(() => editor.refresh(), 30);
    };
    $('#reiniciar').onclick = () => reiniciarArchivo(paso);
  }

  function reiniciarArchivo(paso) {
    const b = $('#reiniciar');
    if (archivoActual !== HTTP && A.archivos[archivoActual].soloLectura) return;
    if (b.dataset.confirmar !== '1') {
      b.dataset.confirmar = '1';
      b.textContent = '¿Seguro? Pulsa otra vez';
      setTimeout(() => { b.dataset.confirmar = ''; b.textContent = '↺ Reiniciar archivo'; }, 3500);
      return;
    }
    b.dataset.confirmar = '';
    b.textContent = '↺ Reiniciar archivo';
    if (archivoActual === HTTP) { delete estado.peticiones[paso.id]; pintarPeticiones(paso); guardar(); return; }
    estado.archivos[archivoActual] = originales[archivoActual];
    cambios[archivoActual] = originales[archivoActual];
    editor.setValue(originales[archivoActual]);
    guardar();
  }

  let marcaError = null;
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
    editor.on('change', (cm, ch) => {
      if (ch.origin === 'setValue') return;
      if (archivoActual === HTTP) { estado.peticiones[paso.id] = editor.getValue(); guardar(); return; }
      if (A.archivos[archivoActual].soloLectura) return;
      estado.archivos[archivoActual] = editor.getValue();
      cambios[archivoActual] = estado.archivos[archivoActual];
      guardar();
      clearTimeout(t); t = setTimeout(marcarBlancos, 300);
      if (marcaError) { editor.removeLineClass(marcaError, 'background', 'cm-linea-error'); marcaError = null; }
    });
    const abrir = n => {
      archivoActual = n;
      const esHttp = n === HTTP;
      $('#editor').classList.toggle('oculto', esHttp);
      $('#peticiones').classList.toggle('oculto', !esHttp);
      tabs.querySelectorAll('button').forEach(b => b.classList.toggle('activa', b.dataset.n === n));
      $('#reiniciar').textContent = esHttp ? '↺ Restaurar ejemplos' : '↺ Reiniciar archivo';
      if (esHttp) { pintarPeticiones(paso); return; }
      editor.setOption('readOnly', !!A.archivos[n].soloLectura);
      editor.setValue(estado.archivos[n]);
      editor.clearHistory();
      marcarBlancos();
      const primero = editor.getValue().indexOf('____');
      if (primero >= 0) { const pos = editor.posFromIndex(primero); editor.scrollIntoView({ line: pos.line, ch: 0 }, 120); }
      setTimeout(() => editor.refresh(), 0);
    };
    if (window.Sugerencias) Sugerencias.activar(editor, { A, archivos: () => estado.archivos, actual: () => archivoActual });
    const nombres = paso.archivos.slice();
    let h = nombres.map(n => `<button data-n="${esc(n)}">${esc(n)}${A.archivos[n].soloLectura ? ' <span class="candado" title="Solo lectura">🔒</span>' : ''}</button>`).join('');
    if (tienePeticiones(paso)) h += `<button data-n="${HTTP}" class="http" title="Prueba tu API como en Thunder Client">🌐 Probar la API</button>`;
    tabs.innerHTML = h;
    tabs.querySelectorAll('button').forEach(b => b.onclick = () => abrir(b.dataset.n));
    abrir(nombres.find(n => !A.archivos[n].soloLectura) || nombres[0]);
    crearEditor.abrir = abrir;
    setTimeout(() => editor.refresh(), 50);
  }

  // ------------------------------------------------------------------ probar la API (como Thunder Client)
  const METODOS = ['GET', 'POST', 'PUT', 'DELETE'];
  function leerPeticiones(texto) {
    return String(texto || '').split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('#')).map(l => {
      const m = l.match(/^(GET|POST|PUT|PATCH|DELETE)\s+(\S+)(?:\s+([\s\S]+))?$/i);
      return m ? { metodo: m[1].toUpperCase(), ruta: m[2], cuerpo: m[3] || '' } : { metodo: 'GET', ruta: l, cuerpo: '' };
    });
  }
  function textoPeticiones(filas) {
    return filas.filter(f => f.ruta.trim()).map(f => {
      let c = (f.cuerpo || '').trim();
      try { if (/^[[{]/.test(c)) c = JSON.stringify(JSON.parse(c)); } catch (e) { c = c.replace(/\s*\n\s*/g, ' '); }
      const ruta = f.ruta.trim().startsWith('/') ? f.ruta.trim() : '/' + f.ruta.trim();
      return f.metodo + ' ' + ruta.replace(/\s+/g, '') + (c && (f.metodo === 'POST' || f.metodo === 'PUT') ? ' ' + c : '');
    }).join('\n');
  }
  function pintarPeticiones(paso) {
    const cont = $('#peticiones');
    const filas = leerPeticiones(estado.peticiones[paso.id] ?? paso.ejecutar.peticiones);
    const ejemploCuerpo = A.id === 'java-web' ? 'nombre=Ana&edad=17&nota=4.5' : '{"titulo": "QA Tester", "empresa": "Datos SAS", "salario": 2100000}';
    const guardarFilas = () => { estado.peticiones[paso.id] = textoPeticiones(filas); guardar(); };
    const pintar = () => {
      cont.innerHTML = `
        <p class="ayuda-api">Aquí pruebas tu API como en <b>Thunder Client</b>. Con <b>▶ Enviar todas</b> tu aplicación arranca de verdad y recibe estas peticiones <b>en orden</b> (lo que crea un POST lo ve el GET de después). Con el ▶ de una fila envías solo esa.</p>
        ${filas.map((f, i) => `
          <div class="pet" data-i="${i}">
            <select class="pet-metodo m-${f.metodo}">${METODOS.map(m => `<option ${m === f.metodo ? 'selected' : ''}>${m}</option>`).join('')}</select>
            <input class="pet-ruta" value="${esc(f.ruta)}" placeholder="/api/ruta?param=valor" spellcheck="false">
            <button class="btn chico pet-enviar" title="Enviar solo esta petición">▶</button>
            <button class="btn chico pet-quitar" title="Quitar">✕</button>
            ${f.metodo === 'POST' || f.metodo === 'PUT' ? `<textarea class="pet-cuerpo" rows="2" spellcheck="false" placeholder="Cuerpo, por ejemplo: ${esc(ejemploCuerpo)}">${esc(f.cuerpo)}</textarea>` : ''}
          </div>`).join('')}
        <div class="acciones"><button class="btn chico" id="pet-agregar">＋ Agregar petición</button><span class="espacio"></span><button class="btn primario chico" id="pet-todas">▶ Enviar todas</button></div>`;
      cont.querySelectorAll('.pet').forEach(d => {
        const i = +d.dataset.i;
        d.querySelector('.pet-metodo').onchange = e => { filas[i].metodo = e.target.value; guardarFilas(); pintar(); };
        d.querySelector('.pet-ruta').oninput = e => { filas[i].ruta = e.target.value; guardarFilas(); };
        const c = d.querySelector('.pet-cuerpo');
        if (c) c.oninput = e => { filas[i].cuerpo = e.target.value; guardarFilas(); };
        d.querySelector('.pet-quitar').onclick = () => { filas.splice(i, 1); guardarFilas(); pintar(); };
        d.querySelector('.pet-enviar').onclick = () => evaluar(paso, 'ejecutar', textoPeticiones([filas[i]]));
      });
      $('#pet-agregar').onclick = () => { filas.push({ metodo: 'GET', ruta: '/api/', cuerpo: '' }); guardarFilas(); pintar(); const r = cont.querySelectorAll('.pet-ruta'); r[r.length - 1].focus(); };
      $('#pet-todas').onclick = () => evaluar(paso, 'ejecutar');
    };
    pintar();
  }

  let reloj = null;
  function setCargando(txt) {
    const c = $('#cargando');
    if (!c) return;
    clearInterval(reloj);
    c.classList.toggle('oculto', !txt);
    if (!txt) return;
    const t0 = Date.now();
    const pintar = () => { $('#cargando-txt').textContent = txt + ' ' + Math.round((Date.now() - t0) / 1000) + ' s'; };
    pintar();
    reloj = setInterval(pintar, 1000);
  }

  /** Espacios ____ sin completar (revisión rápida antes de ir al servidor). */
  function blancos(nombres) {
    const r = [];
    nombres.forEach(n => {
      if (A.archivos[n].soloLectura) return;
      estado.archivos[n].split('\n').forEach((l, k) => { if (/_{4,}/.test(l)) r.push({ archivo: n, linea: k + 1 }); });
    });
    return r;
  }

  async function evaluar(paso, modo, soloPeticiones) {
    if (ocupado) return;
    ocupado = true;
    ['#ejecutar', '#comprobar', '#reiniciar'].forEach(s => { const b = $(s); if (b) b.disabled = true; });
    try {
      const b = blancos(paso.compilar);
      if (b.length) { pintarResultado({ blancos: b }, modo); return; }
      setCargando(modo === 'ejecutar'
        ? (A.motor === 'java' ? (tienePeticiones(paso) ? 'Compilando y arrancando tu aplicación…' : 'Compilando y ejecutando…') : 'Armando tu app…')
        : 'Compilando y corriendo las pruebas…');
      const archivos = {};
      paso.compilar.forEach(n => { if (!A.archivos[n].soloLectura) archivos[n] = estado.archivos[n]; });
      cambios = {};
      const cuerpo = { paso: paso.id, modo, archivos };
      if (modo === 'ejecutar' && tienePeticiones(paso)) cuerpo.peticiones = soloPeticiones || (estado.peticiones[paso.id] ?? paso.ejecutar.peticiones);
      const res = await api('POST', '/api/evaluar', cuerpo);
      marcarGuardado('✓ Guardado');
      if (res.progreso) { estado.res = res.progreso; pintarProgreso(); }
      if (pasoActual === paso) pintarResultado(res, modo);
    } catch (e) {
      if (e.status === 401) { salir(); return; }
      pintarResultado({ errorInterno: e.message }, modo);
    } finally {
      ocupado = false;
      setCargando('');
      ['#ejecutar', '#comprobar', '#reiniciar'].forEach(s => { const b = $(s); if (b) b.disabled = false; });
    }
  }

  // Explicación en español junto al mensaje real (que siempre se muestra completo)
  const TRAD = [
    [/cannot find symbol/, 'No existe ese nombre: revisa mayúsculas/minúsculas, que la variable o el método exista y que la clase esté importada.'],
    [/';' expected/, 'Falta un punto y coma ; al final de la instrucción.'],
    [/not a statement/, 'Esa línea no es una instrucción válida de Java (¿quedó algo incompleto?).'],
    [/incompatible types/, 'Tipos incompatibles: el valor no es del tipo que se espera en ese lugar.'],
    [/missing return statement/, 'Falta un return: el método debe devolver un valor en todos los caminos.'],
    [/reached end of file while parsing/, 'Falta cerrar una llave }.'],
    [/class, interface, enum, or record expected|class, interface, or enum expected/, 'Sobra una llave } o hay código fuera de la clase.'],
    [/unclosed string literal/, 'Falta cerrar unas comillas "…".'],
    [/illegal start of (expression|type)/, 'Algo está mal escrito antes de este punto (revisa paréntesis, llaves y comillas).'],
    [/'\)' expected/, 'Falta cerrar un paréntesis ).'],
    [/'\(' expected/, 'Falta abrir un paréntesis (.'],
    [/<identifier> expected/, 'Se esperaba un nombre (identificador) en este punto.'],
    [/is not abstract and does not override/, 'Falta implementar un método obligatorio.'],
    [/might not have been initialized/, 'Usas una variable antes de darle un valor.'],
    [/is already defined/, 'Declaraste dos veces lo mismo.'],
    [/cannot be applied to given types|constructor .* cannot be applied/, 'Llamas un método o constructor con parámetros que no coinciden (cantidad o tipo).'],
    [/unreported exception/, 'Este código puede lanzar una excepción que debes atrapar (try/catch) o declarar con throws.'],
    [/annotation .* not applicable|not applicable to this kind/, 'Esa anotación no se puede poner en ese lugar.'],
    [/cannot assign a value to final variable/, 'No puedes cambiar una variable final.'],
    [/is public, should be declared in a file named/, 'El nombre de la clase pública debe ser igual al nombre del archivo.'],
    [/package .* does not exist/, 'Ese import no existe: revisa cómo escribiste el paquete.'],
    [/bad operand types for binary operator/, 'No se puede usar ese operador con esos tipos (por ejemplo, comparar un String con >).'],
    [/Unexpected closing .* tag does not match opening/, 'Una etiqueta JSX se cerró con otro nombre: cada <x> se cierra con </x>.'],
    [/Unexpected end of file before a closing/, 'Falta cerrar una etiqueta JSX.'],
    [/Expected ".*" but found/, 'Hay un símbolo que sobra o que falta (revisa llaves, paréntesis, comillas y etiquetas).'],
    [/Unterminated string literal|Unterminated template/, 'Falta cerrar unas comillas o un template literal (`…`).'],
    [/The character ".*" is not valid inside a JSX element/, 'Ese símbolo no se puede escribir directo dentro de JSX.'],
    [/Could not resolve "\.\//, 'No existe ese archivo: revisa el nombre en el import (mayúsculas incluidas).'],
    [/No matching export in .* for import/, 'Ese archivo no exporta ese nombre: revisa el export del componente o la forma del import ({ } o sin llaves).'],
    [/Multiple exports with the same name|has already been declared/, 'Declaraste dos veces el mismo nombre.'],
    [/Por seguridad/, ''],
  ];
  function traducir(m) { for (const [re, t] of TRAD) if (re.test(m)) return t; return ''; }

  function enlace(archivo, linea) {
    if (!archivo) return '';
    return `<a href="#" data-a="${esc(archivo)}" data-l="${linea || 1}">${esc(archivo)}${linea ? ', línea ' + linea : ''}</a>`;
  }

  function htmlErrores(errores) {
    let h = `<div class="aviso mal">❌ Tu código no compila, así que todavía no se puede ejecutar. Corrige el primer error y vuelve a intentar.</div>`;
    h += errores.slice(0, 6).map(e => {
      const es = traducir(e.mensaje);
      const caret = e.codigo && e.columna ? '\n' + ' '.repeat(Math.max(0, e.columna - 1)) + '^' : '';
      return `<div class="error-comp"><div class="donde">${enlace(e.archivo, e.linea)}</div>
        <div class="real">${esc(e.mensaje)}</div>
        ${e.codigo ? '<pre>' + esc(e.codigo + caret) + '</pre>' : ''}
        ${es ? '<div class="es">💡 ' + esc(es) + '</div>' : ''}</div>`;
    }).join('');
    if (errores.length > 6) h += `<p class="vacio">… y ${errores.length - 6} errores más (muchas veces se arreglan solos al corregir el primero).</p>`;
    return h;
  }

  function formatoCuerpo(c) {
    const t = String(c || '');
    if (/^\s*[[{]/.test(t)) { try { return JSON.stringify(JSON.parse(t), null, 2); } catch (e) { /* no es JSON */ } }
    return t;
  }

  function htmlHttp(x) {
    let h = `<div class="arranque ${/no pudo|FAILED|no pudo arrancar|no pudo desplegar/i.test(x.arranque || '') ? 'mal' : ''}">${esc(x.arranque || '')}</div>`;
    for (const r of x.respuestas || []) {
      const st = r.status ? String(r.status)[0] : '0';
      h += `<div class="http-resp"><div class="linea"><span class="metodo">${esc(r.metodo)}</span><span>${esc(r.ruta)}</span>
        ${r.status ? `<span class="st st${st}">${r.status}</span>` : ''}<span class="tipo">${esc(r.contentType || '')}</span></div>`;
      if (r.enviado) h += `<pre class="enviado">Enviado: ${esc(r.enviado)}</pre>`;
      if (r.error) h += `<div class="exc">${esc(r.error)}</div>`;
      else h += `<pre>${r.cuerpo ? esc(formatoCuerpo(r.cuerpo)) : '<span class="enviado">(sin cuerpo)</span>'}</pre>`;
      if (r.excepcion) h += `<div class="exc">Tu código lanzó: ${esc(r.excepcion)}</div>`;
      h += '</div>';
    }
    return h;
  }

  function pintarResultado(res, modo) {
    const s = $('#salida');
    if (!s) return;
    $('#salida-titulo').textContent = modo === 'ejecutar' ? 'Resultado de la ejecución' : 'Comprobación';
    let h = '';
    let preview = null;
    if (res.errorInterno) {
      h = `<div class="aviso mal">No se pudo evaluar: ${esc(res.errorInterno)}</div><p class="vacio">Tu código está guardado. Vuelve a intentarlo en un momento.</p>`;
    } else if (res.blancos) {
      const lista = res.blancos.map(b => `<li>${enlace(b.archivo, b.linea)}</li>`).join('');
      h = `<div class="aviso info">✏️ Aún tienes espacios <code>____</code> por completar. Reemplaza cada <code>____</code> por el código correcto:</div><ul>${lista}</ul>`;
    } else if (res.tiempoAgotado) {
      h = `<div class="aviso mal">⏱ ${esc(res.mensaje)}</div>`;
    } else if (res.peticionesInvalidas) {
      h = `<div class="aviso mal">Revisa la pestaña <b>${HTTP}</b>: no entendí estas líneas.</div><pre class="consola">${esc(res.peticionesInvalidas.join('\n'))}</pre>
        <p class="vacio">Formato: <code>GET /api/ruta</code> o <code>POST /api/ruta {"campo": "valor"}</code>, una por línea.</p>`;
    } else if (res.errores && res.errores.length) {
      h = res.errores.some(e => e.seguridad)
        ? `<div class="aviso mal">⛔ ${esc(res.errores[0].mensaje)}</div><div class="error-comp"><div class="donde">${enlace(res.errores[0].archivo, res.errores[0].linea)}</div><pre>${esc(res.errores[0].codigo || '')}</pre></div>`
        : htmlErrores(res.errores);
    } else if (modo === 'comprobar') {
      const rs = res.pruebas || [];
      const ok = rs.filter(r => r.ok).length;
      h += ok === rs.length && rs.length
        ? `<div class="aviso ok">🎉 ¡Muy bien! Pasaste las ${rs.length} pruebas de este paso.${estado.paso < A.pasos.length - 1 ? ' Sigue al siguiente con <b>Siguiente ›</b>.' : ' Ve a <b>🏁 Nota</b> para calificar.'}</div>`
        : `<div class="aviso mal">Vas ${ok} de ${rs.length}. Lee el mensaje de la primera prueba que falla, corrige y vuelve a comprobar.</div>`;
      h += rs.map(r => `<div class="prueba ${r.ok ? 'ok' : 'mal'}"><span class="icono">${r.ok ? '✔' : '✘'}</span><div><div class="nombre">${esc(r.nombre)}</div>
        ${r.ok ? '' : '<pre class="msg">' + esc(r.mensaje || '') + '</pre>'}
        ${r.salida ? '<details class="plegable"><summary>Lo que imprimió tu código en esta prueba</summary><pre class="consola">' + esc(r.salida) + '</pre></details>' : ''}</div></div>`).join('');
      if (res.ms) h += `<p class="vacio" style="font-size:12px">Evaluado en el servidor en ${(res.ms / 1000).toFixed(1)} s.</p>`;
    } else {
      // ▶ Ejecutar
      if (res.js != null) {
        preview = vistaPrevia(res.js);
        h += '<div style="font-weight:600;font-size:14px;margin:0 0 4px">Tu app funcionando (puedes usarla):</div>';
      } else if (res.http) {
        h += `<p class="vacio" style="margin-top:0">Estas peticiones se enviaron a tu app. Cámbialas o agrega otras en la pestaña <a href="#" id="ir-api">🌐 Probar la API</a>.</p>`;
        h += htmlHttp(res.http);
        if (res.consola && res.consola.trim()) {
          const fallo = /FAILED|Exception/.test(res.http.arranque || '');
          h += `<details class="plegable" ${fallo ? 'open' : ''}><summary>Consola del servidor (logs de ${A.id === 'spring-boot' ? 'Spring Boot' : 'Tomcat'})</summary><pre class="consola">${esc(res.consola)}</pre></details>`;
        }
      } else {
        if (res.programa) h += `<details class="plegable"><summary>Programa de prueba que se ejecutó (usa tus clases)</summary><pre class="consola">${esc(res.programa)}</pre></details>`;
        h += res.consola && res.consola.trim()
          ? `<div style="font-weight:600;font-size:14px">Salida (System.out):</div><pre class="consola">${esc(res.consola)}</pre>`
          : '<p class="vacio">El programa no imprimió nada.</p>';
      }
      if (res.excepcion) h += `<div class="aviso mal" style="white-space:pre-wrap;font-family:var(--mono);font-size:12.5px">${esc(res.excepcion)}</div>`;
    }
    s.innerHTML = h;
    if (preview) s.appendChild(preview);
    const irApi = $('#ir-api');
    if (irApi) irApi.onclick = ev => { ev.preventDefault(); crearEditor.abrir(HTTP); };
    s.querySelectorAll('a[data-a]').forEach(a => a.onclick = ev => {
      ev.preventDefault();
      if (!pasoActual.archivos.includes(a.dataset.a)) return;
      crearEditor.abrir(a.dataset.a);
      const l = Math.max(0, +a.dataset.l - 1);
      editor.focus(); editor.setCursor({ line: l, ch: 0 }); editor.scrollIntoView({ line: l, ch: 0 }, 100);
      marcaError = editor.addLineClass(l, 'background', 'cm-linea-error');
    });
    s.scrollTop = 0;
    if (window.innerWidth < 900) s.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  /** Vista previa de React: corre en un iframe aislado con React 18. */
  function vistaPrevia(js) {
    const f = document.createElement('iframe');
    f.className = 'preview';
    f.setAttribute('sandbox', 'allow-scripts allow-modals');
    f.title = 'Vista previa';
    const css = `body{font:15px/1.5 system-ui,sans-serif;margin:12px;color:#1d2333;background:#fff}
      .badge{display:inline-block;padding:1px 9px;border-radius:999px;font-size:12px;font-weight:700;margin-left:6px}
      .badge-ok{background:#d3f9d8;color:#2b8a3e}.badge-mal{background:#ffe3e3;color:#c92a2a}
      ul{padding-left:20px} li{margin:4px 0} button{font:inherit;padding:5px 12px;border-radius:6px;border:1px solid #bbb;background:#f3f4f8;cursor:pointer}
      input{font:inherit;padding:5px 8px;margin:0 6px 6px 0;border:1px solid #bbb;border-radius:6px} .error{color:#c92a2a} .vacio{color:#777}
      #consola{font:12px monospace;background:#263238;color:#e0e6ea;padding:6px 8px;border-radius:6px;white-space:pre-wrap;margin-top:10px}
      #consola:empty{display:none} .falla{color:#c92a2a;font:13px monospace;white-space:pre-wrap;background:#fff0f0;padding:8px;border-radius:6px}`;
    const pre = `
      const consola = document.getElementById('consola');
      const fmt = a => a.map(x => typeof x === 'string' ? x : (x instanceof Error ? x.message : JSON.stringify(x))).join(' ');
      console.log = (...a) => { consola.textContent += fmt(a) + '\\n'; };
      const err = console.error.bind(console);
      console.error = (...a) => { const t = typeof a[0] === 'string' && a[0].includes('%s') ? (i => a[0].replace(/%s/g, () => String(a[i++])))(1) : fmt(a); consola.textContent += '✖ ' + t.split('\\n')[0] + '\\n'; err(...a); };
      const mostrarFalla = m => { document.getElementById('root').innerHTML = '<div class="falla">' + String(m).replace(/</g, '&lt;') + '</div>'; };
      window.onerror = (m) => mostrarFalla('Error: ' + m);
      class Limite extends React.Component {
        constructor(p) { super(p); this.state = { error: null }; }
        static getDerivedStateFromError(error) { return { error }; }
        render() { return this.state.error ? React.createElement('div', { className: 'falla' }, 'Tu componente lanzó un error: ' + this.state.error.message) : this.props.children; }
      }
      window.__montar = el => ReactDOM.createRoot(document.getElementById('root')).render(React.createElement(Limite, null, el));`;
    f.srcdoc = `<!doctype html><html><head><meta charset="utf-8"><style>${css}</style>
      <script src="https://cdnjs.cloudflare.com/ajax/libs/react/18.3.1/umd/react.development.js"><\/script><script src="https://cdnjs.cloudflare.com/ajax/libs/react-dom/18.3.1/umd/react-dom.development.js"><\/script></head>
      <body><div id="root"></div><pre id="consola"></pre><script>${pre}<\/script><script>${js.replace(/<\/script/gi, '<\\/script')}<\/script></body></html>`;
    return f;
  }

  // ------------------------------------------------------------------ entrega y nota
  function vistaEntrega() {
    pasoActual = null;
    const filas = A.pasos.map((p, i) => {
      const r = estado.res[p.id];
      const st = !r ? '<span style="color:var(--suave)">Sin comprobar</span>' : r.ok === r.total ? '<span style="color:var(--ok)">✔ Completo</span>' : `<span style="color:var(--aviso)">${r.ok}/${r.total}</span>`;
      return `<tr><td>${i + 1}. ${esc(p.titulo)}</td><td>${st}</td></tr>`;
    }).join('');
    $('#vista').innerHTML = `
      <div class="entrega">
        <div class="tarjeta">
          <h2 style="margin-top:0">🏁 Calificar y ver la nota</h2>
          <p>Al pulsar <b>Calificar mi actividad</b> el servidor compila y ejecuta <b>todas</b> las pruebas sobre tu código actual. Cada paso vale lo mismo. La nota va de <b>0.0 a 5.0</b> y se aprueba con <b>3.0</b>.</p>
          <table class="tabla"><tr><th>Paso</th><th>Tu última comprobación</th></tr>${filas}</table>
          <p style="color:var(--suave);font-size:14px">Puedes calificar varias veces. <b>Tu profesor ve todas tus notas</b> (la última y la mejor) directamente en el sistema: no tienes que enviarle nada.</p>
          <div class="acciones"><button class="btn primario grande" id="calificar">🧮 Calificar mi actividad</button>
            <span class="estado-carga oculto" id="cargando"><span class="girando"></span><span id="cargando-txt"></span></span></div>
        </div>
        <div id="resultado-final"></div>
        <div id="historial"></div>
      </div>`;
    $('#calificar').onclick = calificar;
    pintarHistorial();
  }

  async function calificar() {
    if (ocupado) return;
    ocupado = true;
    const btn = $('#calificar');
    btn.disabled = true;
    setCargando('Calificando todos los pasos en el servidor…');
    try {
      const archivos = {};
      Object.keys(A.archivos).forEach(n => { if (!A.archivos[n].soloLectura) archivos[n] = estado.archivos[n]; });
      cambios = {};
      const r = await api('POST', '/api/calificar', { archivos });
      if (r.progreso) estado.res = r.progreso;
      entregas.unshift({ id: r.id, nota: r.nota, detalle: r.detalle, creado: r.fecha });
      pintarNota(r);
      pintarProgreso();
      pintarHistorial();
    } catch (e) {
      if (e.status === 401) { salir(); return; }
      $('#resultado-final').innerHTML = `<div class="aviso mal">No se pudo calificar: ${esc(e.message)}</div>`;
    } finally {
      ocupado = false;
      btn.disabled = false;
      setCargando('');
    }
  }

  function fecha(t) { return new Date(t).toLocaleString('es-CO', { dateStyle: 'medium', timeStyle: 'short' }); }

  function pintarNota(n) {
    const aprueba = n.nota >= 3;
    const filas = n.detalle.map((d, i) => {
      const fallidas = (d.pruebas || []).filter(p => !p[1]).map(p => '<li>' + esc(p[0]) + '</li>').join('');
      return `<tr><td>${i + 1}. ${esc(d.titulo)}${d.nota ? '<br><small style="color:var(--aviso)">' + esc(d.nota) + '</small>' : ''}${fallidas ? '<ul class="fallidas">' + fallidas + '</ul>' : ''}</td>
        <td>${d.ok} / ${d.total}</td><td>${(5 / A.pasos.length * (d.total ? d.ok / d.total : 0)).toFixed(2)} / ${(5 / A.pasos.length).toFixed(2)}</td></tr>`;
    }).join('');
    $('#resultado-final').innerHTML = `
      <div class="tarjeta">
        <div class="nota-grande">
          <div><div style="color:var(--suave);font-size:14px">Tu nota</div><div class="valor ${aprueba ? 'aprueba' : 'pierde'}">${n.nota.toFixed(1)}</div></div>
          <div><div style="font-size:20px;font-weight:700">${aprueba ? '¡Aprobaste la recuperación! 🎉' : 'Aún no alcanzas 3.0'}</div>
          <div style="color:var(--suave)">${esc(estudiante.nombre)} · ${esc(estudiante.doc)} · ${fecha(n.fecha || Date.now())}</div>
          <div style="margin-top:4px">✔ Esta nota quedó registrada para tu profesor.${aprueba ? '' : ' Puedes volver a los pasos incompletos, corregir y calificar de nuevo.'}</div></div>
        </div>
        <table class="tabla"><tr><th>Paso</th><th>Pruebas</th><th>Aporte a la nota</th></tr>${filas}</table>
      </div>`;
  }

  function pintarHistorial() {
    const h = $('#historial');
    if (!h || !entregas.length) return;
    h.innerHTML = `<div class="tarjeta"><h3 style="margin-top:0">Tus calificaciones registradas</h3>
      <table class="tabla"><tr><th>Fecha</th><th>Nota</th></tr>${entregas.slice(0, 10).map(e => `<tr><td>${fecha(e.creado)}</td><td><b>${Number(e.nota).toFixed(1)}</b></td></tr>`).join('')}</table></div>`;
  }

  window.addEventListener('DOMContentLoaded', iniciar);
})();
