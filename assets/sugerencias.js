/*
 * Autocompletado del editor (CodeMirror show-hint), como en el IDE:
 *  - Java: anotaciones y clases de Spring / Servlets / java.util / del propio proyecto, y al elegir
 *    una que no está importada se agrega el import automáticamente. Después de un "." sugiere
 *    métodos comunes y los métodos de las clases del proyecto.
 *  - React: hooks (agrega el import de 'react'), componentes de los otros archivos (agrega el
 *    import './Archivo'), etiquetas JSX, props y palabras del proyecto.
 * Las sugerencias aparecen solas al escribir; Ctrl+Espacio las abre a mano.
 */
window.Sugerencias = (function () {
  'use strict';

  const CLASES_JAVA = {
    'spring-boot': {
      RestController: 'org.springframework.web.bind.annotation', RequestMapping: 'org.springframework.web.bind.annotation',
      GetMapping: 'org.springframework.web.bind.annotation', PostMapping: 'org.springframework.web.bind.annotation',
      PutMapping: 'org.springframework.web.bind.annotation', DeleteMapping: 'org.springframework.web.bind.annotation',
      PathVariable: 'org.springframework.web.bind.annotation', RequestParam: 'org.springframework.web.bind.annotation',
      RequestBody: 'org.springframework.web.bind.annotation', ResponseEntity: 'org.springframework.http', HttpStatus: 'org.springframework.http',
      Service: 'org.springframework.stereotype', Component: 'org.springframework.stereotype', Repository: 'org.springframework.stereotype',
      Autowired: 'org.springframework.beans.factory.annotation',
    },
    'java-web': {
      WebServlet: 'javax.servlet.annotation', HttpServlet: 'javax.servlet.http', HttpServletRequest: 'javax.servlet.http',
      HttpServletResponse: 'javax.servlet.http', ServletException: 'javax.servlet', IOException: 'java.io', PrintWriter: 'java.io',
    },
    comun: { List: 'java.util', ArrayList: 'java.util', Map: 'java.util', HashMap: 'java.util', Arrays: 'java.util', Optional: 'java.util' },
  };
  const ANOTACIONES = ['Override', 'RestController', 'RequestMapping', 'GetMapping', 'PostMapping', 'PutMapping', 'DeleteMapping', 'PathVariable',
    'RequestParam', 'RequestBody', 'Service', 'Component', 'Repository', 'Autowired', 'WebServlet'];
  const PALABRAS_JAVA = ['public', 'private', 'protected', 'static', 'final', 'class', 'void', 'return', 'new', 'if', 'else', 'for', 'while',
    'try', 'catch', 'throws', 'throw', 'this', 'null', 'true', 'false', 'String', 'int', 'double', 'long', 'boolean', 'Long', 'Integer',
    'Double', 'Boolean', 'StringBuilder', 'Math', 'System', 'Integer.parseInt', 'Double.parseDouble', 'System.out.println', 'NumberFormatException'];
  const MIEMBROS_JAVA = [
    ['add(', 'lista.add(x): agrega al final'], ['get(', 'lista.get(i)'], ['size()', 'cantidad de elementos'], ['isEmpty()', 'true si está vacío'],
    ['remove(', 'quita un elemento'], ['contains(', '¿contiene…?'], ['equals(', 'compara objetos (String, Long…)'], ['equalsIgnoreCase(', 'compara textos sin importar mayúsculas'],
    ['trim()', 'quita espacios al inicio y al final'], ['toLowerCase()', 'a minúsculas'], ['toUpperCase()', 'a mayúsculas'], ['length', 'tamaño de un arreglo / length() de un String'],
    ['append(', 'StringBuilder: agrega texto'], ['toString()', 'convierte a texto'], ['println(', 'imprime con salto de línea'], ['print(', 'imprime'],
    ['getParameter(', 'request: lee un parámetro'], ['setStatus(', 'response: código HTTP'], ['setContentType(', 'response: tipo de contenido'],
    ['setCharacterEncoding(', 'response: codificación'], ['getWriter()', 'response: PrintWriter para escribir'],
    ['ok(', 'ResponseEntity 200'], ['notFound()', 'ResponseEntity 404'], ['badRequest()', 'ResponseEntity 400'], ['noContent()', 'ResponseEntity 204'],
    ['status(', 'ResponseEntity con un estado'], ['body(', 'cuerpo de la respuesta'], ['build()', 'construye la respuesta sin cuerpo'],
    ['CREATED', 'HttpStatus 201'], ['OK', 'HttpStatus 200'], ['NOT_FOUND', 'HttpStatus 404'], ['BAD_REQUEST', 'HttpStatus 400'],
    ['SC_OK', 'HttpServletResponse 200'], ['SC_CREATED', 'HttpServletResponse 201'], ['SC_BAD_REQUEST', 'HttpServletResponse 400'], ['SC_NOT_FOUND', 'HttpServletResponse 404'],
    ['parseInt(', 'Integer.parseInt: texto a int'], ['parseDouble(', 'Double.parseDouble: texto a double'], ['out', 'System.out'],
  ];

  const HOOKS = ['useState', 'useEffect', 'useRef', 'useMemo'];
  const PALABRAS_REACT = ['const', 'let', 'return', 'function', 'export', 'import', 'true', 'false', 'null', 'map', 'filter', 'length',
    'className', 'onClick', 'onChange', 'onSubmit', 'preventDefault', 'value', 'target', 'key', 'console.log', 'document.title', 'Number',
    'trim', 'push', 'div', 'span', 'p', 'h1', 'h2', 'ul', 'li', 'button', 'input', 'form', 'placeholder', 'type'];
  const MIEMBROS_JS = [['map(', 'transforma cada elemento'], ['filter(', 'deja los que cumplen'], ['length', 'cantidad'], ['trim()', 'quita espacios'],
    ['preventDefault()', 'evita recargar la página'], ['target', 'el input que cambió'], ['value', 'texto del input'], ['log(', 'console.log'],
    ['title', 'document.title'], ['includes(', '¿contiene?'], ['toFixed(', 'redondea'], ['nombre', ''], ['nota', ''], ['id', '']];

  let ctx = null; // { A, archivos: () => estado.archivos, actual: () => nombreArchivo }

  function palabrasProyecto() {
    const s = new Set();
    for (const src of Object.values(ctx.archivos())) (String(src).match(/[A-Za-z_][\w]{2,}/g) || []).forEach(w => s.add(w));
    return [...s];
  }

  function clasesProyecto() {
    const r = {};
    for (const [n, src] of Object.entries(ctx.archivos())) {
      const pkg = (String(src).match(/^\s*package\s+([\w.]+)\s*;/m) || [])[1];
      const k = (String(src).match(/\b(?:class|interface|enum|record)\s+(\w+)/) || [])[1];
      if (pkg && k) r[k] = pkg;
    }
    return r;
  }

  function metodosProyecto() {
    const s = new Set();
    for (const src of Object.values(ctx.archivos())) {
      const re = /public\s+(?:static\s+)?[\w<>\[\],\s]+?\s+(\w+)\s*\(/g; let m;
      while ((m = re.exec(src))) if (!/^(if|for|while|switch|catch)$/.test(m[1])) s.add(m[1] + '(');
    }
    return [...s];
  }

  // ---------------------------------------------------------------- imports automáticos
  function agregarImportJava(cm, clase, pkg) {
    const src = cm.getValue();
    const propio = (src.match(/^\s*package\s+([\w.]+)\s*;/m) || [])[1];
    if (!pkg || pkg === propio || pkg === 'java.lang') return;
    if (new RegExp('^\\s*import\\s+' + pkg.replace(/\./g, '\\.') + '\\.(' + clase + '|\\*)\\s*;', 'm').test(src)) return;
    const lineas = src.split('\n');
    let donde = -1;
    lineas.forEach((l, i) => { if (/^\s*import\s/.test(l)) donde = i; });
    if (donde < 0) lineas.forEach((l, i) => { if (donde < 0 && /^\s*package\s/.test(l)) donde = i; });
    const texto = 'import ' + pkg + '.' + clase + ';';
    if (donde < 0) cm.replaceRange(texto + '\n\n', { line: 0, ch: 0 });
    else cm.replaceRange('\n' + texto + (/^\s*package\s/.test(lineas[donde]) ? '\n' : ''), { line: donde, ch: lineas[donde].length });
  }

  function agregarImportReact(cm, nombre, desde, porDefecto) {
    const src = cm.getValue();
    const lineas = src.split('\n');
    const reExiste = new RegExp("^\\s*import\\s+(.*)\\s+from\\s+['\"]" + desde.replace(/[./]/g, m => '\\' + m) + "['\"]");
    for (let i = 0; i < lineas.length; i++) {
      const m = lineas[i].match(reExiste);
      if (!m) continue;
      if (new RegExp('\\b' + nombre + '\\b').test(m[1])) return;
      if (!porDefecto && /\{[^}]*\}/.test(m[1])) {
        const nueva = lineas[i].replace(/\{([^}]*)\}/, (x, dentro) => '{ ' + dentro.trim().replace(/,\s*$/, '') + ', ' + nombre + ' }');
        cm.replaceRange(nueva, { line: i, ch: 0 }, { line: i, ch: lineas[i].length });
        return;
      }
    }
    let donde = -1;
    lineas.forEach((l, i) => { if (/^\s*import\s/.test(l)) donde = i; });
    const texto = porDefecto ? `import ${nombre} from '${desde}';` : `import { ${nombre} } from '${desde}';`;
    if (donde < 0) cm.replaceRange(texto + '\n', { line: 0, ch: 0 });
    else cm.replaceRange('\n' + texto, { line: donde, ch: lineas[donde].length });
  }

  function componentesProyecto() {
    const r = [];
    const actual = ctx.actual();
    for (const [n, src] of Object.entries(ctx.archivos())) {
      if (n === actual) continue;
      const base = n.replace(/\.jsx?$/, '');
      const re = /export\s+(default\s+)?function\s+([A-Z]\w*)/g; let m;
      while ((m = re.exec(src))) r.push({ nombre: m[2], desde: './' + base, porDefecto: !!m[1] });
    }
    return r;
  }

  // ---------------------------------------------------------------- proveedor de sugerencias
  function item(texto, detalle, alElegir, clase) {
    return {
      text: texto, displayText: texto, className: 'sug-' + (clase || 'palabra'),
      render(el) {
        el.innerHTML = '';
        const a = document.createElement('span'); a.className = 'sug-texto'; a.textContent = texto; el.appendChild(a);
        if (detalle) { const b = document.createElement('span'); b.className = 'sug-detalle'; b.textContent = detalle; el.appendChild(b); }
      },
      hint(cm, data, c) {
        cm.replaceRange(c.text, data.from, data.to, 'complete');
        if (alElegir) alElegir(cm);
      }
    };
  }

  function filtrar(lista, prefijo) {
    const p = prefijo.toLowerCase();
    const empieza = lista.filter(x => x.text.toLowerCase().startsWith(p) && x.text !== prefijo);
    const contiene = lista.filter(x => !x.text.toLowerCase().startsWith(p) && x.text.toLowerCase().includes(p) && p.length >= 2);
    return empieza.concat(contiene).slice(0, 40);
  }

  function sugerir(cm) {
    const cur = cm.getCursor();
    const linea = cm.getLine(cur.line).slice(0, cur.ch);
    const m = linea.match(/(@?)([\w]*)$/);
    const arroba = m[1] === '@';
    const prefijo = m[2];
    const from = { line: cur.line, ch: cur.ch - prefijo.length - (arroba ? 1 : 0) };
    const tras = linea.slice(0, cur.ch - prefijo.length - (arroba ? 1 : 0));
    const despuesDePunto = /\.\s*$/.test(tras);
    const enComentario = /\/\/|^\s*\*|\/\*/.test(linea) && !/\{\/\*/.test(linea);
    if (enComentario) return null;
    let lista = [];
    const vistos = new Set();
    const agregar = it => { if (!vistos.has(it.text)) { vistos.add(it.text); lista.push(it); } };

    if (ctx.A.motor === 'java') {
      const clases = Object.assign({}, CLASES_JAVA.comun, CLASES_JAVA[ctx.A.id] || {}, clasesProyecto());
      if (arroba) {
        ANOTACIONES.filter(a => a === 'Override' || clases[a]).forEach(a => agregar(item('@' + a, clases[a] ? 'import ' + clases[a] : '', cm2 => clases[a] && agregarImportJava(cm2, a, clases[a]), 'anotacion')));
        return { list: filtrar(lista, '@' + prefijo), from, to: cur };
      }
      if (despuesDePunto) {
        MIEMBROS_JAVA.forEach(([t, d]) => agregar(item(t, d, null, 'metodo')));
        metodosProyecto().forEach(t => agregar(item(t, 'de tu proyecto', null, 'metodo')));
      } else {
        Object.entries(clases).forEach(([k, pkg]) => agregar(item(k, 'import ' + pkg, cm2 => agregarImportJava(cm2, k, pkg), 'clase')));
        PALABRAS_JAVA.forEach(w => agregar(item(w, '', null, 'clave')));
      }
    } else {
      if (!despuesDePunto) {
        HOOKS.forEach(h => agregar(item(h, "import de 'react'", cm2 => agregarImportReact(cm2, h, 'react', false), 'clase')));
        componentesProyecto().forEach(c => agregar(item(c.nombre, 'import ' + c.desde, cm2 => agregarImportReact(cm2, c.nombre, c.desde, c.porDefecto), 'clase')));
        PALABRAS_REACT.forEach(w => agregar(item(w, '', null, 'clave')));
      } else {
        MIEMBROS_JS.forEach(([t, d]) => agregar(item(t, d, null, 'metodo')));
      }
    }
    if (prefijo.length < 1 && !despuesDePunto) return null;
    palabrasProyecto().forEach(w => agregar(item(w, '', null, 'palabra')));
    const r = filtrar(lista, prefijo);
    if (!r.length) return null;
    return { list: r, from: despuesDePunto ? { line: cur.line, ch: cur.ch - prefijo.length } : from, to: cur };
  }

  function activar(cm, contexto) {
    ctx = contexto;
    if (!cm.showHint) return; // el complemento no cargó: el editor sigue funcionando sin sugerencias
    const abrir = () => cm.showHint({ hint: sugerir, completeSingle: false, closeCharacters: /[\s()\[\]{};:>,=]/ });
    cm.addKeyMap({ 'Ctrl-Space': abrir });
    cm.on('inputRead', (c, ch) => {
      if (ch.origin !== '+input' || c.state.completionActive) return;
      const t = ch.text.join('');
      if (/^[\w@.]$/.test(t)) abrir();
    });
  }

  return { activar };
})();
