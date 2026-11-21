window.ACTIVIDAD = {
  id: 'java-web',
  curso: 'Java Web',
  titulo: 'API de estudiantes con Java y Servlets',
  descripcion: 'Vas a repasar todo el curso construyendo una pequeña API de estudiantes: primero la lógica en Java (condicionales, ciclos, clases y listas) y después un <b>Servlet</b> que responde JSON a peticiones GET y POST.',
  temas: ['Variables y condicionales', 'Ciclo for y arreglos', 'Clases, constructor y getters', 'ArrayList y DAO', '@WebServlet y doGet', 'doPost, getParameter y validaciones', 'JSON y códigos HTTP'],
  duracion: '60 a 90 minutos',
  motor: 'java',
  javaCurso: 'web',
  aviso: 'Tu código se ejecuta <b>de verdad</b> en el servidor del curso: se compila con <code>javac</code> (Java 17) y los servlets se despliegan en un <b>Tomcat 9</b> real (con <code>javax.servlet</code>, como en NetBeans). <b>Ejecutar</b> corre un programa de prueba o, en los pasos del servlet, le envía a Tomcat las peticiones HTTP de la pestaña <code>peticiones.http</code> (puedes cambiarlas). <b>Comprobar</b> corre pruebas JUnit 5. La base de datos MySQL se reemplaza por un <code>ArrayList</code>.',
  archivos: {
    'Calificaciones.java': { ruta: 'codigo/Calificaciones.java' },
    'Estadisticas.java': { ruta: 'codigo/Estadisticas.java' },
    'Estudiante.java': { ruta: 'codigo/Estudiante.java' },
    'EstudianteDAO.java': { ruta: 'codigo/EstudianteDAO.java' },
    'EstudianteServlet.java': { ruta: 'codigo/EstudianteServlet.java' }
  },
  pasos: [
    {
      id: 'w1',
      ejecutar: {"codigo": "double[] notas = {4.5, 3.0, 2.9, 4.8};\nfor (double n : notas) {\n    System.out.println(n + \" -> estado: \" + Calificaciones.estado(n) + \", nivel: \" + Calificaciones.nivel(n));\n}"},
      titulo: 'Condicionales: ¿aprobó o no?',
      archivos: ['Calificaciones.java'],
      compilar: ['Calificaciones.java'],
      nPruebas: 3,
      explicacion: `
        <p>Un <b>condicional</b> permite que el programa tome decisiones. Java revisa las condiciones <b>de arriba hacia abajo</b> y ejecuta solo el primer bloque que se cumpla.</p>
<pre class="ejemplo"><code>int edad = 17;
if (edad &lt; 13) {
    mensaje = "Niño";
} else if (edad &lt; 18) {
    mensaje = "Adolescente";     // ← entra aquí
} else {
    mensaje = "Adulto";
}</code></pre>
        <h3>Operadores de comparación</h3>
        <table class="tabla">
          <tr><th>Operador</th><th>Significa</th><th>Ejemplo</th></tr>
          <tr><td><code>&gt;=</code></td><td>mayor o igual</td><td><code>nota &gt;= 3.0</code></td></tr>
          <tr><td><code>&gt;</code></td><td>mayor</td><td><code>nota &gt; 3.0</code> (¡3.0 no cumple!)</td></tr>
          <tr><td><code>&lt;</code> / <code>&lt;=</code></td><td>menor / menor o igual</td><td><code>nota &lt; 3.0</code></td></tr>
          <tr><td><code>==</code></td><td>igual (para números)</td><td><code>edad == 18</code></td></tr>
        </table>
        <p>En este curso se aprueba con <b>3.0 o más</b>. Por eso una nota de exactamente 3.0 está aprobada: hay que usar <code>&gt;=</code>.</p>
        <p>Los métodos son <code>static</code>: se llaman con el nombre de la clase, por ejemplo <code>Calificaciones.estado(4.5)</code>.</p>`,
      tarea: `<ol>
          <li>En <code>estado</code>: completa el operador de comparación y el texto que se devuelve cuando no aprueba (<code>"Reprobado"</code>).</li>
          <li>En <code>nivel</code>: completa la condición del <code>else if</code> para el rango “Aceptable”.</li>
        </ol>`,
    },
    {
      id: 'w2',
      ejecutar: {"codigo": "double[] notas = {4.0, 3.0, 5.0, 2.5};\nSystem.out.println(\"promedio = \" + Estadisticas.promedio(notas));\nSystem.out.println(\"aprobados = \" + Estadisticas.contarAprobados(notas));\nSystem.out.println(\"promedio de {} = \" + Estadisticas.promedio(new double[0]));"},
      titulo: 'Ciclos: promedio y aprobados',
      archivos: ['Estadisticas.java'],
      compilar: ['Estadisticas.java'],
      nPruebas: 3,
      explicacion: `
        <p>Un <b>arreglo</b> guarda varios valores del mismo tipo. Sus posiciones (índices) empiezan en <b>0</b> y su tamaño es <code>notas.length</code>.</p>
<pre class="ejemplo"><code>double[] notas = {4.0, 3.0, 5.0};
notas[0]       // 4.0
notas.length   // 3</code></pre>
        <p>El ciclo <code>for</code> repite instrucciones un número definido de veces. Para recorrer un arreglo, el contador <code>i</code> va desde 0 hasta <code>length - 1</code>:</p>
<pre class="ejemplo"><code>for (int i = 0; i &lt; notas.length; i++) {
    // inicio   condición        avance
    System.out.println(notas[i]);
}</code></pre>
        <h3>Acumular y contar</h3>
        <p>Para <b>sumar</b> todo, se usa un acumulador: <code>suma = suma + notas[i];</code>. El promedio es <code>suma / cantidad</code>.</p>
        <p>Para <b>contar</b> los que cumplen una condición se combina el <code>for</code> con un <code>if</code>:</p>
<pre class="ejemplo"><code>int mayores = 0;
for (int i = 0; i &lt; edades.length; i++) {
    if (edades[i] &gt;= 18) {
        mayores++;          // suma 1
    }
}</code></pre>`,
      tarea: `<ol>
          <li><code>promedio</code>: completa la condición del <code>for</code>, el acumulador y el cálculo final.</li>
          <li><code>contarAprobados</code>: escribe tú el <code>for</code> con un <code>if</code> que sume 1 al contador por cada nota &gt;= 3.0.</li>
        </ol>`,
    },
    {
      id: 'w3',
      ejecutar: {"codigo": "Estudiante e = new Estudiante(\"Ana\", 18, 4.6);\nSystem.out.println(\"getNombre() -> \" + e.getNombre());\nSystem.out.println(\"getEdad() -> \" + e.getEdad());\nSystem.out.println(\"getNota() -> \" + e.getNota());\nSystem.out.println(\"getEstadoAcademico() -> \" + e.getEstadoAcademico());\nSystem.out.println(\"toString() -> \" + e);"},
      titulo: 'Clases y objetos: la clase Estudiante',
      archivos: ['Estudiante.java'],
      compilar: ['Estudiante.java'],
      nPruebas: 4,
      explicacion: `
        <p>Una <b>clase</b> es el plano; un <b>objeto</b> es la casa construida con ese plano. La clase <code>Estudiante</code> agrupa en una sola unidad los datos (<b>atributos</b>) y el comportamiento (<b>métodos</b>).</p>
<pre class="ejemplo"><code>Estudiante e = new Estudiante("Luis", 20, 2.9);  // el constructor recibe los datos
e.getNombre();          // "Luis"
e.getEstadoAcademico(); // "Reprobado"</code></pre>
        <ul>
          <li>Los atributos son <code>private</code>: desde afuera solo se leen con los <b>getters</b>.</li>
          <li>En el constructor, <code>this.edad</code> es el atributo y <code>edad</code> es el parámetro: <code>this.edad = edad;</code></li>
        </ul>
        <h3>toString() que devuelve JSON</h3>
        <p>Como en clase, el método <code>toString()</code> arma el JSON del estudiante con un <code>StringBuilder</code>. Fíjate en las comillas: en JSON los textos van entre comillas dobles, que en Java se escriben <code>\\"</code>; los números van sin comillas.</p>
<pre class="ejemplo"><code>{"nombre":"Ana","edad":18,"nota":4.6,"estado":"Aprobado"}</code></pre>`,
      tarea: `<ol>
          <li>Completa el constructor (edad y nota).</li>
          <li>Completa los getters <code>getEdad()</code> y <code>getNota()</code>.</li>
          <li>En <code>getEstadoAcademico()</code> escribe la condición de aprobado.</li>
          <li>En <code>toString()</code> agrega la nota y el estado (usa el método <code>getEstadoAcademico()</code>).</li>
        </ol>`,
    },
    {
      id: 'w4',
      ejecutar: {"codigo": "EstudianteDAO dao = new EstudianteDAO();\nSystem.out.println(\"total() al inicio -> \" + dao.total());\ndao.agregar(new Estudiante(\"Ana\", 18, 4.6));\ndao.agregar(new Estudiante(\"Pedro\", 20, 3.1));\nSystem.out.println(\"total() después de agregar 2 -> \" + dao.total());\nSystem.out.println(\"buscarPorNombre(\\\"pedro\\\") -> \" + dao.buscarPorNombre(\"pedro\"));\nSystem.out.println(\"buscarPorNombre(\\\"Zoe\\\") -> \" + dao.buscarPorNombre(\"Zoe\"));"},
      titulo: 'ArrayList y el patrón DAO',
      archivos: ['EstudianteDAO.java', 'Estudiante.java'],
      compilar: ['EstudianteDAO.java', 'Estudiante.java'],
      nPruebas: 3,
      explicacion: `
        <p>Un <code>ArrayList</code> es una lista que crece, muy parecida a un arreglo de JavaScript, pero Java exige decir qué tipo guarda:</p>
        <table class="tabla">
          <tr><th>JavaScript</th><th>Java (ArrayList)</th></tr>
          <tr><td><code>let lista = []</code></td><td><code>List&lt;Estudiante&gt; lista = new ArrayList&lt;&gt;();</code></td></tr>
          <tr><td><code>lista.push(x)</code></td><td><code>lista.add(x)</code></td></tr>
          <tr><td><code>lista.length</code></td><td><code>lista.size()</code></td></tr>
          <tr><td><code>lista[0]</code></td><td><code>lista.get(0)</code></td></tr>
        </table>
        <h3>¿Qué es un DAO?</h3>
        <p>El <b>DAO</b> (Data Access Object) es la única clase que sabe <i>dónde</i> se guardan los datos. El servlet no sabe si hay MySQL o una lista: solo llama <code>dao.agregar(...)</code>, <code>dao.listar()</code>… En clase el DAO usaba JDBC; aquí usa un <code>ArrayList</code>.</p>
        <h3>Comparar textos</h3>
        <p>Los <code>String</code> no se comparan con <code>==</code>. Se usa <code>equals</code> o, si no importan las mayúsculas, <code>equalsIgnoreCase</code>:</p>
<pre class="ejemplo"><code>"Ana".equals("ana")            // false
"Ana".equalsIgnoreCase("ana")  // true</code></pre>`,
      tarea: `<ol>
          <li>Crea la lista con <code>new ArrayList&lt;&gt;()</code>.</li>
          <li><code>agregar</code>: añade el estudiante a la lista.</li>
          <li><code>total</code>: devuelve el tamaño de la lista.</li>
          <li><code>buscarPorNombre</code>: compara sin importar mayúsculas.</li>
        </ol>`,
    },
    {
      id: 'w5',
      ejecutar: {"peticiones": "GET /api/estudiantes"},
      titulo: 'Servlet: GET /api/estudiantes en JSON',
      archivos: ['EstudianteServlet.java', 'EstudianteDAO.java', 'Estudiante.java'],
      compilar: ['EstudianteServlet.java', 'EstudianteDAO.java', 'Estudiante.java'],
      nPruebas: 3,
      explicacion: `
        <p>Un <b>Servlet</b> es una clase Java que atiende peticiones HTTP dentro de Tomcat. Se registra con <code>@WebServlet</code> y hereda de <code>HttpServlet</code>:</p>
<pre class="ejemplo"><code>@WebServlet(name = "EstudianteServlet", urlPatterns = {"/api/estudiantes"})
public class EstudianteServlet extends HttpServlet { ... }</code></pre>
        <table class="tabla">
          <tr><th>Método HTTP</th><th>Método del servlet</th><th>Uso</th></tr>
          <tr><td>GET</td><td><code>doGet</code></td><td>Consultar</td></tr>
          <tr><td>POST</td><td><code>doPost</code></td><td>Crear</td></tr>
          <tr><td>PUT / DELETE</td><td><code>doPut</code> / <code>doDelete</code></td><td>Actualizar / borrar</td></tr>
        </table>
        <p><code>init()</code> se ejecuta una sola vez, al arrancar: ahí se cargan los 3 estudiantes iniciales (ya está hecho).</p>
        <h3>La respuesta</h3>
        <ul>
          <li><code>response.setContentType("application/json;charset=UTF-8")</code> le dice al cliente que le enviamos JSON.</li>
          <li>El JSON se arma con un <code>StringBuilder</code>, con comas <b>solo entre</b> elementos.</li>
          <li><code>response.getWriter()</code> da un <code>PrintWriter</code>; con <code>out.print(texto)</code> se envía.</li>
        </ul>
        <p>Resultado esperado de <code>GET /api/estudiantes</code>:</p>
<pre class="ejemplo"><code>{"total":3,"estudiantes":[{"nombre":"Ana",...},{"nombre":"Pedro",...},{"nombre":"Luisa",...}]}</code></pre>`,
      tarea: `<ol>
          <li>Completa la ruta de <code>@WebServlet</code>: <code>/api/estudiantes</code>.</li>
          <li>Pon el content type de JSON.</li>
          <li>En <code>"total"</code> agrega la cantidad de estudiantes de la lista.</li>
          <li>Dentro del <code>for</code> agrega el estudiante de la posición <code>i</code>.</li>
          <li>Envía el JSON con <code>out.print(...)</code>.</li>
        </ol>`,
    },
    {
      id: 'w6',
      ejecutar: {"peticiones": "POST /api/estudiantes nombre=Sofia&edad=17&nota=4.2\nPOST /api/estudiantes edad=17&nota=4.2\nPOST /api/estudiantes nombre=Sofia&edad=diecisiete&nota=4.2\nPOST /api/estudiantes nombre=Sofia&edad=17&nota=7\nGET /api/estudiantes"},
      titulo: 'POST: crear estudiantes con validaciones',
      archivos: ['EstudianteServlet.java', 'EstudianteDAO.java', 'Estudiante.java'],
      compilar: ['EstudianteServlet.java', 'EstudianteDAO.java', 'Estudiante.java'],
      nPruebas: 4,
      explicacion: `
        <p>En un POST los datos llegan como parámetros del formulario o del fetch. Se leen con <code>request.getParameter("nombre")</code>, que <b>siempre devuelve String</b> (o <code>null</code> si no vino).</p>
        <p>Para convertir texto a número: <code>Integer.parseInt(texto)</code> y <code>Double.parseDouble(texto)</code>. Si el texto no es un número, lanzan <code>NumberFormatException</code>, que se atrapa con <code>try/catch</code>.</p>
        <h3>Códigos de estado</h3>
        <table class="tabla">
          <tr><th>Situación</th><th>Código</th><th>Constante</th></tr>
          <tr><td>Se creó bien</td><td>201</td><td><code>HttpServletResponse.SC_CREATED</code></td></tr>
          <tr><td>Datos inválidos</td><td>400</td><td><code>HttpServletResponse.SC_BAD_REQUEST</code></td></tr>
        </table>
        <p>Siempre se valida <b>antes</b> de guardar, y si algo falla se responde y se termina con <code>return;</code>.</p>
        <h3>Ejemplo con otro recurso</h3>
        <p>Un servlet que crea <b>cursos</b> con nombre y cupo. Tu tarea es con estudiantes, que tienen más datos y otras reglas:</p>
<pre class="ejemplo"><code>String nombre = request.getParameter("nombre");
if (nombre == null || nombre.trim().isEmpty()) {
    response.setStatus(HttpServletResponse.SC_BAD_REQUEST);
    out.print("{\\"mensaje\\":\\"Falta el nombre del curso\\"}");
    return;
}
try {
    int cupo = Integer.parseInt(request.getParameter("cupo"));
    if (cupo &lt; 1) {
        response.setStatus(HttpServletResponse.SC_BAD_REQUEST);
        out.print("{\\"mensaje\\":\\"El cupo debe ser al menos 1\\"}");
        return;
    }
    Curso nuevo = new Curso(nombre.trim(), cupo);
    cursos.add(nuevo);
    response.setStatus(HttpServletResponse.SC_CREATED);
    out.print("{\\"curso\\":" + nuevo + "}");
} catch (NumberFormatException ex) {
    response.setStatus(HttpServletResponse.SC_BAD_REQUEST);
    out.print("{\\"mensaje\\":\\"El cupo debe ser un número\\"}");
}</code></pre>`,
      tarea: `<p>En <code>doPost</code>, en lugar del comentario <code>// Escribe aquí tu código del paso 6</code>, lee los parámetros <code>nombre</code>, <code>edad</code> y <code>nota</code> y:</p>
          <ol>
            <li>Si el nombre falta o está vacío (también si solo tiene espacios), responde <b>400</b> con <code>{"mensaje":"El nombre es obligatorio"}</code>.</li>
            <li>Convierte la edad a <code>int</code> y la nota a <code>double</code>. Si alguna no es un número, responde <b>400</b> con un <code>"mensaje"</code> que lo explique.</li>
            <li>Si la nota no está entre 0 y 5, responde <b>400</b> con <code>{"mensaje":"La nota debe estar entre 0 y 5"}</code> y no guardes nada.</li>
            <li>Si todo está bien, crea el <code>Estudiante</code> (con el nombre sin espacios sobrantes), guárdalo con el DAO y responde <b>201</b> con <code>{"mensaje":"Estudiante creado","estudiante":{...}}</code>. El <code>toString()</code> de <code>Estudiante</code> (paso 3) ya arma el JSON del estudiante.</li>
          </ol>
          <p>Todo va dentro del <code>try (PrintWriter out = ...)</code> que ya existe, porque usa <code>out</code>. Con <b>Ejecutar</b> Tomcat recibe las peticiones de <code>peticiones.http</code> (varios POST de prueba) y verás sus respuestas reales. Puedes agregar las tuyas.</p>`,
    },
    {
      id: 'w7',
      ejecutar: {"peticiones": "GET /api/estudiantes?nombre=pedro\nGET /api/estudiantes?nombre=Zoe\nGET /api/estudiantes"},
      titulo: 'Integración: búsqueda por nombre y promedio',
      archivos: ['EstudianteServlet.java', 'Estadisticas.java', 'EstudianteDAO.java', 'Estudiante.java'],
      compilar: ['EstudianteServlet.java', 'Estadisticas.java', 'EstudianteDAO.java', 'Estudiante.java'],
      nPruebas: 3,
      explicacion: `
        <p>Último paso: unes todo lo anterior en el <code>doGet</code>. Los ejemplos son de otro caso (cursos); tú los aplicas a los estudiantes.</p>
        <h3>A. Responder un solo elemento o la lista</h3>
        <p>Un mismo <code>doGet</code> puede atender <code>GET /api/cursos</code> (la lista) y <code>GET /api/cursos?codigo=MAT1</code> (uno solo). Se lee el parámetro al inicio: si llegó, se responde ese elemento (o <b>404</b> si no existe) y se termina con <code>return;</code>, para que no se envíe también la lista.</p>
<pre class="ejemplo"><code>String codigo = request.getParameter("codigo");
if (codigo != null) {
    Curso c = buscarCurso(codigo);
    try (PrintWriter out = response.getWriter()) {
        if (c == null) {
            response.setStatus(HttpServletResponse.SC_NOT_FOUND);
            out.print("{\\"mensaje\\":\\"Curso no encontrado\\"}");
        } else {
            out.print("{\\"curso\\":" + c + "}");
        }
    }
    return;
}</code></pre>
        <h3>B. Usar una clase de otro paquete</h3>
        <p>Para usar en el servlet una clase de otro paquete hay que <b>importarla</b>, arriba con los otros <code>import</code>: <code>import paquete.Clase;</code>. Después, sus métodos <code>static</code> se llaman con el nombre de la clase, como <code>Math.max(a, b)</code>.</p>
        <p>Para agregar un campo al JSON que arma el <code>StringBuilder</code>, se agregan su nombre entre comillas, los dos puntos, el valor y la coma, en el lugar donde debe ir:</p>
<pre class="ejemplo"><code>json.append("\\"maximo\\":").append(Math.max(a, b)).append(",");</code></pre>`,
      tarea: `<ol>
          <li>Al inicio de <code>doGet</code>, donde dice <code>// Paso 7: aquí va la búsqueda por nombre</code>, lee el parámetro <code>nombre</code>. Si llegó, busca al estudiante con el DAO (paso 4) y responde <code>{"estudiante":{...}}</code>, o <b>404</b> con <code>{"mensaje":"Estudiante no encontrado"}</code> si no existe.</li>
          <li>Agrega a la lista el campo <code>"promedio"</code>, justo después de <code>"total"</code>, con el promedio de las notas calculado por tu clase <code>Estadisticas</code> del paso 2. Está en el paquete <code>com.mycompany.recuperacion.util</code>, y el DAO ya tiene un método que devuelve todas las notas.</li>
        </ol>
        <p>Así queda la lista: <code>{"total":3,"promedio":3.5,"estudiantes":[...]}</code>. Cuando pase, ve a <b>Nota</b> para calificar toda la actividad.</p>`,
    }
  ]
};
