/*
 * Evaluador de Java en el navegador con CheerpJ (JVM en WebAssembly).
 * Compila el código del estudiante con javac (tools.jar) y corre las pruebas de assets/java/sim.jar.
 */
window.MotorJava = (function () {
  'use strict';
  const base = new URL('../assets/java/', location.href).pathname;
  const CP = '/app' + base + 'tools.jar:/app' + base + 'sim.jar';
  let inicio = null, n = 0, cola = Promise.resolve(), calentado = false;
  const enc = new TextEncoder();

  function iniciar(aviso) {
    if (!inicio) {
      inicio = (async () => {
        if (typeof cheerpjInit !== 'function') throw new Error('No cargó el motor de Java (CheerpJ). ¿Hay conexión a internet?');
        await cheerpjInit({ status: 'none', version: 8 });
      })();
      inicio.catch(() => { inicio = null; });
    }
    return inicio;
  }

  // Ejecuta en serie (CheerpJ corre un programa a la vez)
  function enCola(fn) {
    const p = cola.then(fn, fn);
    cola = p.catch(() => {});
    return p;
  }

  async function correr(curso, suites, archivos, aviso) {
    return enCola(async () => {
      if (!calentado) aviso && aviso('Preparando Java en tu navegador (solo la primera vez puede tardar 20–60 s)…');
      await iniciar(aviso);
      n++;
      const dir = '/str/r' + n + '/';
      const rutas = [];
      for (const nombre of Object.keys(archivos)) {
        cheerpjAddStringFile(dir + nombre, enc.encode(archivos[nombre]));
        rutas.push(dir + nombre);
      }
      if (aviso) aviso(calentado ? 'Compilando y ejecutando tu código…' : 'Compilando tu código (la primera compilación es la más lenta)…');
      const salida = '/files/salida' + n + '.txt';
      const t0 = performance.now();
      await cheerpjRunMain('curso.sim.Ejecutor', CP, salida, curso, suites, CP, '/files/clases' + n, ...rutas);
      calentado = true;
      let texto = '';
      try { texto = await (await cjFileBlob(salida)).text(); }
      catch (e) { throw new Error('El evaluador no produjo resultados. Recarga la página e intenta de nuevo.'); }
      const r = interpretar(texto, dir);
      r.ms = Math.round(performance.now() - t0);
      return r;
    });
  }

  function desesc(s) {
    return s.replace(/\\(\\|t|n)/g, (m, c) => (c === 'n' ? '\n' : c === 't' ? '\t' : '\\'));
  }

  function interpretar(texto, dir) {
    const r = { errores: [], resultados: [], demos: {}, interno: [] };
    texto.split('\n').forEach(l => {
      if (!l) return;
      const c = l.split('\t');
      if (c[0] === 'C') r.errores = erroresJavac(desesc(c.slice(1).join('\t')), dir);
      else if (c[0] === 'D') (r.demos[c[1]] = r.demos[c[1]] || []).push(desesc(c.slice(2).join('\t')));
      else if (c[0] === 'R') r.resultados.push({ suite: c[1], ok: c[2] === 'OK', nombre: desesc(c[3] || ''), mensaje: desesc(c[4] || '') });
      else if (c[0] === 'X') r.interno.push(desesc(c.slice(1).join('\t')));
    });
    if (r.interno.length && !r.resultados.length && !r.errores.length) throw new Error(r.interno.join('; '));
    return r;
  }

  function erroresJavac(t, dir) {
    const lineas = t.split('\n');
    const errores = [];
    let actual = null;
    const re = /^(\/str\/r\d+\/)?([^:\s]+\.java):(\d+): (?:error|warning): (.*)$/;
    lineas.forEach(l => {
      const m = l.match(re);
      if (m) { actual = { archivo: m[2], linea: +m[3], mensaje: m[4], contexto: '' }; errores.push(actual); }
      else if (actual && !/^\d+ errors?$/.test(l.trim())) actual.contexto += (actual.contexto ? '\n' : '') + l;
    });
    if (!errores.length && t.trim()) errores.push({ archivo: '', linea: 0, mensaje: t.trim(), contexto: '' });
    return errores;
  }

  function seleccion(archivos, nombres) {
    const r = {};
    nombres.forEach(x => { r[x] = archivos[x]; });
    return r;
  }

  return {
    preparar(A) {
      // Calienta la JVM y javac en segundo plano con un archivo mínimo
      correr(A.javaCurso, '-', { 'Calentar.java': 'class Calentar { }' }, null).catch(() => {});
    },
    async evaluarPaso(A, paso, archivos, modo, aviso) {
      const r = await correr(A.javaCurso, paso.id, seleccion(archivos, paso.compilar), aviso);
      return { errores: r.errores, resultados: r.resultados.filter(x => x.suite === paso.id), consola: r.demos[paso.id] || [] };
    },
    async evaluarTodo(A, pasos, archivos, aviso) {
      const salida = {};
      const todos = [...new Set(pasos.flatMap(p => p.compilar))];
      aviso && aviso('Calificando: compilando todo tu proyecto…');
      let r = await correr(A.javaCurso, pasos.map(p => p.id).join(','), seleccion(archivos, todos), aviso);
      if (!r.errores.length) {
        pasos.forEach(p => { salida[p.id] = { resultados: r.resultados.filter(x => x.suite === p.id) }; });
        return salida;
      }
      // Hay errores de compilación: se califica cada paso por separado para no perder los pasos que sí compilan
      for (let i = 0; i < pasos.length; i++) {
        const p = pasos[i];
        aviso && aviso('Hay errores de compilación; calificando paso por paso (' + (i + 1) + '/' + pasos.length + ')…');
        const rp = await correr(A.javaCurso, p.id, seleccion(archivos, p.compilar), aviso);
        salida[p.id] = rp.errores.length
          ? { resultados: [], error: 'No compila: ' + rp.errores[0].archivo + ' línea ' + rp.errores[0].linea }
          : { resultados: rp.resultados.filter(x => x.suite === p.id) };
      }
      return salida;
    }
  };
})();
