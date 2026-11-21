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
  const I = (n, c) => (window.Icono ? window.Icono(n, c) : '');
  /** Logo de la tecnología del curso en una baldosa blanca. */
  const LOGO = (tam) => `<span class="baldosa${tam ? ' ' + tam : ''}">${window.Logo ? window.Logo(A.id) : ''}</span>`;
  /** Los mensajes del servidor traen un emoji antes de la pista: se muestra como texto. */
  const limpiar = t => String(t == null ? '' : t).replace(/\u{1F4A1}\s*/gu, 'Pista: ');
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
    const icono = error ? 'cloud-off' : /^Guardado/.test(texto) ? 'cloud-check' : 'circle-dashed';
    g.innerHTML = I(icono) + '<span>' + esc(texto) + '</span>';
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
      marcarGuardado('Guardado');
    } catch (e) {
      cambios = Object.assign({}, enviados, cambios);
      marcarGuardado(e.status === 401 ? 'Sesión vencida' : 'Sin conexión, reintentando…', true);
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
    document.body.dataset.curso = A.id;
    app.innerHTML = '<div class="portada angosta"><div class="estado-carga"><span class="girando"></span> Cargando actividad…</div></div>';
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
    const temas = A.temas.map(t => '<span class="badge" data-variant="outline">' + esc(t) + '</span>').join('');
    app.innerHTML = `
      <header class="heroe dark">
        <div class="dentro">
          <div class="cabecera">
            <a class="marca" href="../"><span class="baldosa icono">${I('graduation-cap')}</span><span class="txt">Actividades de recuperación<small>Programación</small></span></a>
            <a class="btn" data-variant="ghost" data-size="sm" href="../">${I('arrow-left')} Todas las actividades</a>
          </div>
          <div class="heroe-curso">
            <div>
              <div class="titulo-curso">${LOGO('grande')}
                <div><span class="eyebrow">Recuperación · ${esc(A.curso)}</span><h1>${esc(A.titulo)}</h1></div></div>
              <p class="sub" style="margin-top:16px">${A.descripcion}</p>
              <div class="meta"><span>${I('clock')} ${esc(A.duracion)}</span><span>${I('list-checks')} ${A.pasos.length} pasos y la nota final</span><span>${I('monitor')} Nada que instalar</span></div>
              <div class="temas">${temas}</div>
            </div>
            <div class="card entrar">
              <header><h2>Entrar a la actividad</h2><p>La primera vez escribe tus datos y <b>elige un PIN</b> de 4 a 8 números. Para continuar después, en este u otro computador, usa el <b>mismo documento y PIN</b>.</p></header>
              <section>
                <form id="form-entrar" class="form">
                  <div class="fila">
                    <div class="field"><label for="doc">Documento</label><input class="input" id="doc" autocomplete="username" placeholder="1012345678" required></div>
                    <div class="field"><label for="pin">PIN</label><input class="input" id="pin" type="password" inputmode="numeric" autocomplete="current-password" placeholder="4 a 8 números" required></div>
                  </div>
                  <div class="field"><label for="nombre">Nombre completo</label><input class="input" id="nombre" autocomplete="name" placeholder="Ana María Pérez"><small>Solo se pide la primera vez.</small></div>
                  <div id="error-datos" class="aviso mal ${error ? '' : 'oculto'}">${I('circle-x')}<div>${esc(error || '')}</div></div>
                  <button class="btn" id="empezar" type="submit" style="width:100%">Entrar ${I('arrow-right')}</button>
                </form>
              </section>
            </div>
          </div>
        </div>
      </header>
      <div class="portada">
        <div class="card">
          <header><h2>Cómo funciona</h2></header>
          <section>
            <ol class="pasos-como">
              <li><div>Cada paso trae una <b>explicación</b> y un <b>código para completar</b>. Los espacios <code>____</code> son los que debes llenar.</div></li>
              <li><div><b>Ejecutar</b> corre tu código de verdad y te muestra lo que hace. <b>Comprobar</b> corre las pruebas automáticas y te dice qué falla, con los mensajes reales del compilador y del framework.</div></li>
              <li><div>Si te atascas, abre las <b>pistas</b>. Puedes intentarlo cuantas veces quieras.</div></li>
              <li><div>Al final, en <b>Nota</b>, se califica todo tu código y la nota <b>queda registrada para tu profesor</b> automáticamente.</div></li>
            </ol>
          </section>
          ${A.aviso ? '<footer><div class="nota-info">' + A.aviso + '</div></footer>' : ''}
        </div>
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
        e.querySelector('div').textContent = x.message;
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
    const iniciales = String(estudiante.nombre || estudiante.doc || '?').trim().split(/\s+/).slice(0, 2).map(p => p[0]).join('').toUpperCase();
    app.innerHTML = `
      <header class="barra">
        <div class="marca">${LOGO()}<span class="txt">${esc(A.curso)}<small>Recuperación</small></span></div>
        <nav class="ruta" aria-label="Pasos de la actividad">
          <button class="nav-flecha" id="anterior" title="Paso anterior (Alt + flecha izquierda)" aria-label="Paso anterior">${I('chevron-left')}</button>
          <div class="nodos" id="ruta-antes"></div>
          <div class="selector-paso">
            <button class="paso-actual" id="paso-actual" aria-haspopup="menu" aria-expanded="false" title="Ver todos los pasos">
              <span class="anillo" id="anillo"></span>
              <span class="textos"><span class="cual" id="paso-cual"></span><span class="cuantos" id="paso-cuantos"></span></span>
              ${I('chevron-down', 'abre')}
            </button>
            <div class="menu-pasos" id="menu-pasos" role="menu" hidden></div>
          </div>
          <div class="nodos" id="ruta-despues"></div>
          <button class="nav-flecha siguiente" id="siguiente" title="Paso siguiente (Alt + flecha derecha)"><span>Siguiente</span>${I('chevron-right')}</button>
        </nav>
        <div class="lado">
          <span class="guardado" id="guardado">${I('cloud-check')}<span>Guardado</span></span>
          <button class="nav-flecha" id="ver-guia" title="Ver la guía de cómo usar la plataforma" aria-label="Ver la guía">${I('circle-help')}</button>
          <div class="usuario">
            <button class="avatar" id="avatar" aria-haspopup="menu" aria-expanded="false" title="${esc(estudiante.nombre)}">${esc(iniciales)}</button>
            <div class="menu-usuario" id="menu-usuario" role="menu" hidden>
              <div class="quien"><span class="avatar grande">${esc(iniciales)}</span><div><b>${esc(estudiante.nombre)}</b><small>Documento ${esc(estudiante.doc)}</small></div></div>
              <button class="item" id="salir" role="menuitem">${I('log-out')} Salir de este computador</button>
            </div>
          </div>
        </div>
      </header>
      <main id="vista"></main>`;
    $('#anterior').onclick = () => irA(estado.paso - 1);
    $('#siguiente').onclick = () => irA(estado.paso + 1);
    $('#salir').onclick = salir;
    menu($('#paso-actual'), $('#menu-pasos'));
    menu($('#avatar'), $('#menu-usuario'));
    $('#ver-guia').onclick = () => {
      if (estado.paso >= A.pasos.length) irA(A.pasos.length - 1);
      setTimeout(abrirGuia, 60);
    };
    irA(Math.min(estado.paso || 0, A.pasos.length));
    // La primera vez (sin pasos comprobados) se muestra la guía; en otro computador con avance ya no aparece
    if (!guiaVista() && !Object.keys(estado.res).length && estado.paso < A.pasos.length) setTimeout(abrirGuia, 500);
  }
  document.addEventListener('keydown', ev => {
    if (guia || !ev.altKey || !estado || !$('#vista')) return;
    if (ev.key === 'ArrowLeft') { ev.preventDefault(); irA(estado.paso - 1); }
    if (ev.key === 'ArrowRight') { ev.preventDefault(); irA(estado.paso + 1); }
  });

  /** Menú desplegable simple: abre con clic, cierra con Escape o al hacer clic afuera. */
  function menu(boton, panel) {
    const cerrar = () => { panel.hidden = true; boton.setAttribute('aria-expanded', 'false'); };
    boton.onclick = ev => {
      ev.stopPropagation();
      const abrir = panel.hidden;
      document.querySelectorAll('.menu-pasos, .menu-usuario').forEach(m => { m.hidden = true; });
      panel.hidden = !abrir;
      boton.setAttribute('aria-expanded', String(abrir));
    };
    panel.addEventListener('click', ev => { if (ev.target.closest('button')) cerrar(); });
    document.addEventListener('click', ev => { if (!panel.hidden && !panel.contains(ev.target)) cerrar(); });
    document.addEventListener('keydown', ev => { if (ev.key === 'Escape' && !panel.hidden) { cerrar(); boton.focus(); } });
  }

  function pintarProgreso() {
    const total = A.pasos.length;
    const estadoDe = i => {
      const r = estado.res[A.pasos[i].id];
      return { r, clase: !r ? 'pendiente' : (r.total && r.ok === r.total ? 'hecho' : 'fallo') };
    };
    const completos = A.pasos.filter((p, i) => estadoDe(i).clase === 'hecho').length;
    const enNota = estado.paso >= total;

    // Ruta de la barra: un punto por paso (el actual es la ficha resaltada) y la nota al final
    const nodo = i => {
      if (i === total) return `<button class="nodo nota${entregas.length ? ' hecho' : ''}" data-i="${total}" title="Calificar y ver la nota">${I('flag')}<span>Nota</span></button>`;
      const { r, clase } = estadoDe(i);
      const txt = `Paso ${i + 1}: ${esc(A.pasos[i].titulo)}${r ? ` (${r.ok} de ${r.total} pruebas)` : ''}`;
      return `<button class="nodo ${clase}" data-i="${i}" title="${txt}" aria-label="${txt}">${clase === 'hecho' ? I('check') : i + 1}</button>`;
    };
    // Tramo que sale del paso i: verde si ese paso ya está completo
    const linea = i => `<span class="ruta-linea${estadoDe(i).clase === 'hecho' ? ' hecha' : ''}"></span>`;
    let antes = '', despues = '', lista = '';
    for (let i = 0; i < Math.min(estado.paso, total); i++) antes += nodo(i) + linea(i);
    for (let i = estado.paso + 1; i <= total; i++) despues += linea(i - 1) + nodo(i);
    $('#ruta-antes').innerHTML = antes;
    $('#ruta-despues').innerHTML = despues;
    document.querySelectorAll('.ruta .nodo').forEach(b => b.onclick = () => irA(+b.dataset.i));

    // Lista del menú con todos los pasos
    A.pasos.forEach((paso, i) => {
      const { r, clase } = estadoDe(i);
      const pruebas = r ? r.ok + ' de ' + r.total + ' pruebas' : '';
      const icono = clase === 'hecho' ? 'circle-check' : clase === 'fallo' ? 'circle-x' : 'circle-dashed';
      lista += `<button class="item ${clase}${i === estado.paso ? ' actual' : ''}" role="menuitem" data-i="${i}">
        <span class="estado">${I(icono)}</span><span class="nombre"><small>Paso ${i + 1}</small>${esc(paso.titulo)}</span><span class="pruebas">${pruebas || 'Sin comprobar'}</span></button>`;
    });
    lista += `<button class="item nota${enNota ? ' actual' : ''}" role="menuitem" data-i="${total}">
      <span class="estado">${I('flag')}</span><span class="nombre"><small>Al terminar</small>Calificar y ver la nota</span><span class="pruebas">${entregas.length ? 'Última: ' + Number(entregas[0].nota).toFixed(1) : ''}</span></button>`;
    const m = $('#menu-pasos');
    m.innerHTML = `<div class="cab-menu"><b>Tu avance</b><span>${completos} de ${total} pasos completos</span><div class="barra-menu"><i style="width:${Math.round(completos / total * 100)}%"></i></div></div><div class="lista">${lista}</div>`;
    m.querySelectorAll('button[data-i]').forEach(b => b.onclick = () => irA(+b.dataset.i));

    // Selector central
    const actual = enNota ? 'nota' : estadoDe(estado.paso).clase;
    $('#paso-cual').textContent = enNota ? 'Nota final' : `Paso ${estado.paso + 1} de ${total}`;
    $('#paso-cuantos').textContent = enNota ? `${completos} de ${total} pasos completos` : A.pasos[estado.paso].titulo;
    const anillo = $('#anillo');
    anillo.className = 'anillo ' + actual;
    anillo.innerHTML = enNota ? I('flag') : actual === 'hecho' ? I('check') : String(estado.paso + 1);
    $('#anterior').disabled = estado.paso === 0;
    $('#siguiente').disabled = enNota;
    // "Siguiente" se vuelve el botón principal solo cuando el paso actual está completo
    $('#siguiente').classList.toggle('listo', actual === 'hecho');
    $('#siguiente').querySelector('span').textContent = estado.paso === total - 1 ? 'Ir a la nota' : 'Siguiente';
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
    const pistas = (paso.pistas || []).map((p, k) => `<details ${k < pistasVistas ? 'open' : ''} data-k="${k}"><summary>${I('chevron-right')}Pista ${k + 1}</summary><div>${p}</div></details>`).join('');
    $('#vista').innerHTML = `
      <div class="trabajo" id="trabajo">
        <section class="panel explicacion">
          <div class="cab-paso">
            <div class="num">Paso ${i + 1} de ${A.pasos.length}</div>
            <h2>${esc(paso.titulo)}</h2>
          </div>
          <div class="contenido prosa">
            ${paso.explicacion}
            <div class="tarea"><h3>${I('target')} Tu tarea</h3>${paso.tarea}</div>
            ${pistas ? '<h3 class="titulo-pistas">' + I('lightbulb') + ' ¿Te atascaste?</h3><div class="pistas">' + pistas + '</div>' : ''}
          </div>
        </section>
        <div class="divisor v" id="div-v" title="Arrastra para cambiar el ancho" role="separator" aria-orientation="vertical"></div>
        <section class="ide dark" id="editor-col">
          <div class="editor-caja">
            <div class="pestanas" id="pestanas"></div>
            <div id="editor"></div>
            <div class="peticiones oculto" id="peticiones"></div>
          </div>
          <div class="acciones">
            <button class="btn" data-variant="outline" id="ejecutar" title="Corre tu código de verdad y muestra lo que hace">${I('play')} Ejecutar</button>
            <button class="btn" id="comprobar" title="Corre las pruebas automáticas (Ctrl + Enter)">${I('circle-check')} Comprobar</button>
            <span class="atajo"><kbd class="kbd">Ctrl</kbd>+<kbd class="kbd">Enter</kbd></span>
            <span class="estado-carga oculto" id="cargando"><span class="girando"></span><span id="cargando-txt"></span></span>
            <span class="espacio"></span>
            <button class="btn" data-variant="ghost" data-size="sm" id="reiniciar" title="Vuelve este archivo a su versión inicial">${I('rotate-ccw')}<span>Reiniciar archivo</span></button>
          </div>
          <div class="divisor h" id="div-h" title="Arrastra para cambiar el alto" role="separator" aria-orientation="horizontal"></div>
          <div class="salida">
            <div class="cab"><span>${I('terminal')}<span id="salida-titulo">Resultado</span></span><button class="btn" data-variant="ghost" data-size="sm" id="agrandar" title="Agrandar o achicar el panel de resultados">${I('maximize-2')}<span>Agrandar</span></button></div>
            <div class="cuerpo" id="salida"><p class="vacio">Pulsa <b>Ejecutar</b> para ver qué hace tu código o <b>Comprobar</b> para revisarlo.</p></div>
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
      // Alterna entre el alto elegido por el estudiante y un panel de resultados grande
      const grande = !$('#editor-col').classList.contains('salida-grande');
      $('#editor-col').classList.toggle('salida-grande', grande);
      aplicarTamanos(grande ? { altoEditor: 30 } : null);
      setTimeout(() => editor.refresh(), 30);
    };
    activarDivisores();
    $('#reiniciar').onclick = () => reiniciarArchivo(paso);
  }

  // ------------------------------------------------------------------ tamaño de los paneles (divisores que se arrastran)
  const CLAVE_TAMANOS = 'rec2:tamanos';
  const TAMANOS_INICIALES = { anchoExpl: 38, altoEditor: 56 };
  let tamanos = Object.assign({}, TAMANOS_INICIALES);
  try { Object.assign(tamanos, JSON.parse(localStorage.getItem(CLAVE_TAMANOS)) || {}); } catch (e) { /* sin almacenamiento */ }
  const limitar = (v, min, max) => Math.max(min, Math.min(max, v));

  /** Aplica los tamaños guardados (o unos temporales, como el panel de resultados grande). */
  function aplicarTamanos(temporal) {
    const t = Object.assign({}, tamanos, temporal || {});
    const trabajo = $('#trabajo'), ide = $('#editor-col'), b = $('#agrandar');
    if (trabajo) trabajo.style.setProperty('--ancho-expl', t.anchoExpl + '%');
    if (ide) ide.style.setProperty('--alto-editor', t.altoEditor + '%');
    if (b) b.innerHTML = ide && ide.classList.contains('salida-grande') ? I('minimize-2') + '<span>Achicar</span>' : I('maximize-2') + '<span>Agrandar</span>';
  }
  function guardarTamanos() { try { localStorage.setItem(CLAVE_TAMANOS, JSON.stringify(tamanos)); } catch (e) { /* sin almacenamiento */ } }

  /** Arrastre con el ratón o el dedo; el cálculo va en requestAnimationFrame para no recargar PCs lentos. */
  function arrastrar(div, eje, alMover) {
    div.addEventListener('pointerdown', ev => {
      if (ev.button !== 0) return;
      ev.preventDefault();
      div.setPointerCapture(ev.pointerId);
      div.classList.add('activo');
      document.body.classList.add('arrastrando', eje);
      let ultimo = null, cuadro = 0;
      const mover = e => { ultimo = e; if (!cuadro) cuadro = requestAnimationFrame(() => { cuadro = 0; alMover(ultimo); }); };
      const soltar = () => {
        div.removeEventListener('pointermove', mover);
        div.removeEventListener('pointerup', soltar);
        div.removeEventListener('pointercancel', soltar);
        div.classList.remove('activo');
        document.body.classList.remove('arrastrando', eje);
        guardarTamanos();
        if (editor) editor.refresh();
      };
      div.addEventListener('pointermove', mover);
      div.addEventListener('pointerup', soltar);
      div.addEventListener('pointercancel', soltar);
    });
    // Doble clic: vuelve al tamaño inicial
    div.addEventListener('dblclick', () => {
      if (eje === 'v') tamanos.anchoExpl = TAMANOS_INICIALES.anchoExpl; else tamanos.altoEditor = TAMANOS_INICIALES.altoEditor;
      $('#editor-col').classList.remove('salida-grande');
      aplicarTamanos(); guardarTamanos();
      if (editor) editor.refresh();
    });
  }

  function activarDivisores() {
    aplicarTamanos();
    arrastrar($('#div-v'), 'v', e => {
      const r = $('#trabajo').getBoundingClientRect();
      tamanos.anchoExpl = Math.round(limitar((e.clientX - r.left) / r.width * 100, 22, 62) * 10) / 10;
      aplicarTamanos();
    });
    arrastrar($('#div-h'), 'h', e => {
      const ide = $('#editor-col'), r = ide.getBoundingClientRect();
      ide.classList.remove('salida-grande');
      tamanos.altoEditor = Math.round(limitar((e.clientY - r.top) / r.height * 100, 18, 82) * 10) / 10;
      aplicarTamanos();
    });
  }

  function reiniciarArchivo(paso) {
    const b = $('#reiniciar');
    if (archivoActual !== HTTP && A.archivos[archivoActual].soloLectura) return;
    if (b.dataset.confirmar !== '1') {
      b.dataset.confirmar = '1';
      b.dataset.variant = 'destructive';
      b.innerHTML = I('triangle-alert') + '<span>¿Seguro? Pulsa otra vez</span>';
      setTimeout(() => { b.dataset.confirmar = ''; textoReiniciar(); }, 3500);
      return;
    }
    b.dataset.confirmar = '';
    textoReiniciar();
    if (archivoActual === HTTP) { delete estado.peticiones[paso.id]; pintarPeticiones(paso); guardar(); return; }
    estado.archivos[archivoActual] = originales[archivoActual];
    cambios[archivoActual] = originales[archivoActual];
    editor.setValue(originales[archivoActual]);
    guardar();
  }

  function textoReiniciar() {
    const b = $('#reiniciar');
    if (!b) return;
    b.dataset.variant = 'ghost';
    b.innerHTML = I('rotate-ccw') + '<span>' + (archivoActual === HTTP ? 'Restaurar ejemplos' : 'Reiniciar archivo') + '</span>';
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
      textoReiniciar();
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
    const logoArchivo = window.Logo ? window.Logo(A.id) : I('file-code');
    let h = nombres.map(n => `<button data-n="${esc(n)}"${A.archivos[n].soloLectura ? ' title="Solo lectura: no hace falta cambiarlo"' : ''}>${logoArchivo}${esc(n)}${A.archivos[n].soloLectura ? I('lock', 'candado') : ''}</button>`).join('');
    if (tienePeticiones(paso)) h += `<span class="separa"></span><button data-n="${HTTP}" class="http" title="Prueba tu API como en Thunder Client">${I('globe')} Probar la API</button>`;
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
        <p class="ayuda-api">Aquí pruebas tu API como en <b>Thunder Client</b>. Con <b>Enviar todas</b> tu aplicación arranca de verdad y recibe estas peticiones <b>en orden</b> (lo que crea un POST lo ve el GET de después). Con el botón de enviar de una fila mandas solo esa.</p>
        ${filas.map((f, i) => `
          <div class="pet" data-i="${i}">
            <select class="select pet-metodo m-${f.metodo}" aria-label="Método">${METODOS.map(m => `<option ${m === f.metodo ? 'selected' : ''}>${m}</option>`).join('')}</select>
            <input class="input pet-ruta" value="${esc(f.ruta)}" placeholder="/api/ruta?param=valor" spellcheck="false" aria-label="Ruta">
            <button class="btn pet-enviar" data-variant="outline" data-size="icon-sm" title="Enviar solo esta petición" aria-label="Enviar">${I('send')}</button>
            <button class="btn pet-quitar" data-variant="ghost" data-size="icon-sm" title="Quitar" aria-label="Quitar">${I('x')}</button>
            ${f.metodo === 'POST' || f.metodo === 'PUT' ? `<textarea class="textarea pet-cuerpo" rows="2" spellcheck="false" placeholder="Cuerpo, por ejemplo: ${esc(ejemploCuerpo)}">${esc(f.cuerpo)}</textarea>` : ''}
          </div>`).join('')}
        <div class="acciones"><button class="btn" data-variant="outline" data-size="sm" id="pet-agregar">${I('plus')} Agregar petición</button><span class="espacio"></span><button class="btn" data-size="sm" id="pet-todas">${I('play')} Enviar todas</button></div>`;
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
      marcarGuardado('Guardado');
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
    let h = aviso('mal', 'circle-x', 'Tu código no compila, así que todavía no se puede ejecutar. Corrige el primer error y vuelve a intentar.');
    h += errores.slice(0, 6).map(e => {
      const es = traducir(e.mensaje);
      const caret = e.codigo && e.columna ? '\n' + ' '.repeat(Math.max(0, e.columna - 1)) + '^' : '';
      return `<div class="error-comp"><div class="donde">${enlace(e.archivo, e.linea)}</div>
        <div class="real">${esc(limpiar(e.mensaje))}</div>
        ${e.codigo ? '<pre>' + esc(e.codigo + caret) + '</pre>' : ''}
        ${es ? '<div class="es">' + I('lightbulb') + '<span>' + esc(es) + '</span></div>' : ''}</div>`;
    }).join('');
    if (errores.length > 6) h += `<p class="vacio">… y ${errores.length - 6} errores más (muchas veces se arreglan solos al corregir el primero).</p>`;
    return h;
  }

  /** Aviso con icono. `html` ya viene escapado o es HTML propio. */
  function aviso(tipo, icono, html, estilo) {
    return `<div class="aviso ${tipo}"${estilo ? ' style="' + estilo + '"' : ''}>${I(icono)}<div>${html}</div></div>`;
  }

  function formatoCuerpo(c) {
    const t = String(c || '');
    if (/^\s*[[{]/.test(t)) { try { return JSON.stringify(JSON.parse(t), null, 2); } catch (e) { /* no es JSON */ } }
    return t;
  }

  function htmlHttp(x) {
    const fallo = /no pudo|FAILED|no pudo arrancar|no pudo desplegar/i.test(x.arranque || '');
    let h = `<div class="arranque ${fallo ? 'mal' : ''}">${fallo ? '' : I('circle-check')}<span>${esc(x.arranque || '')}</span></div>`;
    for (const r of x.respuestas || []) {
      const st = r.status ? String(r.status)[0] : '0';
      h += `<div class="http-resp"><div class="linea"><span class="metodo">${esc(r.metodo)}</span><span>${esc(r.ruta)}</span>
        ${r.status ? `<span class="st st${st}">${r.status}</span>` : ''}<span class="tipo">${esc(r.contentType || '')}</span></div>`;
      if (r.enviado) h += `<pre class="enviado">Enviado: ${esc(r.enviado)}</pre>`;
      if (r.error) h += `<div class="exc">${esc(r.error)}</div>`;
      else h += `<pre>${r.cuerpo ? esc(formatoCuerpo(r.cuerpo)) : '<span class="enviado">(sin cuerpo)</span>'}</pre>`;
      if (r.excepcion) h += `<div class="exc">Tu código lanzó: ${esc(limpiar(r.excepcion))}</div>`;
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
      h = aviso('mal', 'cloud-off', 'No se pudo evaluar: ' + esc(res.errorInterno)) + '<p class="vacio">Tu código está guardado. Vuelve a intentarlo en un momento.</p>';
    } else if (res.blancos) {
      const lista = res.blancos.map(b => `<li>${enlace(b.archivo, b.linea)}</li>`).join('');
      h = aviso('info', 'pencil-line', 'Aún tienes espacios <code>____</code> por completar. Reemplaza cada <code>____</code> por el código correcto:') + `<ul>${lista}</ul>`;
    } else if (res.tiempoAgotado) {
      h = aviso('mal', 'clock', esc(res.mensaje));
    } else if (res.peticionesInvalidas) {
      h = aviso('mal', 'triangle-alert', `Revisa la pestaña <b>Probar la API</b>: no entendí estas líneas.`) + `<pre class="consola">${esc(res.peticionesInvalidas.join('\n'))}</pre>
        <p class="vacio">Formato: <code>GET /api/ruta</code> o <code>POST /api/ruta {"campo": "valor"}</code>, una por línea.</p>`;
    } else if (res.errores && res.errores.length) {
      h = res.errores.some(e => e.seguridad)
        ? aviso('mal', 'ban', esc(res.errores[0].mensaje)) + `<div class="error-comp"><div class="donde">${enlace(res.errores[0].archivo, res.errores[0].linea)}</div><pre>${esc(res.errores[0].codigo || '')}</pre></div>`
        : htmlErrores(res.errores);
    } else if (modo === 'comprobar') {
      const rs = res.pruebas || [];
      const ok = rs.filter(r => r.ok).length;
      h += ok === rs.length && rs.length
        ? aviso('ok', 'trophy', `¡Muy bien! Pasaste las ${rs.length} pruebas de este paso.${estado.paso < A.pasos.length - 1 ? ' Continúa con <b>Siguiente</b>.' : ' Ve a <b>Nota</b> para calificar.'}`)
        : aviso('mal', 'circle-x', `Vas <b>${ok} de ${rs.length}</b>. Lee el mensaje de la primera prueba que falla, corrige y vuelve a comprobar.`);
      h += rs.map(r => `<div class="prueba ${r.ok ? 'ok' : 'mal'}"><span class="icono">${r.ok ? I('circle-check') : I('circle-x')}</span><div><div class="nombre">${esc(r.nombre)}</div>
        ${r.ok ? '' : '<pre class="msg">' + esc(limpiar(r.mensaje || '')) + '</pre>'}
        ${r.salida ? '<details class="plegable"><summary>Lo que imprimió tu código en esta prueba</summary><pre class="consola">' + esc(r.salida) + '</pre></details>' : ''}</div></div>`).join('');
      if (res.ms) h += `<p class="vacio pie-resultado">Evaluado en el servidor en ${(res.ms / 1000).toFixed(1)} s.</p>`;
    } else {
      // Ejecutar
      if (res.js != null) {
        preview = vistaPrevia(res.js);
        h += '<div class="etiqueta" style="margin-top:0">Tu app funcionando (puedes usarla):</div>';
      } else if (res.http) {
        h += `<p class="vacio" style="margin:0 0 8px">Estas peticiones se enviaron a tu app. Cámbialas o agrega otras en la pestaña <a href="#" id="ir-api">Probar la API</a>.</p>`;
        h += htmlHttp(res.http);
        if (res.consola && res.consola.trim()) {
          const fallo = /FAILED|Exception/.test(res.http.arranque || '');
          h += `<details class="plegable" ${fallo ? 'open' : ''}><summary>Consola del servidor (logs de ${A.id === 'spring-boot' ? 'Spring Boot' : 'Tomcat'})</summary><pre class="consola">${esc(res.consola)}</pre></details>`;
        }
      } else {
        if (res.programa) h += `<details class="plegable"><summary>Programa de prueba que se ejecutó (usa tus clases)</summary><pre class="consola">${esc(res.programa)}</pre></details>`;
        h += res.consola && res.consola.trim()
          ? `<div class="etiqueta">Salida (System.out):</div><pre class="consola">${esc(res.consola)}</pre>`
          : '<p class="vacio">El programa no imprimió nada.</p>';
      }
      if (res.excepcion) h += aviso('mal', 'triangle-alert', esc(limpiar(res.excepcion)), 'white-space:pre-wrap;font-family:var(--mono);font-size:12.5px');
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
    const css = `body{font:14.5px/1.5 "Segoe UI",system-ui,sans-serif;margin:14px;color:#18181b;background:#fff}
      h1,h2,h3{line-height:1.25;margin:0 0 8px} .badge{display:inline-block;padding:1px 9px;border-radius:999px;font-size:12px;font-weight:600;margin-left:6px}
      .badge-ok{background:#dcfce7;color:#15803d}.badge-mal{background:#fee2e2;color:#c81e1e}
      ul{padding-left:20px} li{margin:4px 0} button{font:inherit;font-weight:500;padding:6px 12px;border-radius:7px;border:1px solid #d4d4d8;background:#fafafa;cursor:pointer}
      button:hover{background:#f4f4f5} input{font:inherit;padding:6px 9px;margin:0 6px 6px 0;border:1px solid #d4d4d8;border-radius:7px} .error{color:#c81e1e} .vacio{color:#71717a}
      #consola{font:12px Consolas,monospace;background:#212121;color:#e4e4e7;padding:8px 10px;border-radius:7px;white-space:pre-wrap;margin-top:12px}
      #consola:empty{display:none} .falla{color:#c81e1e;font:13px Consolas,monospace;white-space:pre-wrap;background:#fef2f2;border:1px solid #fecaca;padding:9px;border-radius:7px}`;
    const pre = `
      const consola = document.getElementById('consola');
      const fmt = a => a.map(x => typeof x === 'string' ? x : (x instanceof Error ? x.message : JSON.stringify(x))).join(' ');
      console.log = (...a) => { consola.textContent += fmt(a) + '\\n'; };
      const err = console.error.bind(console);
      console.error = (...a) => { const t = typeof a[0] === 'string' && a[0].includes('%s') ? (i => a[0].replace(/%s/g, () => String(a[i++])))(1) : fmt(a); consola.textContent += 'Error: ' + t.split('\\n')[0] + '\\n'; err(...a); };
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

  // ------------------------------------------------------------------ guía de la primera vez
  // Oscurece la pantalla y resalta una sección a la vez con un globo que la explica. Sin librerías.
  const CLAVE_GUIA = 'rec2:guia:' + A.id;
  let guia = null;   // guía abierta: { pasos, i, capa, foco, globo }

  function guiaVista() { try { return localStorage.getItem(CLAVE_GUIA) === '1'; } catch (e) { return false; } }
  function marcarGuiaVista() { try { localStorage.setItem(CLAVE_GUIA, '1'); } catch (e) { /* sin almacenamiento */ } }
  const visible = el => !!(el && el.offsetWidth && el.getClientRects().length);
  const estrecho = () => window.innerWidth < 700;

  /** Las paradas de la guía. Las que apuntan a algo que no está en pantalla (por ejemplo, Probar la API) se omiten. */
  function paradasGuia() {
    const ejecutar = A.motor === 'react' ? 'Arma tu app y te la muestra funcionando, para que la pruebes como lo haría un usuario.'
      : A.pasos.some(tienePeticiones) ? 'Compila y corre tu código de verdad. En los pasos de API arranca tu aplicación y le envía peticiones.'
        : 'Compila y corre tu código de verdad y te muestra lo que imprime.';
    return [
      { titulo: 'Así funciona tu actividad', texto: `Son ${A.pasos.length} pasos. En cada uno lees un tema, completas un código y lo compruebas. Te mostramos dónde está cada cosa; toma menos de un minuto.` },
      { sel: '.explicacion', lado: 'derecha', titulo: 'Lee la explicación', texto: 'Aquí está el tema del paso, con ejemplos de código. Léela antes de escribir.' },
      { sel: '.tarea', lado: 'derecha', centrar: true, titulo: 'Tu tarea', texto: 'Este bloque dice exactamente qué tienes que hacer en el paso. Si te atascas, debajo hay pistas.' },
      { sel: '.editor-caja', lado: 'izquierda', titulo: 'Completa el código', texto: 'Reemplaza cada espacio resaltado <code class="blanco">____</code> por el código correcto. Si el paso tiene varios archivos, cámbialos con las pestañas de arriba.' },
      { sel: '#ejecutar', lado: 'arriba', titulo: 'Ejecutar', texto: ejecutar },
      { sel: '#comprobar', lado: 'arriba', titulo: 'Comprobar', texto: 'Corre las pruebas automáticas del paso y te dice cuáles pasan y cuáles fallan. También funciona con <kbd class="kbd">Ctrl</kbd> + <kbd class="kbd">Enter</kbd>.' },
      { sel: '.salida', lado: 'izquierda', titulo: 'Mira el resultado', texto: 'Aquí aparece lo que hizo tu código o el resultado de las pruebas. Si algo falla, el mensaje dice el archivo y la línea: púlsalo para ir directo.' },
      { sel: '.pestanas .http', lado: 'abajo', titulo: 'Probar la API', texto: 'En los pasos de API, esta pestaña te deja escribir las peticiones que recibe tu aplicación, como en Thunder Client.' },
      { sel: '.ruta', lado: 'abajo', titulo: 'Tus pasos', texto: estrecho()
        ? 'La ficha amarilla es el paso en el que estás: púlsala para ver todos los pasos y cuáles ya completaste. Con las flechas vas al anterior o al siguiente.'
        : 'Cada punto es un paso: se pone verde cuando pasas sus pruebas y rojo si alguna falla. La ficha amarilla es el paso en el que estás. Cuando lo completes, <b>Siguiente</b> se pone azul.' },
      { sel: '.nodo.nota', lado: 'abajo', titulo: 'Califica al final', texto: 'Cuando termines, entra a <b>Nota</b> y pulsa <b>Calificar mi actividad</b>. La nota queda registrada para tu profesor y puedes calificar varias veces.' },
      { sel: '#ver-guia', lado: 'abajo', titulo: 'Todo se guarda solo', texto: 'Tu código se guarda mientras escribes y puedes seguir en otro computador con tu documento y PIN. Para ver esta guía otra vez, pulsa este botón.' },
    ].filter(p => !p.sel || visible($(p.sel)));
  }

  function abrirGuia() {
    if (guia || !$('#trabajo')) return;
    document.querySelectorAll('.menu-pasos, .menu-usuario').forEach(m => { m.hidden = true; });
    const capa = document.createElement('div');
    capa.className = 'guia-capa';
    const foco = document.createElement('div');
    foco.className = 'guia-foco';
    const globo = document.createElement('div');
    globo.className = 'guia-globo';
    globo.setAttribute('role', 'dialog');
    globo.setAttribute('aria-modal', 'true');
    globo.setAttribute('aria-labelledby', 'guia-titulo');
    document.body.append(capa, foco, globo);
    guia = { pasos: paradasGuia(), i: 0, capa, foco, globo };
    window.addEventListener('resize', colocarGuia);
    window.addEventListener('scroll', alDesplazar, true);
    document.addEventListener('keydown', teclasGuia, true);
    mostrarParada(0);
  }

  function cerrarGuia() {
    if (!guia) return;
    marcarGuiaVista();
    guia.capa.remove(); guia.foco.remove(); guia.globo.remove();
    guia = null;
    window.removeEventListener('resize', colocarGuia);
    window.removeEventListener('scroll', alDesplazar, true);
    document.removeEventListener('keydown', teclasGuia, true);
    const ex = $('.explicacion');
    if (ex) ex.scrollTop = 0;
    if (estrecho()) window.scrollTo(0, 0); else if (editor) editor.focus();
  }

  /** Al desplazarse la página, el recuadro sigue a la sección sin animación (si no, llega tarde). */
  function alDesplazar() {
    if (!guia) return;
    guia.foco.style.transition = guia.globo.style.transition = 'none';
    colocarGuia();
  }

  /** Mientras la guía está abierta, el teclado solo la maneja a ella (no cambia de paso ni comprueba). */
  function teclasGuia(ev) {
    if (!guia) return;
    const k = ev.key;
    if ((k === 'Enter' || k === ' ') && guia.globo.contains(document.activeElement)) return;   // pulsa el botón que tiene el foco
    ev.stopPropagation();
    ev.preventDefault();
    if (k === 'Escape') cerrarGuia();
    else if (k === 'ArrowRight' && !ev.altKey) mostrarParada(guia.i + 1);
    else if (k === 'ArrowLeft' && !ev.altKey) mostrarParada(guia.i - 1);
    else if (k === 'Tab') {
      // El foco se queda dentro del globo
      const b = [...guia.globo.querySelectorAll('button')];
      const i = b.indexOf(document.activeElement);
      b[(i + (ev.shiftKey ? -1 : 1) + b.length) % b.length].focus();
    }
  }

  function mostrarParada(i) {
    if (!guia || i < 0) return;
    const { pasos, globo } = guia;
    if (i >= pasos.length) { cerrarGuia(); return; }
    guia.i = i;
    const p = pasos[i], inicio = !p.sel, ultimo = i === pasos.length - 1;
    globo.innerHTML = `
      ${inicio ? '' : `<div class="guia-cuenta">${i} de ${pasos.length - 1}</div>`}
      <h2 id="guia-titulo">${p.titulo}</h2>
      <p>${p.texto}</p>
      <div class="guia-botones">
        <button class="btn" data-variant="ghost" data-size="sm" data-guia="cerrar">${inicio ? 'Ahora no' : 'Saltar guía'}</button>
        <span class="espacio"></span>
        ${i > 1 ? '<button class="btn" data-variant="outline" data-size="sm" data-guia="atras">Atrás</button>' : ''}
        <button class="btn" data-size="sm" data-guia="seguir">${inicio ? 'Ver la guía' : ultimo ? 'Empezar a trabajar' : 'Siguiente'}</button>
      </div>`;
    globo.querySelectorAll('[data-guia]').forEach(b => b.onclick = () => {
      const a = b.dataset.guia;
      if (a === 'cerrar') cerrarGuia(); else mostrarParada(guia.i + (a === 'atras' ? -1 : 1));
    });
    const el = p.sel && $(p.sel);
    const barra = $('.barra');
    if (el && estrecho()) {
      // En celular la barra queda fija arriba: la sección se lleva justo debajo de ella
      if (!barra.contains(el)) window.scrollBy({ top: el.getBoundingClientRect().top - barra.offsetHeight - 12, behavior: 'instant' });
    } else if (el) el.scrollIntoView({ block: p.centrar ? 'center' : 'nearest', behavior: 'instant' });
    guia.foco.style.transition = globo.style.transition = '';
    colocarGuia();
    globo.querySelector('[data-guia="seguir"]').focus({ preventScroll: true });
  }

  /** Pone el recuadro sobre la sección y el globo al lado que quepa (en celular, abajo de la pantalla). */
  function colocarGuia() {
    if (!guia) return;
    const p = guia.pasos[guia.i], el = p.sel && $(p.sel);
    const { foco, globo, capa } = guia;
    const W = window.innerWidth, H = window.innerHeight, m = 12;
    const gw = globo.offsetWidth, gh = globo.offsetHeight;
    capa.classList.toggle('sombra', !el);
    foco.hidden = !el;
    if (!el) {
      globo.style.left = Math.max(m, (W - gw) / 2) + 'px';
      globo.style.top = Math.max(m, (H - gh) / 2) + 'px';
      return;
    }
    const r = el.getBoundingClientRect(), pad = 6;
    const f = { top: Math.max(4, r.top - pad), left: Math.max(4, r.left - pad), right: Math.min(W - 4, r.right + pad), bottom: Math.min(H - 4, r.bottom + pad) };
    Object.assign(foco.style, { top: f.top + 'px', left: f.left + 'px', width: Math.max(0, f.right - f.left) + 'px', height: Math.max(0, f.bottom - f.top) + 'px' });
    let pos = null;
    if (estrecho()) pos = { top: H - gh - m, left: Math.max(m, (W - gw) / 2) };
    else {
      const cx = (f.left + f.right - gw) / 2, cy = (f.top + f.bottom - gh) / 2;
      const opciones = { abajo: { top: f.bottom + m, left: cx }, arriba: { top: f.top - m - gh, left: cx }, derecha: { top: cy, left: f.right + m }, izquierda: { top: cy, left: f.left - m - gw } };
      const cabe = o => o.top >= m && o.left >= m && o.top + gh <= H - m && o.left + gw <= W - m;
      for (const lado of [p.lado, 'abajo', 'arriba', 'derecha', 'izquierda']) {
        const o = Object.assign({}, opciones[lado]);
        // Se corre a lo largo del lado elegido para que no se salga de la pantalla
        if (lado === 'abajo' || lado === 'arriba') o.left = limitar(o.left, m, W - gw - m); else o.top = limitar(o.top, m, H - gh - m);
        if (cabe(o)) { pos = o; break; }
      }
      if (!pos) pos = { top: H - gh - m, left: W - gw - m };
    }
    globo.style.top = pos.top + 'px';
    globo.style.left = pos.left + 'px';
  }

  // ------------------------------------------------------------------ entrega y nota
  function vistaEntrega() {
    pasoActual = null;
    const filas = A.pasos.map((p, i) => {
      const r = estado.res[p.id];
      const st = !r ? `<span class="estado-paso nada">${I('circle-dashed')} Sin comprobar</span>`
        : r.ok === r.total ? `<span class="estado-paso ok">${I('circle-check')} Completo</span>`
          : `<span class="estado-paso medio">${I('circle-x')} ${r.ok} de ${r.total}</span>`;
      return `<tr><td>${i + 1}. ${esc(p.titulo)}</td><td>${st}</td></tr>`;
    }).join('');
    $('#vista').innerHTML = `
      <div class="entrega">
        <div class="card">
          <header><h2>${I('flag')} Calificar y ver la nota</h2>
            <p>El servidor compila y ejecuta <b>todas</b> las pruebas sobre tu código actual. Cada paso vale lo mismo. La nota va de <b>0.0 a 5.0</b> y se aprueba con <b>3.0</b>.</p></header>
          <section>
            <div class="marco-tabla"><table class="tabla"><tr><th>Paso</th><th>Tu última comprobación</th></tr>${filas}</table></div>
            <p>Puedes calificar varias veces. <b>Tu profesor ve todas tus notas</b> (la última y la mejor) directamente en el sistema: no tienes que enviarle nada.</p>
          </section>
          <footer class="acciones"><button class="btn" data-size="lg" id="calificar">${I('calculator')} Calificar mi actividad</button>
            <span class="estado-carga oculto" id="cargando"><span class="girando"></span><span id="cargando-txt"></span></span></footer>
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
      $('#resultado-final').innerHTML = aviso('mal', 'cloud-off', 'No se pudo calificar: ' + esc(e.message));
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
        <td style="white-space:nowrap">${d.ok} / ${d.total}</td><td style="white-space:nowrap">${(5 / A.pasos.length * (d.total ? d.ok / d.total : 0)).toFixed(2)} / ${(5 / A.pasos.length).toFixed(2)}</td></tr>`;
    }).join('');
    $('#resultado-final').innerHTML = `
      <div class="card">
        <section>
          <div class="nota-grande">
            <div><div class="suave" style="font-size:13px">Tu nota</div><div class="valor ${aprueba ? 'aprueba' : 'pierde'}">${n.nota.toFixed(1)}<small> / 5.0</small></div></div>
            <div style="flex:1;min-width:240px"><div class="titulo-nota">${aprueba ? I('trophy') + ' ¡Aprobaste la recuperación!' : 'Aún no alcanzas 3.0'}</div>
              <div class="quien-nota"><span>${esc(estudiante.nombre)}</span><span>Documento ${esc(estudiante.doc)}</span><span>${fecha(n.fecha || Date.now())}</span></div>
              <div class="registrada">${I('circle-check')}<span>Esta nota quedó registrada para tu profesor.${aprueba ? '' : ' Puedes volver a los pasos incompletos, corregir y calificar de nuevo.'}</span></div></div>
          </div>
        </section>
        <section><div class="marco-tabla"><table class="tabla"><tr><th>Paso</th><th>Pruebas</th><th>Aporte a la nota</th></tr>${filas}</table></div></section>
      </div>`;
  }

  function pintarHistorial() {
    const h = $('#historial');
    if (!h || !entregas.length) return;
    h.innerHTML = `<div class="card"><header><h3 style="display:flex;align-items:center;gap:8px">${I('history')} Tus calificaciones registradas</h3></header>
      <section><div class="marco-tabla"><table class="tabla"><tr><th>Fecha</th><th>Nota</th></tr>${entregas.slice(0, 10).map(e => `<tr><td>${fecha(e.creado)}</td><td><b class="${e.nota >= 3 ? 'estado-paso ok' : 'estado-paso medio'}">${Number(e.nota).toFixed(1)}</b></td></tr>`).join('')}</table></div></section></div>`;
  }

  window.addEventListener('DOMContentLoaded', iniciar);
})();
