/*
 * Revisión de sintaxis mientras se escribe (el subrayado rojo de un IDE).
 *  - React/JSX: acorn + acorn-jsx (el parser completo de JavaScript), con los mensajes traducidos.
 *  - Java: no hay un compilador liviano para el navegador, así que aquí se revisa lo que más se equivoca un
 *    principiante: punto y coma que falta, llaves / paréntesis / corchetes sin cerrar o de más, cierres cruzados,
 *    comillas y comentarios sin cerrar. Está hecho para NO marcar nunca código correcto: ante la duda, no marca.
 *    El resto de errores los da el compilador real al Ejecutar o Comprobar (y se marcan igual en el editor).
 * Devuelve [{ desde: {line, ch}, hasta: {line, ch}, mensaje }] (líneas desde 0).
 */
window.Revision = (function () {
  'use strict';

  const CIERRE = { '(': ')', '[': ']', '{': '}' };
  const APERTURA = { ')': '(', ']': '[', '}': '{' };
  const NOMBRE = { '(': 'paréntesis', '[': 'corchete', '{': 'llave', ')': 'paréntesis', ']': 'corchete', '}': 'llave' };
  // Después de estas palabras una línea puede terminar sin punto y coma
  const SIN_PYC = /^(else|try|finally|do|return|new|extends|implements|throws|class|interface|enum|record|static|public|private|protected|final|abstract|import|package)$/;
  // Si la línea siguiente empieza con esto, la instrucción continúa (no falta punto y coma)
  const CONTINUA = /^(\{|\.|\+|-|\*|\/|%|&&|\|\||\?|:|\)|\]|,|=|==|!=|<|>|<=|>=|\+=|-=|\*=|\/=|->|::|&|\||\^|instanceof|extends|implements|throws)$/;
  const CABECERA = /^(if|for|while|switch|catch|else|do|synchronized|try)$/;

  function java(src) {
    const errores = [];
    const marca = (l1, c1, l2, c2, mensaje) => errores.push({ desde: { line: l1, ch: c1 }, hasta: { line: l2, ch: Math.max(c2, c1 + 1) }, mensaje });
    const lineas = String(src).split('\n');
    const tokens = [];
    const pila = [];
    const conError = new Set();
    const sangria = l => (lineas[l].match(/^[ \t]*/) || [''])[0].replace(/\t/g, '    ').length;
    const sospechosas = [];   // llaves que se cerraron con una } de otra sangría: ahí suele faltar la }
    let comentario = null;
    const profParentesis = () => pila.filter(p => p.c !== '{').length;

    for (let l = 0; l < lineas.length; l++) {
      const s = lineas[l];
      let i = 0;
      while (i < s.length) {
        if (comentario) { const j = s.indexOf('*/', i); if (j < 0) { i = s.length; break; } comentario = null; i = j + 2; continue; }
        const c = s[i];
        if (c === ' ' || c === '\t' || c === '\r') { i++; continue; }
        if (c === '/' && s[i + 1] === '/') break;
        if (c === '/' && s[i + 1] === '*') { comentario = { line: l, ch: i }; i += 2; continue; }
        if (c === '"' || c === "'") {
          let j = i + 1;
          while (j < s.length && s[j] !== c) { if (s[j] === '\\') j++; j++; }
          if (j >= s.length) {
            conError.add(l);
            marca(l, i, l, s.length, c === '"'
              ? 'Falta cerrar las comillas " de este texto (en la misma línea).'
              : "Falta cerrar la comilla simple '. Ojo: en Java los textos van con comillas dobles \" y la simple es para un solo carácter.");
            tokens.push({ t: 'lit', line: l, ch: i, fin: s.length, prof: profParentesis(), tope: pila[pila.length - 1] });
            i = s.length;
            break;
          }
          if (c === "'" && s.slice(i + 1, j).replace(/\\./g, 'x').length > 1) {
            conError.add(l);
            marca(l, i, l, j + 1, "La comilla simple ' es para un solo carácter. Los textos van con comillas dobles \".");
          }
          tokens.push({ t: 'lit', line: l, ch: i, fin: j + 1, prof: profParentesis(), tope: pila[pila.length - 1] });
          i = j + 1;
          continue;
        }
        if (/[A-Za-z_$À-￿]/.test(c)) {
          let j = i + 1;
          while (j < s.length && /[\w$À-￿]/.test(s[j])) j++;
          tokens.push({ t: 'id', v: s.slice(i, j), line: l, ch: i, fin: j, prof: profParentesis(), tope: pila[pila.length - 1] });
          i = j;
          continue;
        }
        if (/[0-9]/.test(c) || (c === '.' && /[0-9]/.test(s[i + 1] || ''))) {
          let j = i + 1;
          while (j < s.length && /[\w.]/.test(s[j])) j++;
          tokens.push({ t: 'lit', line: l, ch: i, fin: j, prof: profParentesis(), tope: pila[pila.length - 1] });
          i = j;
          continue;
        }
        if (c === '(' || c === '[' || c === '{') {
          const previo = tokens[tokens.length - 1];
          // Una { después de "=", "]", "," o "{" es un inicializador de arreglo, no un bloque; después de "enum X", la lista de constantes
          const inicializador = c === '{' && previo && (/^(=|,)$/.test(previo.v) || previo.v === ']' || previo.v === '{' ||
            (previo.t === 'id' && tokens[tokens.length - 2] && tokens[tokens.length - 2].v === 'enum'));
          const ab = { c, line: l, ch: i, inicializador };
          tokens.push({ t: 'abre', v: c, line: l, ch: i, fin: i + 1, prof: profParentesis(), tope: pila[pila.length - 1] });
          pila.push(ab);
          i++;
          continue;
        }
        if (c === ')' || c === ']' || c === '}') {
          const tope = pila[pila.length - 1];
          const k = pila.map(p => p.c).lastIndexOf(APERTURA[c]);
          if (k < 0) {
            conError.add(l);
            marca(l, i, l, i + 1, NOMBRE[c] === 'llave' ? `Sobra esta }: no hay una llave { abierta antes.` : `Sobra este ${c}: no hay un ${NOMBRE[c]} ${APERTURA[c]} abierto antes.`);
          } else if (tope.c !== APERTURA[c]) {
            conError.add(l);
            marca(l, i, l, i + 1, `Antes de este ${c} falta cerrar el ${tope.c} de la línea ${tope.line + 1} con ${CIERRE[tope.c]}.`);
            pila.length = k;   // recuperarse: se cierra hasta su pareja
          } else {
            const ab = pila.pop();
            if (c === '}' && ab.line !== l && sangria(ab.line) !== sangria(l) && /^\s*\}/.test(s)) sospechosas.push(ab);
          }
          tokens.push({ t: 'cierra', v: c, line: l, ch: i, fin: i + 1, prof: profParentesis(), tope: pila[pila.length - 1] });
          i++;
          continue;
        }
        const op = (s.slice(i).match(/^(>>>=|<<=|>>=|>>>|\+\+|--|&&|\|\||==|!=|<=|>=|\+=|-=|\*=|\/=|%=|&=|\|=|\^=|->|::|<<|[-+*\/%=<>!&|^~?:;,.@])/) || [c])[0];
        tokens.push({ t: op === ';' ? 'pyc' : 'op', v: op, line: l, ch: i, fin: i + op.length, prof: profParentesis(), tope: pila[pila.length - 1] });
        i += op.length;
      }
    }
    if (comentario) marca(comentario.line, comentario.ch, comentario.line, comentario.ch + 2, 'Este comentario /* nunca se cierra: falta */ al final.');
    // Lo que quedó abierto: se marca el último (el más interno), que es el que suele faltar
    if (pila.length) {
      const p = (pila[pila.length - 1].c === '{' && sospechosas[0]) || pila[pila.length - 1];
      marca(p.line, p.ch, p.line, p.ch + 1, p.c === '{'
        ? 'Esta llave { no tiene su }. Revisa que cada clase, método, if y for cierre su bloque (la que falta puede estar más abajo).'
        : `Este ${p.c} no tiene su ${CIERRE[p.c]}.`);
    }

    // Punto y coma que falta: la línea termina en algo que acaba una instrucción y la siguiente no la continúa
    const porLinea = new Map();
    for (const t of tokens) { if (!porLinea.has(t.line)) porLinea.set(t.line, []); porLinea.get(t.line).push(t); }
    const conCodigo = [...porLinea.keys()].sort((a, b) => a - b);
    for (let k = 0; k < conCodigo.length - 1; k++) {
      const ts = porLinea.get(conCodigo[k]);
      const primero = ts[0], ultimo = ts[ts.length - 1];
      const siguiente = porLinea.get(conCodigo[k + 1])[0];
      if (comentario && conCodigo[k] >= comentario.line) break;
      if (conError.has(conCodigo[k])) continue;
      if (primero.v === '@' || (primero.t === 'id' && CABECERA.test(primero.v))) continue;          // anotación o if/for/while…
      if (primero.v === '}' && ts.length > 1 && ts[1].t === 'id' && CABECERA.test(ts[1].v)) continue; // } else if (…)
      if (ultimo.prof !== 0) continue;                                                              // dentro de ( ) o [ ]
      if (ultimo.tope && ultimo.tope.inicializador) continue;                                       // { 1, 2, 3 } o enum
      const terminaInstruccion = ultimo.t === 'lit' || (ultimo.t === 'id' && !SIN_PYC.test(ultimo.v)) ||
        ultimo.v === ')' || ultimo.v === ']' || ultimo.v === '++' || ultimo.v === '--';
      if (!terminaInstruccion) continue;
      if (CONTINUA.test(siguiente.v || '')) continue;
      // Declaraciones de clase / método en varias líneas: "public class X" + "{" ya se excluyó arriba con CONTINUA
      marca(ultimo.line, ultimo.ch, ultimo.line, ultimo.fin, 'Falta un punto y coma ; al final de esta línea.');
    }
    return errores;
  }

  // ---------------------------------------------------------------- React / JSX con acorn
  const TRADUCCIONES = [
    [/Expected corresponding JSX closing tag for <([^>]*)>/, m => `La etiqueta <${m[1]}> se cierra con otro nombre: cada <${m[1]}> se cierra con </${m[1]}>.`],
    [/Adjacent JSX elements must be wrapped/, () => 'Varios elementos JSX seguidos deben ir dentro de uno solo (un <div> o <>…</>).'],
    [/Unterminated JSX contents/, () => 'Falta cerrar una etiqueta JSX.'],
    [/Unterminated string constant/, () => 'Falta cerrar las comillas de este texto.'],
    [/Unterminated template/, () => 'Falta cerrar la comilla invertida ` de este template literal.'],
    [/Unterminated comment/, () => 'Este comentario /* nunca se cierra: falta */.'],
    [/Unterminated regular expression/, () => 'Hay un < o un / que sobra o una etiqueta mal escrita.'],
    [/Identifier '([^']*)' has already been declared/, m => `Declaraste dos veces "${m[1]}".`],
    [/'return' outside of function/, () => 'Hay un return fuera de una función (¿sobra una llave } antes?).'],
    [/Unexpected keyword '([^']*)'/, m => `No se esperaba la palabra "${m[1]}" aquí: revisa lo que va justo antes.`],
    [/Unexpected token/, () => 'Hay un símbolo que sobra o que falta aquí (revisa llaves, paréntesis, comillas y etiquetas).'],
    [/Unexpected character/, () => 'Este carácter no se puede usar aquí.'],
  ];

  let parserJSX = null;
  function jsx(src) {
    if (!window.acorn) return [];
    if (!parserJSX) parserJSX = window.acornJsx ? window.acorn.Parser.extend(window.acornJsx()) : window.acorn.Parser;
    try {
      parserJSX.parse(String(src), { ecmaVersion: 'latest', sourceType: 'module', locations: true });
      return [];
    } catch (e) {
      if (!e.loc) return [];
      const original = String(e.message).replace(/\s*\(\d+:\d+\)\s*$/, '');
      let mensaje = 'Error de sintaxis: ' + original;
      for (const [re, f] of TRADUCCIONES) { const m = original.match(re); if (m) { mensaje = f(m); break; } }
      const l = e.loc.line - 1, ch = e.loc.column;
      return [{ desde: { line: l, ch }, hasta: { line: l, ch: ch + 1 }, mensaje }];
    }
  }

  return { java, jsx };
})();
