(function () {
  const LISTA = "[{ id: 1, nombre: 'Ana', nota: 4.6 }, { id: 2, nombre: 'Pedro', nota: 3.1 }, { id: 3, nombre: 'Luisa', nota: 2.8 }]";
  const datos = () => [{ id: 1, nombre: 'Ana', nota: 4.6 }, { id: 2, nombre: 'Pedro', nota: 3.1 }, { id: 3, nombre: 'Luisa', nota: 2.8 }];

  // ---------- ayudas para las pruebas ----------
  function badge(t, raiz) {
    const s = t.$('span', raiz);
    t.si(s, 'EstadoBadge debe devolver un <span>.');
    return s;
  }
  function items(t) { return t.$$('li'); }
  function boton(t) {
    const b = t.$('button');
    t.si(b, 'No encontré el <button>.');
    return b;
  }
  function conteo(t) { return t.texto(t.$('.conteo')); }
  function inputs(t) {
    const n = t.$('input[name="nombre"]') || t.$$('input')[0];
    const k = t.$('input[name="nota"]') || t.$$('input')[1];
    t.si(n && k, 'El formulario debe tener dos <input>: nombre y nota.');
    return [n, k];
  }

  window.ACTIVIDAD = {
    id: 'react',
    curso: 'React',
    titulo: 'Gestor de estudiantes con React',
    descripcion: 'Vas a construir, componente por componente, la app de <b>gestión de estudiantes</b> del curso: props, render condicional, listas, estado con <code>useState</code>, formularios controlados y <code>useEffect</code>.',
    temas: ['Componentes y props', 'Template literals', 'Render condicional (ternario y &&)', 'Listas con map y key', 'filter', 'useState y eventos', 'Formularios controlados', 'useEffect y spread'],
    duracion: '60 a 90 minutos',
    motor: 'react',
    aviso: '⚛️ Tu código JSX se ejecuta de verdad con <b>React 18</b> dentro del navegador. Cada componente está en su propio archivo (como en Vite); no hace falta cambiar los <code>import</code>: aquí todos los archivos se cargan juntos.',
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
<pre class="ejemplo"><code>const nombre = "Juan", edad = 20;
const info = \`\${nombre} tiene \${edad} años\`;   // "Juan tiene 20 años"</code></pre>`,
        tarea: `<ol>
            <li><code>Saludo</code>: recibe la prop <code>nombre</code> y muéstrala dentro del <code>&lt;h2&gt;</code> → <i>Hola, Ana</i>.</li>
            <li><code>Perfil</code>: arma el texto <i>Ana tiene 18 años</i> con un template literal.</li>
          </ol>
          <p>Pulsa <b>▶ Ejecutar</b> para ver la vista previa y <b>✔ Comprobar</b> para revisar.</p>`,
        pistas: [
          'En los dos espacios de Saludo va la misma palabra: <code>nombre</code>.',
          'Dentro de las comillas invertidas del template literal escribe: <code>${nombre} tiene ${edad} años</code>'
        ],
        pruebas: [
          ['<Saludo nombre="Ana" /> muestra "Hola, Ana"', t => {
            const d = t.montar(t.h(t.comp('Saludo'), { nombre: 'Ana' }));
            const h2 = t.$('h2', d);
            t.si(h2, 'Saludo debe devolver un <h2>.');
            t.igual('Hola, Ana', t.texto(h2), 'Texto del <h2>');
          }],
          ['Saludo usa la prop (no un nombre fijo)', t => {
            const d = t.montar(t.h(t.comp('Saludo'), { nombre: 'Valentina' }));
            t.igual('Hola, Valentina', t.texto(t.$('h2', d)), 'Con nombre="Valentina", el <h2>');
          }],
          ['<Perfil nombre="Ana" edad={18} /> muestra "Ana tiene 18 años"', t => {
            const d = t.montar(t.h(t.comp('Perfil'), { nombre: 'Ana', edad: 18 }));
            t.igual('Ana tiene 18 años', t.texto(t.$('p', d)), 'Texto del <p>');
            const d2 = t.montar(t.h(t.comp('Perfil'), { nombre: 'Luis', edad: 25 }));
            t.igual('Luis tiene 25 años', t.texto(t.$('p', d2)), 'Con Luis y 25, el texto');
          }]
        ]
      },
      {
        id: 'r2',
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
        pistas: [
          '<code>const aprobado = nota &gt;= 3.0;</code>',
          'El texto: <code>{aprobado ? \'Aprobado\' : \'Reprobado\'}</code>'
        ],
        pruebas: [
          ['Nota 4.5 → "Aprobado" con clase badge-ok', t => {
            const s = badge(t, t.montar(t.h(t.comp('EstadoBadge'), { nota: 4.5 })));
            t.igual('Aprobado', t.texto(s), 'Texto');
            t.si(s.classList.contains('badge-ok') && s.classList.contains('badge'), 'La clase debe ser "badge badge-ok" (tiene: "' + s.className + '").');
          }],
          ['Nota 2.8 → "Reprobado" con clase badge-mal', t => {
            const s = badge(t, t.montar(t.h(t.comp('EstadoBadge'), { nota: 2.8 })));
            t.igual('Reprobado', t.texto(s), 'Texto');
            t.si(s.classList.contains('badge-mal'), 'La clase debe ser "badge badge-mal".');
          }],
          ['Nota 3.0 exacta → "Aprobado"', t => {
            const s = badge(t, t.montar(t.h(t.comp('EstadoBadge'), { nota: 3.0 })));
            t.igual('Aprobado', t.texto(s), 'Con nota 3.0 (usa >=)');
          }]
        ]
      },
      {
        id: 'r3',
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
            <li>Usa <code>est.id</code> como <code>key</code>.</li>
            <li>Pásale a <code>EstadoBadge</code> la nota del estudiante.</li>
          </ol>`,
        pistas: [
          'El tamaño vacío es <code>0</code>. El método para recorrer y transformar es <code>map</code>.',
          'La key: <code>key={est.id}</code>. La nota: <code>nota={est.nota}</code>'
        ],
        pruebas: [
          ['Muestra un <li> por estudiante con nombre y nota', t => {
            t.montar(t.h(t.comp('ListaEstudiantes'), { estudiantes: datos() }));
            const li = items(t);
            t.igual(3, li.length, 'Cantidad de <li>');
            t.si(t.texto(li[0]).includes('Ana') && t.texto(li[0]).includes('4.6'), 'El primer <li> debe mostrar "Ana - 4.6". Muestra: "' + t.texto(li[0]) + '".');
            t.si(t.texto(li[2]).includes('Luisa'), 'El tercer <li> debe ser Luisa.');
          }],
          ['Cada estudiante tiene su EstadoBadge correcto', t => {
            t.montar(t.h(t.comp('ListaEstudiantes'), { estudiantes: datos() }));
            const li = items(t);
            t.si(li.length === 3, 'Primero haz que se vean los 3 <li>.');
            t.igual('Aprobado', t.texto(t.$('span', li[0])), 'Badge de Ana');
            t.igual('Reprobado', t.texto(t.$('span', li[2])), 'Badge de Luisa (nota 2.8)');
          }],
          ['Usa key única en cada <li>', t => {
            t.montar(t.h(t.comp('ListaEstudiantes'), { estudiantes: datos() }));
            const aviso = t.avisos.find(a => /unique "key"|"key" prop/i.test(a));
            t.si(!aviso, 'React avisa que falta la key: agrega key={est.id} al <li>.');
            t.si(/key\s*=\s*\{\s*est\.id\s*\}/.test(t.fuente('ListaEstudiantes.jsx')), 'Usa el id como key: key={est.id}.');
          }],
          ['Lista vacía → "No hay estudiantes"', t => {
            const d = t.montar(t.h(t.comp('ListaEstudiantes'), { estudiantes: [] }));
            t.si(t.texto(d).includes('No hay estudiantes'), 'Con una lista vacía debe aparecer "No hay estudiantes".');
            t.igual(0, items(t).length, 'Cantidad de <li> con la lista vacía');
          }]
        ]
      },
      {
        id: 'r4',
        titulo: 'Estado con useState: filtrar aprobados',
        archivos: ['FiltroAprobados.jsx', 'ListaEstudiantes.jsx'],
        compilar: ['EstadoBadge.jsx', 'ListaEstudiantes.jsx', 'FiltroAprobados.jsx'],
        demo: '<FiltroAprobados estudiantes={' + LISTA + '} />',
        explicacion: `
          <p>El <b>estado</b> es la memoria de un componente: datos que pueden cambiar mientras el usuario usa la app. Cuando el estado cambia, React vuelve a dibujar el componente.</p>
<pre class="ejemplo"><code>const [contador, setContador] = useState(0);
//      valor     función para cambiarlo   valor inicial

&lt;button onClick={() =&gt; setContador(contador + 1)}&gt;+1&lt;/button&gt;</code></pre>
          <p>⚠️ Nunca se cambia el estado directamente (<code>contador = 5</code> ✘): siempre con la función <code>set...</code>.</p>
          <h3>filter</h3>
          <p><code>filter</code> crea un arreglo nuevo solo con los elementos que cumplen la condición:</p>
<pre class="ejemplo"><code>const aprobados = estudiantes.filter(est =&gt; est.nota &gt;= 3.0);</code></pre>
          <h3>Invertir un booleano</h3>
          <p>El operador <code>!</code> (negación) convierte <code>true</code> en <code>false</code> y viceversa: <code>!activo</code>.</p>`,
        tarea: `<ol>
            <li>El estado <code>soloAprobados</code> empieza en <code>false</code>.</li>
            <li>Usa <code>filter</code> para quedarte con los aprobados.</li>
            <li>El botón invierte el valor de <code>soloAprobados</code>.</li>
          </ol>`,
        pistas: [
          '<code>useState(false)</code> y <code>estudiantes.filter(...)</code>',
          'En el onClick: <code>setSoloAprobados(!soloAprobados)</code>'
        ],
        pruebas: [
          ['Al inicio muestra todos: "Mostrando 3 de 3"', t => {
            t.montar(t.h(t.comp('FiltroAprobados'), { estudiantes: datos() }));
            t.igual('Mostrando 3 de 3', conteo(t), 'Texto del conteo');
            t.igual(3, items(t).length, 'Cantidad de <li>');
          }],
          ['Un clic muestra solo los aprobados', t => {
            t.montar(t.h(t.comp('FiltroAprobados'), { estudiantes: datos() }));
            t.click(boton(t));
            t.igual('Mostrando 2 de 3', conteo(t), 'Después de un clic, el conteo');
            const nombres = items(t).map(li => t.texto(li));
            t.si(!nombres.some(n => n.includes('Luisa')), 'Luisa (2.8) no debería aparecer al filtrar aprobados.');
            t.igual('Ver todos', t.texto(boton(t)), 'Texto del botón después del clic');
          }],
          ['Otro clic vuelve a mostrar todos', t => {
            t.montar(t.h(t.comp('FiltroAprobados'), { estudiantes: datos() }));
            t.click(boton(t));
            t.click(boton(t));
            t.igual('Mostrando 3 de 3', conteo(t), 'Después de dos clics, el conteo');
          }]
        ]
      },
      {
        id: 'r5',
        titulo: 'Formularios controlados',
        archivos: ['FormularioEstudiante.jsx'],
        compilar: ['FormularioEstudiante.jsx'],
        demo: '<FormularioEstudiante onAgregar={e => console.log("onAgregar recibió:", e)} />',
        explicacion: `
          <p>En un <b>formulario controlado</b> el valor de cada input vive en el estado de React:</p>
<pre class="ejemplo"><code>const [nombre, setNombre] = useState('');

&lt;input value={nombre} onChange={e =&gt; setNombre(e.target.value)} /&gt;</code></pre>
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
            <li>Evita la recarga con <code>e.preventDefault()</code>.</li>
            <li>Convierte la nota a número antes de llamar <code>onAgregar</code>.</li>
            <li>Limpia la nota (texto vacío).</li>
            <li>Completa los dos <code>onChange</code>.</li>
          </ol>
          <p>Con <b>▶ Ejecutar</b> puedes escribir en el formulario de la vista previa y ver en la consola lo que recibe <code>onAgregar</code>.</p>`,
        pistas: [
          '<code>e.preventDefault();</code> y <code>nota: Number(nota)</code>',
          'Para limpiar: <code>setNota(\'\')</code> (comillas vacías).',
          'Los onChange: <code>setNombre(e.target.value)</code> y <code>setNota(e.target.value)</code>'
        ],
        pruebas: [
          ['Los inputs son controlados (lo que escribes se ve)', t => {
            t.montar(t.h(t.comp('FormularioEstudiante'), { onAgregar: () => {} }));
            const [n, k] = inputs(t);
            t.escribir(n, 'Sofía');
            t.escribir(k, '4.2');
            const [n2, k2] = inputs(t);
            t.igual('Sofía', n2.value, 'Valor del input nombre después de escribir');
            t.igual('4.2', k2.value, 'Valor del input nota después de escribir');
          }],
          ['Al enviar llama onAgregar con la nota como número', t => {
            const recibidos = [];
            t.montar(t.h(t.comp('FormularioEstudiante'), { onAgregar: e => recibidos.push(e) }));
            const [n, k] = inputs(t);
            t.escribir(n, 'Sofía');
            t.escribir(k, '4.2');
            const prevenido = t.enviar(t.$('form'));
            t.si(prevenido, 'Llama e.preventDefault() al enviar (si no, la página se recarga).');
            t.igual(1, recibidos.length, 'Veces que se llamó onAgregar');
            t.igual('Sofía', recibidos[0].nombre, 'nombre enviado');
            t.si(typeof recibidos[0].nota === 'number', 'La nota debe enviarse como número (Number(nota)), llegó como ' + typeof recibidos[0].nota + '.');
            t.igual(4.2, recibidos[0].nota, 'nota enviada');
          }],
          ['Después de enviar, el formulario queda limpio', t => {
            t.montar(t.h(t.comp('FormularioEstudiante'), { onAgregar: () => {} }));
            const [n, k] = inputs(t);
            t.escribir(n, 'Sofía');
            t.escribir(k, '4.2');
            t.enviar(t.$('form'));
            const [n2, k2] = inputs(t);
            t.igual('', n2.value, 'Input nombre después de enviar');
            t.igual('', k2.value, 'Input nota después de enviar');
          }],
          ['Nombre vacío → muestra "El nombre es obligatorio" y no envía', t => {
            const recibidos = [];
            t.montar(t.h(t.comp('FormularioEstudiante'), { onAgregar: e => recibidos.push(e) }));
            const [, k] = inputs(t);
            t.escribir(k, '3');
            t.enviar(t.$('form'));
            t.igual(0, recibidos.length, 'Con nombre vacío, veces que se llamó onAgregar');
            t.si(t.texto(t.$('form')).includes('El nombre es obligatorio'), 'Debe verse el mensaje "El nombre es obligatorio".');
          }]
        ]
      },
      {
        id: 'r6',
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
            <li>El estado empieza con <code>INICIALES</code>.</li>
            <li>La dependencia del <code>useEffect</code> es <code>estudiantes</code>.</li>
            <li>En <code>agregar</code>, copia la lista con spread.</li>
            <li>Pásale <code>agregar</code> al formulario por la prop <code>onAgregar</code>.</li>
          </ol>
          <p>Usa <b>▶ Ejecutar</b> para probar tu app completa: agrega un estudiante y filtra. Cuando este paso pase, ve a <b>🏁 Nota</b>.</p>`,
        pistas: [
          '<code>useState(INICIALES)</code> y <code>[estudiantes]</code> como dependencias.',
          '<code>setEstudiantes([...estudiantes, conId]);</code>',
          '<code>&lt;FormularioEstudiante onAgregar={agregar} /&gt;</code> (sin paréntesis: pasas la función, no la llamas).'
        ],
        pruebas: [
          ['La App muestra el título y los 3 estudiantes iniciales', t => {
            const d = t.montar(t.h(t.comp('App')));
            t.si(t.texto(t.$('h1', d)).includes('Gestión de Estudiantes'), 'Falta el <h1> "Gestión de Estudiantes".');
            t.igual(3, items(t).length, 'Cantidad de estudiantes en la lista');
          }],
          ['Agregar desde el formulario suma un estudiante a la lista', t => {
            t.montar(t.h(t.comp('App')));
            const [n, k] = inputs(t);
            t.escribir(n, 'Sofía');
            t.escribir(k, '4.2');
            t.enviar(t.$('form'));
            t.igual(4, items(t).length, 'Cantidad de estudiantes después de agregar (usa setEstudiantes([...estudiantes, conId]): con push React no se entera del cambio)');
            t.igual('Mostrando 4 de 4', conteo(t), 'Conteo después de agregar');
            t.si(items(t).some(li => t.texto(li).includes('Sofía')), 'Sofía debería aparecer en la lista.');
          }],
          ['useEffect actualiza el título de la pestaña', async t => {
            t.montar(t.h(t.comp('App')));
            await t.esperar(60);
            t.igual('Estudiantes: 3', t.doc.title, 'Título al inicio');
            const [n, k] = inputs(t);
            t.escribir(n, 'Sofía');
            t.escribir(k, '2.0');
            t.enviar(t.$('form'));
            await t.esperar(60);
            t.igual('Estudiantes: 4', t.doc.title, 'Título después de agregar (revisa las dependencias del useEffect)');
          }],
          ['El filtro sigue funcionando con los nuevos estudiantes', t => {
            t.montar(t.h(t.comp('App')));
            const [n, k] = inputs(t);
            t.escribir(n, 'Mario');
            t.escribir(k, '1.5');
            t.enviar(t.$('form'));
            t.click(t.$$('button').find(b => /aprobados|todos/i.test(b.textContent)));
            t.igual('Mostrando 2 de 4', conteo(t), 'Conteo al filtrar aprobados después de agregar una nota 1.5');
          }]
        ]
      }
    ]
  };
})();
