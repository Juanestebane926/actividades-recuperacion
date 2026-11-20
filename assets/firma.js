/*
 * Firma de notas: código corto de verificación + comprobante firmado.
 * Nota honesta: cualquier clave dentro de un sitio estático puede extraerse leyendo el código.
 * Por eso el comprobante incluye TODO el código del estudiante, y el docente puede
 * re-calificarlo (volver a ejecutar las pruebas) desde la página /verificar/.
 */
(function () {
  const p = [0x52, 0x65, 0x63, 0x75, 0x70, 0x2d];
  const q = 'Q2xhdmUtRG9jZW50ZS0yMDI2LVVBTy0';
  function clave() {
    return String.fromCharCode.apply(null, p) + atob(q + '=').split('').reverse().join('') + '-' + (7 * 6 * 13 * 37);
  }
  const enc = new TextEncoder();
  async function hmac(texto) {
    const k = await crypto.subtle.importKey('raw', enc.encode(clave()), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
    return new Uint8Array(await crypto.subtle.sign('HMAC', k, enc.encode(texto)));
  }
  async function sha256(texto) {
    const h = new Uint8Array(await crypto.subtle.digest('SHA-256', enc.encode(texto)));
    return Array.from(h, b => b.toString(16).padStart(2, '0')).join('');
  }
  const ALF = '23456789ABCDEFGHJKMNPQRSTUVWXYZ'; // sin 0/O, 1/I/L
  function base(bytes, n) {
    let s = '';
    for (let i = 0; i < n; i++) s += ALF[bytes[i] % ALF.length];
    return s;
  }
  function normal(t) { return String(t || '').trim().replace(/\s+/g, ' ').toUpperCase(); }

  /** Código corto: depende de actividad, nombre, documento, nota y fecha. */
  async function codigoCorto(act, nombre, doc, nota, fecha) {
    const b = await hmac(['C1', act, normal(nombre), normal(doc), Number(nota).toFixed(1), fecha].join('|'));
    const s = base(b, 8);
    return s.slice(0, 4) + '-' + s.slice(4);
  }

  function ordenar(obj) {
    const r = {};
    Object.keys(obj).sort().forEach(k => { r[k] = obj[k]; });
    return r;
  }
  async function firmaComprobante(c) {
    const h = await sha256(JSON.stringify(ordenar(c.archivos || {})));
    const t = ['R1', c.act, normal(c.nombre), normal(c.doc), Number(c.nota).toFixed(1), c.fecha, JSON.stringify(c.detalle), h, c.minutos, c.pistas].join('|');
    const b = await hmac(t);
    return Array.from(b.slice(0, 16), x => x.toString(16).padStart(2, '0')).join('');
  }

  function b64url(bytes) {
    let s = '';
    for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
    return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }
  function desdeB64url(t) {
    t = t.replace(/-/g, '+').replace(/_/g, '/');
    while (t.length % 4) t += '=';
    const s = atob(t);
    const u = new Uint8Array(s.length);
    for (let i = 0; i < s.length; i++) u[i] = s.charCodeAt(i);
    return u;
  }
  async function empacar(obj) {
    const datos = enc.encode(JSON.stringify(obj));
    if (typeof CompressionStream === 'function') {
      const st = new Blob([datos]).stream().pipeThrough(new CompressionStream('deflate-raw'));
      const buf = new Uint8Array(await new Response(st).arrayBuffer());
      return 'REC1.' + b64url(buf);
    }
    return 'REC0.' + b64url(datos);
  }
  async function desempacar(texto) {
    texto = String(texto).replace(/\s+/g, '');
    const m = texto.match(/REC([01])\.([A-Za-z0-9_-]+)/);
    if (!m) throw new Error('El texto no parece un comprobante (debe empezar por REC1.)');
    let bytes = desdeB64url(m[2]);
    if (m[1] === '1') {
      const st = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
      bytes = new Uint8Array(await new Response(st).arrayBuffer());
    }
    return JSON.parse(new TextDecoder().decode(bytes));
  }

  async function crearComprobante(c) {
    c.firma = await firmaComprobante(c);
    c.codigo = await codigoCorto(c.act, c.nombre, c.doc, c.nota, c.fecha);
    return { texto: await empacar(c), codigo: c.codigo };
  }
  async function verificarComprobante(texto) {
    const c = await desempacar(texto);
    const firma = await firmaComprobante(c);
    const codigo = await codigoCorto(c.act, c.nombre, c.doc, c.nota, c.fecha);
    return { datos: c, firmaValida: firma === c.firma, codigoValido: codigo === c.codigo, codigoEsperado: codigo };
  }

  window.Firma = { codigoCorto, crearComprobante, verificarComprobante, desempacar };
})();
