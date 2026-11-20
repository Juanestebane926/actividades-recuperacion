// Revisión previa del código del estudiante: bloquea lo que no hace falta en estas actividades
// y podría dañar el servidor (archivos, procesos, red, salir de la JVM...).
// Es una capa extra: en Docker el código además corre con un usuario sin permisos y con límites.

function sinComentarios(src) {
  // Conserva los saltos de línea para que los números de línea sigan siendo correctos
  return src
    .replace(/\/\*[\s\S]*?\*\//g, m => m.replace(/[^\n]/g, ' '))
    .replace(/\/\/[^\n]*/g, m => ' '.repeat(m.length))
    .replace(/"(?:[^"\\\n]|\\.)*"/g, m => '"' + ' '.repeat(Math.max(0, m.length - 2)) + '"');
}

const JAVA_PROHIBIDO = [
  [/\bRuntime\b/, 'Runtime'],
  [/\bProcessBuilder\b|\bProcessHandle\b/, 'procesos del sistema'],
  [/\bSystem\s*\.\s*(exit|setOut|setErr|setIn|setProperty|setProperties|getenv|load|loadLibrary|setSecurityManager)\b/, 'System.$1'],
  [/\bjava\s*\.\s*(io|nio|net)\b/, 'java.$1 (archivos y red)'],
  [/\b(File|FileInputStream|FileOutputStream|FileReader|FileWriter|RandomAccessFile|Files|Paths|Socket|ServerSocket|URL|URLConnection|HttpClient|ObjectInputStream)\b/, '$1 (archivos y red)'],
  [/\b(Thread|ThreadGroup|ExecutorService|Executors|ForkJoinPool|Timer)\b/, '$1 (hilos)'],
  [/\b(ClassLoader|URLClassLoader|MethodHandles|Unsafe|Instrumentation)\b/, '$1'],
  [/\bjava\s*\.\s*lang\s*\.\s*(reflect|invoke|instrument)\b|\bsetAccessible\b|\bClass\s*\.\s*forName\b/, 'reflexión'],
  [/\bjavax\s*\.\s*(script|tools|naming)\b|\bjdk\s*\.\s*/, 'APIs internas del JDK'],
  [/\bnative\b/, 'métodos native'],
];

// En Java Web se usa PrintWriter (response.getWriter()) e IOException: son de java.io pero inofensivos
const JAVA_PERMITIDO = /\bjava\s*\.\s*io\s*\.\s*(IOException|PrintWriter|Serializable|UncheckedIOException|BufferedReader)\b/g;

export function revisarJava(archivos) {
  const errores = [];
  for (const [nombre, src] of Object.entries(archivos)) {
    const lineas = sinComentarios(String(src)).replace(JAVA_PERMITIDO, m => ' '.repeat(m.length)).split('\n');
    lineas.forEach((l, i) => {
      for (const [re, que] of JAVA_PROHIBIDO) {
        const m = l.match(re);
        if (!m) continue;
        if (/^\s*import\s+java\.io\.(IOException|PrintWriter|BufferedReader)\s*;/.test(String(src).split('\n')[i])) continue;
        errores.push({
          archivo: nombre, linea: i + 1, columna: m.index + 1, codigo: String(src).split('\n')[i] || '',
          mensaje: 'Por seguridad, en esta actividad no se permite usar ' + que.replace('$1', m[1] || '') + '. No lo necesitas para resolverla.',
          seguridad: true
        });
        break;
      }
    });
  }
  return errores;
}

const REACT_PROHIBIDO = [
  [/\b(process|require|globalThis|module|exports|__dirname|__filename|Function|eval|importScripts|WebSocket|XMLHttpRequest|fetch|Worker)\b/, '$1'],
  [/\bimport\s*\(/, 'import() dinámico'],
];

export function revisarReact(archivos) {
  const errores = [];
  for (const [nombre, src] of Object.entries(archivos)) {
    const original = String(src).split('\n');
    sinComentarios(String(src)).split('\n').forEach((l, i) => {
      // Solo se puede importar de 'react' o de otros archivos de la actividad ('./Algo')
      const imp = l.match(/^\s*import\b.*?\bfrom\s*['"]([^'"]+)['"]|^\s*import\s*['"]([^'"]+)['"]/);
      const original_i = original[i] || '';
      if (imp) {
        const origen = original_i.match(/['"]([^'"]+)['"]/);
        const de = origen ? origen[1] : (imp[1] || imp[2]);
        if (!/^(react|react-dom|react-dom\/client|\.\/[\w-]+(\.jsx?)?)$/.test(de)) {
          errores.push({ archivo: nombre, linea: i + 1, columna: 1, codigo: original_i, seguridad: true,
            mensaje: `En esta actividad solo se puede importar de 'react' o de los otros archivos (por ejemplo './EstadoBadge'), no de '${de}'.` });
        }
        return;
      }
      for (const [re, que] of REACT_PROHIBIDO) {
        const m = l.match(re);
        if (!m) continue;
        errores.push({ archivo: nombre, linea: i + 1, columna: m.index + 1, codigo: original_i, seguridad: true,
          mensaje: 'Por seguridad, en esta actividad no se permite usar ' + que.replace('$1', m[1] || '') + '. No lo necesitas para resolverla.' });
        break;
      }
    });
  }
  return errores;
}
