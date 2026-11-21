(function () {
  const LISTA = "[{ id: 1, nombre: 'Ana', nota: 4.6 }, { id: 2, nombre: 'Pedro', nota: 3.1 }, { id: 3, nombre: 'Luisa', nota: 2.8 }]";

  window.ACTIVIDAD = {
    id: 'react',
    curso: 'React',
    titulo: 'Gestor de estudiantes con React',
    descripcion: 'Vas a construir, componente por componente, la app de <b>gestión de estudiantes</b> del curso: props, render condicional, listas, estado con <code>useState</code>, formularios controlados y <code>useEffect</code>.',
    temas: ['Componentes y props', 'Template literals', 'Render condicional (ternario y &&)', 'Listas con map y key', 'filter', 'useState y eventos', 'Formularios controlados', 'useEffect y spread'],
    duracion: '60 a 90 minutos',
    motor: 'react',
    aviso: 'Tu código se ejecuta <b>de verdad</b>: cada componente está en su propio archivo con sus <code>import</code> y <code>export</code>, como en un proyecto de Vite. <b>Ejecutar</b> arma tu app y la muestra funcionando. <b>Comprobar</b> corre pruebas con <b>React Testing Library</b> en el servidor del curso. Si olvidas un <code>import</code> o un <code>export</code>, verás el mismo error que en Vite.',
    componentes: ['Saludo', 'Perfil', 'EstadoBadge', 'ListaEstudiantes', 'FiltroAprobados', 'FormularioEstudiante', 'App'],
    archivos: {
      'Saludo.jsx': { ruta: 'codigo/Saludo.jsx' },
      'EstadoBadge.jsx': { ruta: 'codigo/EstadoBadge.jsx' },
      'ListaEstudiantes.jsx': { ruta: 'codigo/ListaEstudiantes.jsx' },
      'FiltroAprobados.jsx': { ruta: 'codigo/FiltroAprobados.jsx' },
      'FormularioEstudiante.jsx': { ruta: 'codigo/FormularioEstudiante.jsx' },
      'App.jsx': { ruta: 'codigo/App.jsx' }
    },
    pasos: [
      {
        id: 'r1',
        nPruebas: 3,
        titulo: 'Componentes y props',
        archivos: ['Saludo.jsx'],
        compilar: ['Saludo.jsx'],
        demo: '<div><Saludo nombre="Ana" /><Perfil nombre="Ana" edad={18} /></div>',
        explicacion: `
          <p>Un <b>componente</b> de React es una <b>función</b> que devuelve JSX (algo que parece HTML). Su nombre empieza con <b>mayúscula</b>.</p>
          <p>Los datos que le pasa el padre se llaman <b>props</b>. Se reciben como un objeto y lo normal es <b>desestructurarlas</b> entre llaves:</p>
<pre class="ejemplo"><code>function Tarjeta({ titulo }) {          // recibe la prop titulo
  return &lt;h3&gt;{titulo}&lt;/h3&gt;;           // {} = "aquí va JavaScript"
}

&lt;Tarjeta titulo="Mi curso" /&gt;          // así se usa</code></pre>
          <h3>Template literals</h3>
          <p>Para armar textos con variables usamos comillas invertidas y <code>\${...}</code> (repaso de JavaScript):</p>
<pre class="ejemplo"><code>const ciudad = "Cali", grado = 11;
const info = \`Vivo en \${ciudad} y estoy en grado \${grado}\`;   // "Vivo en Cali y estoy en grado 11"</code></pre>`,
        tarea: `<ol>
            <li><code>Saludo</code>: recibe la prop <code>nombre</code> y muéstrala dentro del <code>&lt;h2&gt;</code> → <i>Hola, Ana</i>.</li>
            <li><code>Perfil</code>: arma el texto <i>Ana tiene 18 años</i> con un template literal.</li>
          </ol>
          <p>Pulsa <b>Ejecutar</b> para ver la vista previa y <b>Comprobar</b> para revisar.</p>`,
      },
      {
        id: 'r2',
        nPruebas: 3,
        titulo: 'Render condicional: EstadoBadge',
        archivos: ['EstadoBadge.jsx'],
        compilar: ['EstadoBadge.jsx'],
        demo: '<div><p>Nota 4.5: <EstadoBadge nota={4.5} /></p><p>Nota 3.0: <EstadoBadge nota={3.0} /></p><p>Nota 2.8: <EstadoBadge nota={2.8} /></p></div>',
        explicacion: `
          <p>Muchas veces un componente debe mostrar cosas distintas según un dato. En JSX no se puede escribir un <code>if</code> dentro de las llaves, pero sí el <b>operador ternario</b>:</p>
<pre class="ejemplo"><code>condición ? valorSiEsVerdad : valorSiEsFalso

const edad = 20;
const estado = edad &gt;= 18 ? "Mayor" : "Menor";   // "Mayor"</code></pre>
          <p>Se puede usar tanto para el <b>texto</b> como para los <b>atributos</b>. En React la clase CSS se escribe <code>className</code>:</p>
<pre class="ejemplo"><code>&lt;span className={activo ? 'on' : 'off'}&gt;
  {activo ? 'Encendido' : 'Apagado'}
&lt;/span&gt;</code></pre>
          <p>En el curso, <b>se aprueba con 3.0 o más</b>.</p>`,
        tarea: `<ol>
            <li>Calcula <code>aprobado</code> comparando la nota con 3.0.</li>
            <li>Si aprobó, la clase es <code>badge badge-ok</code>.</li>
            <li>Muestra <code>Aprobado</code> o <code>Reprobado</code> con un ternario.</li>
          </ol>`,
      },
      {
        id: 'r3',
        nPruebas: 4,
        titulo: 'Listas con map y key',
        archivos: ['ListaEstudiantes.jsx', 'EstadoBadge.jsx'],
        compilar: ['EstadoBadge.jsx', 'ListaEstudiantes.jsx'],
        demo: '<ListaEstudiantes estudiantes={' + LISTA + '} />',
        explicacion: `
          <p>Para mostrar una lista, React usa el método de arreglos <code>map</code>: transforma cada elemento en un pedazo de JSX.</p>
<pre class="ejemplo"><code>const frutas = [{ id: 1, nombre: 'pera' }, { id: 2, nombre: 'uva' }];

&lt;ul&gt;
  {frutas.map(f =&gt; (
    &lt;li key={f.id}&gt;{f.nombre}&lt;/li&gt;
  ))}
&lt;/ul&gt;</code></pre>
          <p>Cada elemento de la lista necesita una <b><code>key</code></b> única (normalmente el <code>id</code>). React la usa para saber qué elemento cambió. Si falta, React muestra una advertencia.</p>
          <p>También se puede hacer un <b>return temprano</b>: si no hay datos, devolvemos otro JSX antes de llegar a la lista.</p>
          <p>Y como los componentes se pueden <b>reutilizar</b>, dentro de cada <code>&lt;li&gt;</code> usamos el <code>EstadoBadge</code> del paso anterior.</p>`,
        tarea: `<ol>
            <li>Si la lista tiene 0 elementos, se muestra <i>No hay estudiantes</i>.</li>
            <li>Recorre <code>estudiantes</code> con <code>map</code>.</li>
            <li>Usa como <code>key</code> el dato de cada estudiante que nunca se repite.</li>
            <li>Pásale a <code>EstadoBadge</code> la nota del estudiante.</li>
          </ol>`,
      },
      {
        id: 'r4',
        nPruebas: 3,
        titulo: 'Estado con useState: filtrar aprobados',
        archivos: ['FiltroAprobados.jsx', 'ListaEstudiantes.jsx'],
        compilar: ['EstadoBadge.jsx', 'ListaEstudiantes.jsx', 'FiltroAprobados.jsx'],
        demo: '<FiltroAprobados estudiantes={' + LISTA + '} />',
        explicacion: `
          <p>El <b>estado</b> es la memoria de un componente: datos que pueden cambiar mientras el usuario usa la app. Cuando el estado cambia, React vuelve a dibujar el componente.</p>
<pre class="ejemplo"><code>const [contador, setContador] = useState(0);
//      valor     función para cambiarlo   valor inicial

&lt;button onClick={() =&gt; setContador(contador + 1)}&gt;+1&lt;/button&gt;</code></pre>
          <p><b>Ojo:</b> Nunca se cambia el estado directamente (<code>contador = 5</code> no funciona): siempre con la función <code>set...</code>.</p>
          <h3>filter</h3>
          <p><code>filter</code> crea un arreglo nuevo solo con los elementos que cumplen la condición:</p>
<pre class="ejemplo"><code>const disponibles = productos.filter(p =&gt; p.stock &gt; 0);   // solo los que tienen stock</code></pre>
          <h3>Invertir un booleano</h3>
          <p>El operador <code>!</code> (negación) convierte <code>true</code> en <code>false</code> y viceversa: <code>!activo</code>.</p>`,
        tarea: `<ol>
            <li>El filtro empieza apagado: al principio se ven todos los estudiantes.</li>
            <li>Cuando el filtro está encendido, usa <code>filter</code> para quedarte solo con los aprobados (nota de 3.0 o más).</li>
            <li>Cada clic en el botón cambia el filtro a su valor contrario.</li>
          </ol>
          <p>Este paso también usa tu <code>EstadoBadge</code> del paso 2: si no lo completaste, vuelve a ese paso.</p>`,
      },
      {
        id: 'r5',
        nPruebas: 4,
        titulo: 'Formularios controlados',
        archivos: ['FormularioEstudiante.jsx'],
        compilar: ['FormularioEstudiante.jsx'],
        demo: '<FormularioEstudiante onAgregar={e => console.log("onAgregar recibió:", e)} />',
        explicacion: `
          <p>En un <b>formulario controlado</b> el valor de cada input vive en el estado de React:</p>
<pre class="ejemplo"><code>const [ciudad, setCiudad] = useState('');

&lt;input value={ciudad} onChange={e =&gt; setCiudad(e.target.value)} /&gt;</code></pre>
          <ul>
            <li><code>value</code> muestra lo que hay en el estado.</li>
            <li><code>onChange</code> se ejecuta en cada tecla; <code>e.target.value</code> es lo que el usuario escribió.</li>
          </ul>
          <h3>Enviar el formulario</h3>
          <p>Al enviar, el navegador recarga la página por defecto. En React lo evitamos con <code>e.preventDefault()</code>.</p>
          <p>Lo que se escribe en un input <b>siempre es texto</b>: <code>"4.2"</code>. Para convertirlo a número se usa <code>Number("4.2")</code> → <code>4.2</code>.</p>
          <p>El hijo no guarda la lista: le <b>avisa al padre</b> llamando a la función que recibió por props (<code>onAgregar</code>).</p>
          <p>Y para mostrar el error solo si existe se usa <code>&amp;&amp;</code>: <code>{error &amp;&amp; &lt;p&gt;{error}&lt;/p&gt;}</code>.</p>`,
        tarea: `<ol>
            <li>Evita que el formulario recargue la página (la explicación dice cómo).</li>
            <li>Convierte la nota a número antes de llamar <code>onAgregar</code>.</li>
            <li>Limpia la nota (texto vacío).</li>
            <li>Completa los dos <code>onChange</code>.</li>
          </ol>
          <p>Con <b>Ejecutar</b> puedes escribir en el formulario de la vista previa y ver en la consola lo que recibe <code>onAgregar</code>.</p>`,
      },
      {
        id: 'r6',
        nPruebas: 4,
        titulo: 'Integración: la App completa con useEffect',
        archivos: ['App.jsx', 'FormularioEstudiante.jsx', 'FiltroAprobados.jsx'],
        compilar: ['Saludo.jsx', 'EstadoBadge.jsx', 'ListaEstudiantes.jsx', 'FiltroAprobados.jsx', 'FormularioEstudiante.jsx', 'App.jsx'],
        demo: '<App />',
        explicacion: `
          <p><code>App</code> es el <b>orquestador</b>: guarda la lista de estudiantes en su estado y se la pasa a los hijos por props. Los hijos le avisan cambios llamando funciones (como <code>onAgregar</code>).</p>
          <h3>Agregar sin modificar el arreglo: spread</h3>
          <p>En React el estado no se modifica con <code>push</code>. Se crea un arreglo <b>nuevo</b> copiando el anterior con <code>...</code> (spread) y agregando el elemento al final:</p>
<pre class="ejemplo"><code>setFrutas([...frutas, nuevaFruta]);</code></pre>
          <h3>useEffect</h3>
          <p><code>useEffect</code> ejecuta código <b>después</b> de dibujar, cada vez que cambia algo de su lista de dependencias:</p>
<pre class="ejemplo"><code>useEffect(() =&gt; {
  console.log('cambió el contador');
}, [contador]);       // ← dependencias</code></pre>
          <p>Aquí lo usamos para poner en el título de la pestaña cuántos estudiantes hay.</p>`,
        tarea: `<ol>
            <li>El estado empieza con la lista inicial definida arriba del componente.</li>
            <li>El efecto debe repetirse cada vez que cambie la lista de estudiantes.</li>
            <li><code>agregar</code> crea un arreglo nuevo con lo que había más el estudiante nuevo.</li>
            <li>Pásale al formulario, por su prop <code>onAgregar</code>, la función que agrega (la función, no el resultado de llamarla).</li>
          </ol>
          <p>La app completa usa los componentes de los pasos 1 a 5: si alguno quedó sin completar, vuelve a ese paso.</p>
          <p>Usa <b>Ejecutar</b> para probar tu app completa: agrega un estudiante y filtra. Cuando este paso pase, ve a <b>Nota</b>.</p>`,
      }
    ]
  };
})();
