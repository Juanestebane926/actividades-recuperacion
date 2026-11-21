/* Panel del docente: avance, notas y código de cada estudiante. */
(function () {
  'use strict';
  const $ = (s, r) => (r || document).querySelector(s);
  const esc = t => String(t == null ? '' : t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const app = $('#app');
  const I = (n, c) => (window.Icono ? window.Icono(n, c) : '');
  let datos = null;
  let filtro = { texto: '', act: '', estado: '' };
  let orden = { col: 'nombre', asc: true };

  const API = (window.API_URL || '').replace(/\/$/, '');
  let token = null;
  try { token = sessionStorage.getItem('rec2:docente'); } catch (e) { }
  async function api(metodo, url, cuerpo) {
    const h = { 'Content-Type': 'application/json' };
    if (token) h['X-Docente'] = token;
    const r = await fetch(API + url, { method: metodo, headers: h, body: cuerpo ? JSON.stringify(cuerpo) : undefined });
    let d = {};
    try { d = await r.json(); } catch (e) { }
    if (!r.ok) { const e = new Error(d.error || 'Error ' + r.status); e.status = r.status; throw e; }
    return d;
  }
  const fecha = t => t ? new Date(t).toLocaleString('es-CO', { dateStyle: 'short', timeStyle: 'short' }) : '—';
  const nota = n => n == null ? '<span style="color:var(--suave)">—</span>' : `<span class="nota ${n >= 3 ? 'ap' : 'rep'}">${Number(n).toFixed(1)}</span>`;

  function login(error) {
    app.innerHTML = `<div class="portada angosta">
      <div class="card">
        <header><span class="eyebrow">${I('key-round')} Acceso restringido</span><h2 style="font-size:20px;font-weight:700;margin-top:6px">Panel docente</h2>
          <p>Notas, avance y código de los estudiantes en las actividades de recuperación.</p></header>
        <section>
          <form id="f" class="form">
            <div class="field"><label for="clave">Clave del panel</label><input class="input" id="clave" type="password" autocomplete="current-password" required><small>Es la variable <code>DOCENTE_CLAVE</code> del servidor.</small></div>
            <div class="aviso mal ${error ? '' : 'oculto'}" id="err">${I('circle-x')}<div>${esc(error || '')}</div></div>
            <button class="btn" type="submit" style="width:100%">Entrar ${I('arrow-right')}</button>
          </form>
        </section>
      </div>
      <p class="pie"><a href="../">${I('arrow-left')} Volver a las actividades</a></p></div>`;
    $('#f').onsubmit = async ev => {
      ev.preventDefault();
      try {
        const d = await api('POST', '/api/docente/entrar', { clave: $('#clave').value });
        token = d.token;
        try { sessionStorage.setItem('rec2:docente', token); } catch (e) { }
        cargar();
      }
      catch (e) { login(e.message); }
    };
  }

  async function cargar() {
    try { datos = await api('GET', '/api/docente/estudiantes'); }
    catch (e) { if (e.status === 401) return login(); app.innerHTML = `<div class="portada angosta"><div class="aviso mal">${I('cloud-off')}<div>${esc(e.message)}</div></div></div>`; return; }
    pintar();
  }

  function pintar() {
    const acts = datos.actividades;
    const lista = datos.estudiantes.filter(e =>
      (!filtro.act || e.actividad === filtro.act) &&
      (!filtro.texto || (e.nombre + ' ' + e.doc).toLowerCase().includes(filtro.texto.toLowerCase())) &&
      (!filtro.estado || (filtro.estado === 'aprobado' ? e.ultimaNota >= 3 : filtro.estado === 'reprobado' ? e.ultimaNota != null && e.ultimaNota < 3 : e.ultimaNota == null)));
    const k = orden.col;
    lista.sort((a, b) => {
      const x = a[k] ?? -1, y = b[k] ?? -1;
      const c = typeof x === 'string' ? x.localeCompare(y, 'es') : x - y;
      return orden.asc ? c : -c;
    });
    const total = datos.estudiantes.filter(e => !filtro.act || e.actividad === filtro.act);
    const conNota = total.filter(e => e.ultimaNota != null);
    const aprob = conNota.filter(e => e.ultimaNota >= 3);
    const th = (col, t) => `<th data-col="${col}">${t}${orden.col === col ? I(orden.asc ? 'arrow-up' : 'arrow-down') : ''}</th>`;
    const tarjeta = (etq, icono, valor, color) => `<div class="card"><div class="etq">${etq}${I(icono)}</div><div class="num"${color ? ' style="color:' + color + '"' : ''}>${valor}</div></div>`;
    app.innerHTML = `<header class="barra dark simple">
        <div class="marca"><span class="baldosa icono">${I('chart-column')}</span><span class="txt">Panel docente<small>Actividades de recuperación</small></span></div>
        <span style="flex:1"></span>
        <button class="btn" data-variant="outline" data-size="sm" id="csv">${I('download')} Descargar notas (CSV)</button>
        <button class="btn" data-variant="outline" data-size="sm" id="recargar">${I('refresh-cw')} Actualizar</button>
        <button class="btn" data-variant="ghost" data-size="sm" id="salir">${I('log-out')} Salir</button></header>
      <div class="tablero">
      <div class="resumen">
        ${tarjeta('Estudiantes', 'users', total.length)}
        ${tarjeta('Con nota', 'list-checks', conNota.length)}
        ${tarjeta('Aprobados (última nota desde 3.0)', 'trophy', aprob.length, 'var(--ok)')}
        ${tarjeta('Promedio última nota', 'calculator', conNota.length ? (conNota.reduce((s, e) => s + e.ultimaNota, 0) / conNota.length).toFixed(2) : '—')}
      </div>
      <div class="filtros">
        <input class="input" id="buscar" placeholder="Buscar nombre o documento" value="${esc(filtro.texto)}" aria-label="Buscar">
        <select class="select" id="act" aria-label="Curso"><option value="">Todos los cursos</option>${acts.map(a => `<option value="${a.id}" ${filtro.act === a.id ? 'selected' : ''}>${esc(a.curso)}</option>`).join('')}</select>
        <select class="select" id="estado" aria-label="Estado"><option value="">Cualquier estado</option><option value="aprobado" ${filtro.estado === 'aprobado' ? 'selected' : ''}>Aprobados</option><option value="reprobado" ${filtro.estado === 'reprobado' ? 'selected' : ''}>Con nota &lt; 3.0</option><option value="sin" ${filtro.estado === 'sin' ? 'selected' : ''}>Sin calificar</option></select>
        <span class="cuenta">${lista.length} mostrados · clic en una fila para ver el detalle y el código</span>
      </div>
      <div class="tabla-wrap"><table class="lista">
        <tr>${th('curso', 'Curso')}${th('nombre', 'Nombre')}${th('doc', 'Documento')}<th>Pasos (pruebas que pasan)</th>${th('ultimaNota', 'Última nota')}${th('mejorNota', 'Mejor')}${th('entregas', 'Calif.')}${th('comprobaciones', 'Comprob.')}${th('ultimo', 'Última actividad')}</tr>
        ${lista.map(e => `<tr class="fila" data-id="${e.id}"><td>${esc(e.curso)}</td><td>${esc(e.nombre)}</td><td>${esc(e.doc)}</td>
          <td>${e.pasos.map((p, i) => `<span class="pp ${p ? (p[0] === p[1] ? 'ok' : 'medio') : ''}" title="Paso ${i + 1}${p ? ': ' + p[0] + '/' + p[1] : ': sin comprobar'}">${i + 1}</span>`).join('')}</td>
          <td>${nota(e.ultimaNota)}</td><td>${nota(e.mejorNota)}</td><td>${e.entregas}</td><td>${e.comprobaciones}</td><td>${fecha(e.ultimo)}</td></tr>`).join('') || '<tr><td colspan="9" style="color:var(--suave)">Todavía no hay estudiantes.</td></tr>'}
      </table></div></div>`;
    $('#buscar').oninput = e => { filtro.texto = e.target.value; const p = e.target.selectionStart; pintar(); const b = $('#buscar'); b.focus(); b.setSelectionRange(p, p); };
    $('#act').onchange = e => { filtro.act = e.target.value; pintar(); };
    $('#estado').onchange = e => { filtro.estado = e.target.value; pintar(); };
    $('#recargar').onclick = cargar;
    $('#salir').onclick = () => { token = null; try { sessionStorage.removeItem('rec2:docente'); } catch (e) { } login(); };
    $('#csv').onclick = async () => {
      const r = await fetch(API + '/api/docente/notas.csv', { headers: { 'X-Docente': token } });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(await r.blob());
      a.download = 'notas-recuperacion.csv';
      a.click();
    };
    app.querySelectorAll('th[data-col]').forEach(t => t.onclick = () => { orden = { col: t.dataset.col, asc: orden.col === t.dataset.col ? !orden.asc : true }; pintar(); });
    app.querySelectorAll('tr.fila').forEach(f => f.onclick = () => detalle(+f.dataset.id));
  }

  async function detalle(id) {
    const d = await api('GET', '/api/docente/estudiantes/' + id);
    const dlg = $('#dialogo');
    const det = $('#detalle');
    const res = d.estado.res || {};
    let archivo = d.editables[0];
    const pintarDet = () => {
      det.innerHTML = `
        <div style="display:flex;gap:10px;align-items:start;flex-wrap:wrap">
          <div style="flex:1;min-width:0"><h2>${esc(d.nombre)}</h2><div class="suave">${esc(d.curso)} · Documento ${esc(d.doc)} · inició ${fecha(d.creado)} · última actividad ${fecha(d.ultimo)}</div></div>
          <button class="btn" data-variant="ghost" data-size="icon-sm" id="cerrar" title="Cerrar" aria-label="Cerrar">${I('x')}</button></div>
        <h3>Avance por paso (última comprobación)</h3>
        <div class="marco-tabla"><table class="tabla"><tr><th>Paso</th><th>Pruebas</th></tr>${d.pasos.map((p, i) => { const r = res[p.id]; return `<tr><td>${i + 1}. ${esc(p.titulo)}</td><td>${r ? r.ok + ' / ' + r.total : '—'}</td></tr>`; }).join('')}</table></div>
        <h3>Calificaciones (${d.entregas.length})</h3>
        ${d.entregas.length ? `<div class="marco-tabla"><table class="tabla"><tr><th>Fecha</th><th>Nota</th><th>Detalle por paso</th><th></th></tr>${d.entregas.map(e => `<tr><td>${fecha(e.creado)}</td><td>${nota(e.nota)}</td>
          <td style="white-space:normal">${e.detalle.map((x, i) => `${i + 1}: ${x.ok}/${x.total}`).join(' · ')}</td><td><button class="btn" data-variant="outline" data-size="sm" data-recal="${e.id}">${I('refresh-cw')} Re-calificar esta entrega</button></td></tr>`).join('')}</table></div>` : '<p class="suave" style="margin:0">Aún no ha calificado.</p>'}
        <div id="recal"></div>
        <h3>Código actual del estudiante</h3>
        <div class="pestanas-doc">${d.editables.map(n => `<button class="btn" data-size="sm" data-variant="${n === archivo ? 'secondary' : 'ghost'}" data-f="${esc(n)}">${esc(n)}</button>`).join('')}</div>
        <pre class="codigo">${esc(d.estado.archivos[archivo] || '')}</pre>
        <div class="acciones">
          <button class="btn" data-variant="outline" id="recal-actual">${I('calculator')} Re-calificar el código actual</button>
          <button class="btn" data-variant="outline" id="pin">${I('key-round')} Restablecer PIN</button>
          <span class="espacio"></span>
          <button class="btn" data-variant="destructive" id="borrar">${I('trash-2')} <span>Borrar estudiante</span></button>
        </div>
        <p class="suave" style="font-size:13px;margin:0">Comprobaciones: ${d.intentos.filter(x => x.modo === 'comprobar').length} · Ejecuciones: ${d.intentos.filter(x => x.modo === 'ejecutar').length}</p>`;
      $('#cerrar').onclick = () => dlg.close();
      det.querySelectorAll('[data-f]').forEach(b => b.onclick = () => { archivo = b.dataset.f; pintarDet(); });
      const recal = async (entrega) => {
        $('#recal').innerHTML = '<div class="estado-carga"><span class="girando"></span> Ejecutando todas las pruebas…</div>';
        try {
          const r = await api('POST', `/api/docente/estudiantes/${id}/recalificar`, entrega ? { entrega } : {});
          $('#recal').innerHTML = `<div class="aviso ${r.nota >= 3 ? 'ok' : 'mal'}">${I('calculator')}<div>Nota recalculada ahora: <b>${r.nota.toFixed(1)}</b> (${r.detalle.map((x, i) => `${i + 1}: ${x.ok}/${x.total}`).join(' · ')})</div></div>`;
        } catch (e) { $('#recal').innerHTML = `<div class="aviso mal">${I('circle-x')}<div>${esc(e.message)}</div></div>`; }
      };
      det.querySelectorAll('[data-recal]').forEach(b => b.onclick = () => recal(+b.dataset.recal));
      $('#recal-actual').onclick = () => recal(null);
      $('#pin').onclick = async () => {
        const pin = String(Math.floor(1000 + Math.random() * 9000));
        await api('POST', `/api/docente/estudiantes/${id}/pin`, { pin });
        $('#recal').innerHTML = `<div class="aviso azul">${I('key-round')}<div>Nuevo PIN de ${esc(d.nombre)}: <b style="font-size:18px">${pin}</b>. Díselo al estudiante (con su documento ${esc(d.doc)} puede volver a entrar).</div></div>`;
      };
      $('#borrar').onclick = async () => {
        const b = $('#borrar');
        if (b.dataset.ok !== '1') { b.dataset.ok = '1'; b.innerHTML = I('triangle-alert') + ' ¿Seguro? Se borra todo su avance y sus notas. Pulsa otra vez'; return; }
        await api('DELETE', '/api/docente/estudiantes/' + id);
        dlg.close();
        cargar();
      };
    };
    pintarDet();
    if (!dlg.open) dlg.showModal();
  }

  cargar();
})();
