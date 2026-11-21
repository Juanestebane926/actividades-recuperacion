/*
 * Autocompletado del editor (CodeMirror show-hint), como en el IDE:
 *  - Java: anotaciones y clases de Spring / Servlets / java.util / del propio proyecto, y al elegir
 *    una que no está importada se agrega el import automáticamente. Después de un "." averigua el tipo
 *    de lo que va antes (variable, atributo, parámetro o llamada encadenada) y sugiere solo sus miembros,
 *    con parámetros y tipo de retorno, como un IDE.
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

  const HOOKS = ['useState', 'useEffect', 'useRef', 'useMemo'];
  const PALABRAS_REACT = ['const', 'let', 'return', 'function', 'export', 'import', 'true', 'false', 'null', 'map', 'filter', 'length',
    'className', 'onClick', 'onChange', 'onSubmit', 'preventDefault', 'value', 'target', 'key', 'console.log', 'document.title', 'Number',
    'trim', 'push', 'div', 'span', 'p', 'h1', 'h2', 'ul', 'li', 'button', 'input', 'form', 'placeholder', 'type'];

  let ctx = null; // { A, archivos: () => estado.archivos, actual: () => nombreArchivo }

  /** Palabras del código del proyecto (nombres de variables, métodos…), sin comentarios ni textos entre comillas. */
  function palabrasProyecto() {
    const s = new Set();
    for (const src of Object.values(ctx.archivos())) {
      const codigo = String(src)
        .replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/\/\/[^\n]*/g, ' ')
        .replace(/"(?:\\.|[^"\\\n])*"/g, ' ').replace(/'(?:\\.|[^'\\\n])*'/g, ' ');
      (codigo.match(/[\p{L}_$][\p{L}\p{N}_$]{2,}/gu) || []).forEach(w => { if (!/^_+$/.test(w)) s.add(w); });
    }
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

  // ---------------------------------------------------------------- miembros según el tipo (como en un IDE)
  // Después de un "." se busca de qué tipo es lo que va antes (variable, atributo, parámetro, llamada encadenada)
  // y se sugieren solo los miembros de ese tipo, con sus parámetros y lo que devuelven.

  // [nombre, parámetros (null = atributo o constante), tipo que devuelve, descripción]
  const M = (...l) => l;
  const MIEMBROS_LISTA = M(
    ['add', 'E elemento', 'boolean', 'agrega al final'], ['get', 'int i', 'E', 'elemento en la posición i'], ['size', '', 'int', 'cantidad de elementos'],
    ['isEmpty', '', 'boolean', 'true si está vacía'], ['remove', 'Object o', 'boolean', 'quita un elemento'], ['contains', 'Object o', 'boolean', '¿está en la lista?'],
    ['set', 'int i, E elemento', 'E', 'reemplaza el de la posición i'], ['indexOf', 'Object o', 'int', 'posición del elemento'], ['clear', '', 'void', 'vacía la lista'],
    ['addAll', 'Collection c', 'boolean', 'agrega todos']);
  const MIEMBROS_MAPA = M(
    ['put', 'K clave, V valor', 'V', 'guarda un valor'], ['get', 'Object clave', 'V', 'valor de esa clave'], ['containsKey', 'Object clave', 'boolean', '¿existe la clave?'],
    ['getOrDefault', 'Object clave, V porDefecto', 'V', ''], ['remove', 'Object clave', 'V', ''], ['size', '', 'int', ''], ['isEmpty', '', 'boolean', ''],
    ['keySet', '', 'Set', 'las claves'], ['values', '', 'Collection', 'los valores']);
  const OBJETO = M(['equals', 'Object otro', 'boolean', 'compara con otro objeto'], ['toString', '', 'String', 'el objeto como texto'], ['hashCode', '', 'int', '']);
  const LIB = {
    String: { m: M(
      ['length', '', 'int', 'cantidad de caracteres'], ['equals', 'Object otro', 'boolean', 'compara el texto'],
      ['equalsIgnoreCase', 'String otro', 'boolean', 'compara sin importar mayúsculas'], ['isEmpty', '', 'boolean', 'true si no tiene caracteres'],
      ['isBlank', '', 'boolean', 'vacío o solo espacios'], ['trim', '', 'String', 'quita espacios al inicio y al final'],
      ['toLowerCase', '', 'String', 'a minúsculas'], ['toUpperCase', '', 'String', 'a mayúsculas'], ['contains', 'CharSequence texto', 'boolean', '¿contiene el texto?'],
      ['startsWith', 'String inicio', 'boolean', ''], ['endsWith', 'String fin', 'boolean', ''], ['charAt', 'int i', 'char', 'carácter en la posición i'],
      ['substring', 'int desde, int hasta', 'String', ''], ['indexOf', 'String texto', 'int', ''], ['replace', 'CharSequence a, CharSequence b', 'String', ''],
      ['split', 'String separador', 'String[]', '']),
      s: M(['valueOf', 'Object x', 'String', 'convierte a texto'], ['format', 'String formato, Object... valores', 'String', '']) },
    StringBuilder: { m: M(['append', 'Object x', 'StringBuilder', 'agrega al final'], ['toString', '', 'String', 'el texto armado'], ['length', '', 'int', ''],
      ['insert', 'int i, Object x', 'StringBuilder', ''], ['setLength', 'int n', 'void', '']) },
    List: { m: MIEMBROS_LISTA }, ArrayList: { m: MIEMBROS_LISTA }, Collection: { m: MIEMBROS_LISTA },
    Map: { m: MIEMBROS_MAPA }, HashMap: { m: MIEMBROS_MAPA },
    Long: { m: M(['equals', 'Object otro', 'boolean', 'compara el valor (no uses ==)'], ['longValue', '', 'long', ''], ['intValue', '', 'int', ''], ['compareTo', 'Long otro', 'int', '']),
      s: M(['parseLong', 'String texto', 'long', 'texto a número'], ['valueOf', 'long n', 'Long', '']) },
    Integer: { m: M(['equals', 'Object otro', 'boolean', 'compara el valor (no uses ==)'], ['intValue', '', 'int', ''], ['compareTo', 'Integer otro', 'int', '']),
      s: M(['parseInt', 'String texto', 'int', 'texto a número entero'], ['valueOf', 'int n', 'Integer', ''], ['MAX_VALUE', null, 'int', ''], ['MIN_VALUE', null, 'int', '']) },
    Double: { m: M(['equals', 'Object otro', 'boolean', ''], ['doubleValue', '', 'double', ''], ['compareTo', 'Double otro', 'int', '']),
      s: M(['parseDouble', 'String texto', 'double', 'texto a número decimal'], ['valueOf', 'double n', 'Double', '']) },
    Boolean: { m: M(['booleanValue', '', 'boolean', '']), s: M(['parseBoolean', 'String texto', 'boolean', '']) },
    Math: { s: M(['round', 'double x', 'long', 'redondea'], ['max', 'double a, double b', 'double', 'el mayor'], ['min', 'double a, double b', 'double', 'el menor'],
      ['abs', 'double x', 'double', 'valor absoluto'], ['pow', 'double base, double exponente', 'double', ''], ['sqrt', 'double x', 'double', ''],
      ['floor', 'double x', 'double', ''], ['ceil', 'double x', 'double', '']) },
    System: { s: M(['out', null, 'PrintStream', 'salida estándar'], ['err', null, 'PrintStream', 'salida de errores']) },
    PrintStream: { m: M(['println', 'Object x', 'void', 'imprime con salto de línea'], ['print', 'Object x', 'void', 'imprime'], ['printf', 'String formato, Object... valores', 'PrintStream', '']) },
    PrintWriter: { m: M(['print', 'Object x', 'void', 'escribe en la respuesta'], ['println', 'Object x', 'void', 'escribe con salto de línea'], ['write', 'String texto', 'void', ''], ['flush', '', 'void', '']) },
    Arrays: { s: M(['asList', 'T... elementos', 'List', 'arreglo a lista'], ['toString', 'Object[] arreglo', 'String', ''], ['sort', 'Object[] arreglo', 'void', '']) },
    ResponseEntity: {
      s: M(['ok', 'T cuerpo', 'ResponseEntity', '200 con cuerpo'], ['notFound', '', 'HeadersBuilder', '404'], ['badRequest', '', 'BodyBuilder', '400'],
        ['noContent', '', 'HeadersBuilder', '204'], ['status', 'HttpStatus estado', 'BodyBuilder', 'cualquier estado'], ['created', 'URI ubicacion', 'BodyBuilder', '201']),
      m: M(['getStatusCode', '', 'HttpStatusCode', ''], ['getBody', '', 'T', '']) },
    BodyBuilder: { m: M(['body', 'T cuerpo', 'ResponseEntity', 'la respuesta con cuerpo'], ['build', '', 'ResponseEntity', 'la respuesta sin cuerpo'], ['header', 'String nombre, String... valores', 'BodyBuilder', '']) },
    HeadersBuilder: { m: M(['build', '', 'ResponseEntity', 'la respuesta sin cuerpo'], ['header', 'String nombre, String... valores', 'HeadersBuilder', '']) },
    HttpStatus: { s: M(['OK', null, 'HttpStatus', '200'], ['CREATED', null, 'HttpStatus', '201'], ['NO_CONTENT', null, 'HttpStatus', '204'],
      ['BAD_REQUEST', null, 'HttpStatus', '400'], ['NOT_FOUND', null, 'HttpStatus', '404'], ['INTERNAL_SERVER_ERROR', null, 'HttpStatus', '500']) },
    HttpServletRequest: { m: M(['getParameter', 'String nombre', 'String', 'lee un parámetro del formulario o la URL'], ['getMethod', '', 'String', 'GET, POST…'],
      ['getPathInfo', '', 'String', 'lo que va después de la ruta del servlet'], ['getHeader', 'String nombre', 'String', ''], ['getReader', '', 'BufferedReader', 'lee el cuerpo']) },
    HttpServletResponse: {
      m: M(['setStatus', 'int codigo', 'void', 'código HTTP de la respuesta'], ['setContentType', 'String tipo', 'void', 'tipo de contenido'],
        ['setCharacterEncoding', 'String codificacion', 'void', ''], ['getWriter', '', 'PrintWriter', 'para escribir la respuesta'], ['sendError', 'int codigo', 'void', '']),
      s: M(['SC_OK', null, 'int', '200'], ['SC_CREATED', null, 'int', '201'], ['SC_NO_CONTENT', null, 'int', '204'], ['SC_BAD_REQUEST', null, 'int', '400'], ['SC_NOT_FOUND', null, 'int', '404']) },
  };
  const PRIMITIVOS = /^(int|long|double|float|boolean|char|short|byte|void)$/;

  /** Clases del proyecto: atributos y métodos con sus tipos (leídos del código de los archivos). */
  function modeloProyecto() {
    const clases = {};
    for (const src of Object.values(ctx.archivos())) {
      const s = String(src);
      const nombre = (s.match(/\b(?:class|interface|enum|record)\s+(\w+)/) || [])[1];
      if (!nombre) continue;
      const c = { campos: {}, metodos: [] };
      const reCampo = /^\s*(?:(?:private|public|protected)\s+)(?:static\s+)?(?:final\s+)?([\w.]+(?:<[^;=()]*>)?(?:\[\])?)\s+(\w+)\s*[;=]/gm; let m;
      while ((m = reCampo.exec(s))) c.campos[m[2]] = { tipo: m[1], estatico: /static/.test(m[0]), privado: /private/.test(m[0]) };
      const reMet = /^\s*(public|private|protected)\s+(static\s+)?(?:final\s+)?([\w.]+(?:<[^()]*?>)?(?:\[\])?)\s+(\w+)\s*\(([^)]*)\)/gm;
      while ((m = reMet.exec(s))) {
        if (/^(new|return|else)$/.test(m[3])) continue;
        const params = m[5].replace(/@\w+(?:\([^)]*\))?\s*/g, '').replace(/\s+/g, ' ').trim();   // sin @PathVariable, @RequestBody…
        c.metodos.push({ nombre: m[4], params, ret: m[3], estatico: !!m[2], privado: m[1] === 'private' });
      }
      clases[nombre] = c;
    }
    return clases;
  }

  /** "List<Vacante>" → { base: 'List', args: ['Vacante'] }; "double[]" → { base: 'double', arreglo: true } */
  function leerTipo(t) {
    t = String(t || '').trim();
    if (!t) return null;
    const arreglo = /\[\]$/.test(t);
    if (arreglo) t = t.slice(0, -2);
    const m = t.match(/^([\w.]+)\s*(?:<(.*)>)?$/);
    if (!m) return null;
    const args = [];
    if (m[2]) { let prof = 0, act = ''; for (const ch of m[2]) { if (ch === '<') prof++; if (ch === '>') prof--; if (ch === ',' && !prof) { args.push(act.trim()); act = ''; } else act += ch; } if (act.trim()) args.push(act.trim()); }
    return { base: m[1].split('.').pop(), args, arreglo };
  }

  /** Tipo que devuelve un miembro, resolviendo E/K/V/T con los argumentos genéricos del receptor. */
  function tipoDevuelto(ret, receptor) {
    const r = String(ret);
    const a = receptor && receptor.args || [];
    if (r === 'E' || r === 'T') return leerTipo(a[0]);
    if (r === 'K') return leerTipo(a[0]);
    if (r === 'V') return leerTipo(a[1] || a[0]);
    return leerTipo(r);
  }

  /** Tipo declarado de una variable, buscando la última declaración antes del cursor (y después, si no hay). */
  function tipoDeVariable(nombre, antes, todo) {
    const re = new RegExp('(?:^|[\\s(,;{])((?:[A-Z][\\w.]*|int|long|double|float|boolean|char|short|byte)(?:<[^;=(){}]*>)?(?:\\[\\])?)\\s+' + nombre + '\\s*(?=[;=,):])', 'g');
    let m, ultimo = null;
    while ((m = re.exec(antes))) ultimo = m[1];
    if (!ultimo) while ((m = re.exec(todo))) { ultimo = m[1]; break; }
    return ultimo && leerTipo(ultimo);
  }

  /** Expresión antes del punto: "v.getEmpresa()" → [{n:'v'}, {n:'getEmpresa', llamada:true}] (null si no se entiende). */
  function cadenaAntesDelPunto(texto) {
    const partes = [];
    let i = texto.length - 1;
    while (i >= 0) {
      while (i >= 0 && /\s/.test(texto[i])) i--;
      let llamada = false;
      if (texto[i] === ')') {
        let prof = 0;
        for (; i >= 0; i--) { if (texto[i] === ')') prof++; else if (texto[i] === '(' && --prof === 0) break; }
        if (i < 0) return null;
        i--; llamada = true;
      }
      const fin = i + 1;
      while (i >= 0 && /[\w$]/.test(texto[i])) i--;
      const n = texto.slice(i + 1, fin);
      if (!n) return null;
      partes.unshift({ n, llamada });
      let j = i;
      while (j >= 0 && /\s/.test(texto[j])) j--;
      if (texto[j] === '.') { i = j - 1; continue; }
      break;
    }
    return partes.length ? partes : null;
  }

  /** Miembros (como items) de un tipo, o null si no se conoce. estatico: después de un nombre de clase. */
  function miembrosDeTipo(tipo, estatico, proyecto, claseActual) {
    if (!tipo) return null;
    if (tipo.arreglo) return [{ nombre: 'length', params: null, ret: 'int', desc: 'cantidad de elementos del arreglo' }];
    if (PRIMITIVOS.test(tipo.base)) return [];
    const r = [];
    const propia = proyecto[tipo.base];
    if (propia) {
      const desdeAfuera = tipo.base !== claseActual;
      for (const mt of propia.metodos) if (mt.estatico === estatico && !(desdeAfuera && mt.privado)) r.push({ nombre: mt.nombre, params: mt.params, ret: mt.ret, desc: '' });
      for (const [n, c] of Object.entries(propia.campos)) if (c.estatico === estatico && !(desdeAfuera && c.privado)) r.push({ nombre: n, params: null, ret: c.tipo, desc: 'atributo' });
      if (!estatico) for (const [n, p, ret, d] of OBJETO) if (!r.some(x => x.nombre === n)) r.push({ nombre: n, params: p, ret, desc: d });
      return r;
    }
    const lib = LIB[tipo.base];
    if (!lib) return null;
    for (const [n, p, ret, d] of (estatico ? lib.s : lib.m) || []) r.push({ nombre: n, params: p, ret, desc: d });
    return r;
  }

  /** Resuelve el tipo de la expresión antes del punto y devuelve sus miembros. null = no se sabe. */
  function miembrosJava(cm, posPunto) {
    const antes = cm.getRange({ line: 0, ch: 0 }, posPunto);
    const cadena = cadenaAntesDelPunto(antes);
    if (!cadena) return null;
    if (/^\d/.test(cadena[0].n)) return [];   // "3." es un número decimal, no un objeto
    const todo = cm.getValue();
    const proyecto = modeloProyecto();
    const claseActual = (todo.match(/\b(?:class|interface|enum|record)\s+(\w+)/) || [])[1];
    let tipo = null, estatico = false;
    const [primero, ...resto] = cadena;
    if (primero.n === 'this') tipo = leerTipo(claseActual);
    else if (primero.llamada) {
      const mt = (proyecto[claseActual] || { metodos: [] }).metodos.find(x => x.nombre === primero.n);
      tipo = mt && leerTipo(mt.ret);
    } else {
      tipo = tipoDeVariable(primero.n, antes, todo);
      if (!tipo && /^[A-Z]/.test(primero.n) && (proyecto[primero.n] || LIB[primero.n])) { tipo = leerTipo(primero.n); estatico = true; }
      if (!tipo && proyecto[claseActual] && proyecto[claseActual].campos[primero.n]) tipo = leerTipo(proyecto[claseActual].campos[primero.n].tipo);
    }
    for (const p of resto) {
      if (!tipo) return null;
      const lista = miembrosDeTipo(tipo, estatico, proyecto, claseActual);
      const mb = lista && lista.find(x => x.nombre === p.n && (p.llamada ? x.params !== null : x.params === null));
      if (!mb) return null;
      tipo = tipoDevuelto(mb.ret, tipo);
      estatico = false;
    }
    return miembrosDeTipo(tipo, estatico, proyecto, claseActual);
  }

  // --- JavaScript / React: arreglos, textos, eventos y objetos del proyecto
  const JS = {
    arreglo: M(['map', 'elemento => …', 'Array', 'transforma cada elemento'], ['filter', 'elemento => condición', 'Array', 'deja los que cumplen'],
      ['length', null, 'number', 'cantidad'], ['find', 'elemento => condición', '', 'el primero que cumple'], ['some', 'elemento => condición', 'boolean', '¿alguno cumple?'],
      ['every', 'elemento => condición', 'boolean', '¿todos cumplen?'], ['includes', 'valor', 'boolean', '¿está en el arreglo?'], ['forEach', 'elemento => …', 'void', ''],
      ['reduce', '(acumulado, elemento) => …, inicial', '', ''], ['slice', 'desde, hasta', 'Array', 'copia una parte'], ['concat', 'otro', 'Array', ''],
      ['indexOf', 'valor', 'number', ''], ['join', 'separador', 'string', '']),
    texto: M(['length', null, 'number', 'cantidad de caracteres'], ['trim', '', 'string', 'quita espacios'], ['toLowerCase', '', 'string', ''], ['toUpperCase', '', 'string', ''],
      ['includes', 'texto', 'boolean', '¿contiene?'], ['startsWith', 'texto', 'boolean', ''], ['split', 'separador', 'Array', '']),
    numero: M(['toFixed', 'decimales', 'string', 'redondea a texto']),
    evento: M(['preventDefault', '', 'void', 'evita que el formulario recargue la página'], ['target', null, 'input', 'el elemento que cambió'], ['key', null, 'string', 'tecla pulsada']),
    input: M(['value', null, 'string', 'texto escrito'], ['checked', null, 'boolean', 'casilla marcada'], ['name', null, 'string', '']),
    console: M(['log', 'valor', 'void', 'imprime en la consola'], ['error', 'valor', 'void', '']),
    document: M(['title', null, 'string', 'título de la pestaña'], ['getElementById', 'id', '', '']),
    Math: M(['round', 'x', 'number', ''], ['max', 'a, b', 'number', ''], ['min', 'a, b', 'number', ''], ['abs', 'x', 'number', '']),
    JSON: M(['stringify', 'valor', 'string', ''], ['parse', 'texto', '', '']),
    Number: M(['isNaN', 'x', 'boolean', ''], ['parseFloat', 'texto', 'number', '']),
  };

  /** Propiedades de los objetos que aparecen en el proyecto ({ id: 1, nombre: 'Ana' } → id, nombre). */
  function propiedadesProyecto() {
    const s = new Set();
    for (const src of Object.values(ctx.archivos())) {
      const re = /[{,]\s*(\w+)\s*:/g; let m;
      while ((m = re.exec(String(src)))) if (!/^(default|case|http|https)$/.test(m[1])) s.add(m[1]);
    }
    return [...s];
  }

  function tipoJS(nombre, todo) {
    const n = nombre.replace(/[$]/g, '\\$');
    if (JS[nombre] && /^[A-Z]|console|document/.test(nombre)) return nombre;
    if (/^(e|ev|evento|event)$/.test(nombre)) return 'evento';
    if (new RegExp('\\b(?:const|let|var)\\s+' + n + '\\s*=\\s*\\[').test(todo)) return 'arreglo';
    if (new RegExp('\\b(?:const|let|var)\\s+' + n + "\\s*=\\s*['\"`]").test(todo)) return 'texto';
    const st = todo.match(new RegExp('\\[\\s*' + n + '\\s*,\\s*\\w+\\s*\\]\\s*=\\s*useState\\(\\s*([^)]*)\\)'));
    if (st) {
      const ini = st[1].trim();
      if (ini.startsWith('[')) return 'arreglo';
      if (/^['"`]/.test(ini)) return 'texto';
      if (/^-?\d/.test(ini)) return 'numero';
      if (/^[A-Z_]+$/.test(ini) && new RegExp('\\b' + ini + '\\s*=\\s*\\[').test(todo)) return 'arreglo';
    }
    if (new RegExp('\\b' + n + '\\s*\\.\\s*(?:map|filter|length)\\b').test(todo)) return 'arreglo';
    return null;
  }

  function miembrosJS(cm, posPunto) {
    const antes = cm.getRange({ line: 0, ch: 0 }, posPunto);
    const cadena = cadenaAntesDelPunto(antes);
    if (!cadena) return null;
    if (/^\d/.test(cadena[0].n)) return [];
    const todo = cm.getValue();
    let tipo = tipoJS(cadena[0].n, todo);
    for (const p of cadena.slice(1)) {
      if (tipo === 'evento' && p.n === 'target') tipo = 'input';
      else if (tipo === 'arreglo' && /^(filter|slice|concat|map)$/.test(p.n)) tipo = 'arreglo';
      else if (tipo === 'texto' && /^(trim|toLowerCase|toUpperCase)$/.test(p.n)) tipo = 'texto';
      else if (tipo === 'input' && p.n === 'value') tipo = 'texto';
      else return null;
    }
    if (tipo && JS[tipo]) return JS[tipo].map(([n, p, ret, d]) => ({ nombre: n, params: p, ret, desc: d }));
    // Objeto del proyecto (por ejemplo, el estudiante dentro de un map): sus propiedades
    if (!tipo && cadena.length === 1 && /^[a-z]/.test(cadena[0].n)) {
      const props = propiedadesProyecto();
      if (props.length) return props.map(n => ({ nombre: n, params: null, ret: '', desc: 'propiedad' }));
    }
    return null;
  }

  /** Items de autocompletado para miembros: los métodos sin parámetros se insertan con "()". */
  function itemsMiembros(lista) {
    return lista.map(x => {
      const metodo = x.params !== null;
      const texto = metodo ? x.nombre + (x.params === '' ? '()' : '(') : x.nombre;
      const firma = metodo ? x.nombre + '(' + x.params + ')' : x.nombre;
      const detalle = x.desc ? (x.ret ? `${x.desc} (${x.ret})` : x.desc) : x.ret;
      return item(texto, detalle, null, metodo ? 'metodo' : 'campo', firma);
    });
  }

  // ---------------------------------------------------------------- proveedor de sugerencias
  function item(texto, detalle, alElegir, clase, mostrar) {
    return {
      text: texto, displayText: mostrar || texto, className: 'sug-' + (clase || 'palabra'),
      render(el) {
        el.innerHTML = '';
        const a = document.createElement('span'); a.className = 'sug-texto'; a.textContent = mostrar || texto; el.appendChild(a);
        if (detalle) { const b = document.createElement('span'); b.className = 'sug-detalle'; b.textContent = detalle; el.appendChild(b); }
      },
      hint(cm, data, c) {
        const cierre = c.text.endsWith('(') ? ')' : c.text.endsWith('={') ? '}' : '';
        if (cierre) {
          // Como en un IDE: "buscarPorId()" o "nota={}" con el cursor adentro
          cm.replaceRange(c.text + cierre, data.from, data.to, 'complete');
          const p = cm.getCursor();
          cm.setCursor({ line: p.line, ch: p.ch - 1 });
        } else cm.replaceRange(c.text, data.from, data.to, 'complete');
        if (alElegir) alElegir(cm);
      }
    };
  }

  /**
   * Primero lo que empieza con lo escrito; después, desde 3 letras, lo que lo tiene al inicio de una parte en
   * camelCase (escribir "Var" encuentra PathVariable, pero "th" no encuentra Math).
   */
  function filtrar(lista, prefijo) {
    const p = prefijo.toLowerCase();
    const empieza = lista.filter(x => x.text.toLowerCase().startsWith(p) && x.text.toLowerCase() !== p);
    const enParte = p.length < 3 ? [] : lista.filter(x => {
      const t = x.text, i = t.toLowerCase().indexOf(p);
      return i > 0 && !t.toLowerCase().startsWith(p) && /[A-Z_]/.test(t[i]) && /[a-z0-9]/.test(t[i - 1] || '');
    });
    return empieza.concat(enParte).slice(0, 40);
  }

  // Qué tipo de lista se mostró la última vez: 'miembro' (tras "." o "@" o una prop de JSX) o 'palabra'
  let ultimoTipo = 'palabra';

  /** Props de los componentes del proyecto, leídas de su desestructuración: function EstadoBadge({ nota }) */
  function propsDe(componente) {
    for (const src of Object.values(ctx.archivos())) {
      const m = String(src).match(new RegExp('function\\s+' + componente + '\\s*\\(\\s*\\{([^}]*)\\}'));
      if (m) return m[1].split(',').map(x => x.split('=')[0].trim()).filter(x => /^\w+$/.test(x));
    }
    return [];
  }

  function sugerir(cm) {
    const cur = cm.getCursor();
    const linea = cm.getLine(cur.line).slice(0, cur.ch);
    const m = linea.match(/(@?)([\p{L}\w$]*)$/u);
    const arroba = m[1] === '@';
    const prefijo = m[2];
    const from = { line: cur.line, ch: cur.ch - prefijo.length - (arroba ? 1 : 0) };
    const tras = linea.slice(0, cur.ch - prefijo.length - (arroba ? 1 : 0));
    const despuesDePunto = /\.\s*$/.test(tras);
    const desdeMiembro = { line: cur.line, ch: cur.ch - prefijo.length };
    // Dentro de un texto entre comillas o de un comentario no se sugiere nada (lo dice el resaltado del editor)
    const tipoToken = (cm.getTokenAt(cur).type || '') + ' ' + (cm.getTokenAt({ line: cur.line, ch: Math.max(0, from.ch) }).type || '');
    if (/\b(comment|string)\b/.test(tipoToken) && !/string-2/.test(tipoToken)) return null;
    let lista = [];
    const vistos = new Set();
    const agregar = it => { if (!vistos.has(it.text)) { vistos.add(it.text); lista.push(it); } };
    ultimoTipo = despuesDePunto || arroba ? 'miembro' : 'palabra';

    if (ctx.A.motor === 'java') {
      const clases = Object.assign({}, CLASES_JAVA.comun, CLASES_JAVA[ctx.A.id] || {}, clasesProyecto());
      if (arroba) {
        ANOTACIONES.filter(a => a === 'Override' || clases[a]).forEach(a => agregar(item('@' + a, clases[a] ? 'import ' + clases[a] : '', cm2 => clases[a] && agregarImportJava(cm2, a, clases[a]), 'anotacion')));
        return { list: filtrar(lista, '@' + prefijo), from, to: cur };
      }
      if (despuesDePunto) {
        // Solo los miembros del tipo de lo que va antes del punto, como en un IDE. Si no se sabe el tipo, nada.
        const ms = miembrosJava(cm, { line: cur.line, ch: tras.search(/\.\s*$/) });
        const r = ms ? filtrar(itemsMiembros(ms), prefijo) : [];
        return r.length ? { list: r, from: desdeMiembro, to: cur } : null;
      }
      Object.entries(clases).forEach(([k, pkg]) => agregar(item(k, 'import ' + pkg, cm2 => agregarImportJava(cm2, k, pkg), 'clase')));
      PALABRAS_JAVA.forEach(w => agregar(item(w, '', null, 'clave')));
    } else {
      if (despuesDePunto) {
        const ms = miembrosJS(cm, { line: cur.line, ch: tras.search(/\.\s*$/) });
        const r = ms ? filtrar(itemsMiembros(ms), prefijo) : [];
        return r.length ? { list: r, from: desdeMiembro, to: cur } : null;
      }
      // Dentro de una etiqueta de un componente (<EstadoBadge n…): sus props
      const abre = tras.lastIndexOf('<');
      if (abre >= 0 && tras.indexOf('>', abre) < 0 && /\s$/.test(tras)) {
        const comp = (tras.slice(abre).match(/^<([A-Z]\w*)/) || [])[1];
        if (comp) {
          const yaEstan = new Set((tras.slice(abre).match(/(\w+)\s*=/g) || []).map(x => x.replace(/\s*=$/, '')));
          const props = propsDe(comp).filter(x => !yaEstan.has(x));
          const r = filtrar(props.map(x => item(x + '={', 'prop de ' + comp, null, 'campo', x + '={…}')), prefijo);
          if (r.length) { ultimoTipo = 'miembro'; return { list: r, from: desdeMiembro, to: cur }; }
        }
      }
      HOOKS.forEach(h => agregar(item(h, "import de 'react'", cm2 => agregarImportReact(cm2, h, 'react', false), 'clase')));
      componentesProyecto().forEach(c => agregar(item(c.nombre, 'import ' + c.desde, cm2 => agregarImportReact(cm2, c.nombre, c.desde, c.porDefecto), 'clase')));
      PALABRAS_REACT.forEach(w => agregar(item(w, '', null, 'clave')));
    }
    if (prefijo.length < 1) return null;
    palabrasProyecto().forEach(w => agregar(item(w, '', null, 'palabra')));
    const r = filtrar(lista, prefijo);
    if (!r.length) return null;
    return { list: r, from, to: cur };
  }

  /**
   * Abre las sugerencias solas al escribir: tras "." o "@" enseguida; con palabras, desde la 2.ª letra.
   * Tab siempre elige. Enter elige solo si el estudiante movió la selección con las flechas o si es una lista de
   * miembros (tras "." / "@"); si no, Enter baja de línea como siempre (así "th" + Enter no se vuelve "throws").
   */
  function activar(cm, contexto) {
    ctx = contexto;
    if (!cm.showHint) return; // el complemento no cargó: el editor sigue funcionando sin sugerencias
    let navego = false;
    const mover = n => (c, h) => { navego = true; h.moveFocus(n); };
    const abrir = () => {
      navego = false;
      cm.showHint({
        hint: sugerir, completeSingle: false, closeCharacters: /[\s()\[\]{};:>,=]/,
        extraKeys: {
          Up: mover(-1), Down: mover(1), PageUp: (c, h) => { navego = true; h.moveFocus(-h.menuSize() + 1, true); },
          PageDown: (c, h) => { navego = true; h.moveFocus(h.menuSize() - 1, true); },
          Tab: (c, h) => h.pick(),
          Enter: (c, h) => {
            if (navego || ultimoTipo === 'miembro') h.pick();
            else { h.close(); c.execCommand('newlineAndIndent'); }
          },
        },
      });
    };
    cm.addKeyMap({ 'Ctrl-Space': abrir });
    cm.on('inputRead', (c, ch) => {
      if (ch.origin !== '+input' || c.state.completionActive) return;
      const t = ch.text.join('');
      if (/^[.@]$/.test(t)) { abrir(); return; }
      if (!/^[\p{L}\w$]$/u.test(t)) return;
      const cur = c.getCursor();
      const antes = c.getLine(cur.line).slice(0, cur.ch);
      const palabra = (antes.match(/[\p{L}\w$]+$/u) || [''])[0];
      const enEtiqueta = /<[A-Z]\w*\s[^<>]*$/.test(antes);
      const trasPunto = /[.@][\p{L}\w$]*$/u.test(antes);
      if (palabra.length >= 2 || enEtiqueta || trasPunto) abrir();
    });
  }

  return { activar, sugerir: cm => sugerir(cm) };
})();
