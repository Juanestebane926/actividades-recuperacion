window.ACTIVIDAD = {
  id: 'spring-boot',
  curso: 'Spring Boot',
  titulo: 'API de vacantes con Spring Boot',
  descripcion: 'Vas a construir, paso a paso, la API REST de la <b>bolsa de empleo</b> que trabajamos en clase: un saludo, un servicio con las vacantes y un controller con GET, POST y DELETE.',
  temas: ['@RestController', '@GetMapping / @PostMapping / @DeleteMapping', '@RequestParam', '@PathVariable', '@RequestBody', 'ResponseEntity (200, 201, 400, 404, 204)', '@Service e inyección por constructor'],
  duracion: '60 a 90 minutos',
  motor: 'java',
  javaCurso: 'spring',
  aviso: 'Tu código se ejecuta <b>de verdad</b> en el servidor del curso: se compila con <code>javac</code> (Java 17) y corre sobre <b>Spring Boot 3</b> real. <b>Ejecutar</b> arranca tu aplicación con su Tomcat embebido y le envía las peticiones HTTP de la pestaña <code>peticiones.http</code> (como Thunder Client); puedes cambiarlas. <b>Comprobar</b> corre pruebas JUnit 5 con MockMvc. Los errores que ves son los que dan Java y Spring de verdad.',
  archivos: {
    'HolaController.java': { ruta: 'codigo/HolaController.java' },
    'SaludoController.java': { ruta: 'codigo/SaludoController.java' },
    'SaludoResponse.java': { ruta: 'codigo/SaludoResponse.java', soloLectura: true },
    'Vacante.java': { ruta: 'codigo/Vacante.java', soloLectura: true },
    'VacanteService.java': { ruta: 'codigo/VacanteService.java' },
    'VacanteController.java': { ruta: 'codigo/VacanteController.java' }
  },
  pasos: [
    {
      id: 'p1',
      ejecutar: {"peticiones": "GET /api/hola"},
      ejecutar: {"peticiones": "GET /api/hola"},
      titulo: 'Tu primer endpoint: GET /api/hola',
      archivos: ['HolaController.java'],
      compilar: ['HolaController.java'],
      nPruebas: 3,
      explicacion: `
        <p>En Spring Boot, un <b>controller</b> es la clase que recibe las peticiones HTTP (por ejemplo, las que haces desde el navegador o Thunder Client) y devuelve una respuesta.</p>
        <h3>Las tres anotaciones básicas</h3>
        <table class="tabla">
          <tr><th>Anotación</th><th>¿Dónde va?</th><th>¿Qué hace?</th></tr>
          <tr><td><code>@RestController</code></td><td>Encima de la clase</td><td>Le dice a Spring: “esta clase atiende peticiones HTTP y lo que devuelva se envía como respuesta”.</td></tr>
          <tr><td><code>@RequestMapping("/api")</code></td><td>Encima de la clase</td><td>Prefijo común: todas las rutas de la clase empiezan con <code>/api</code>.</td></tr>
          <tr><td><code>@GetMapping("/hola")</code></td><td>Encima de un método</td><td>Ese método atiende las peticiones <b>GET</b> a <code>/hola</code>.</td></tr>
        </table>
        <p>La ruta final se arma <b>sumando</b> la de la clase y la del método: <code>/api</code> + <code>/hola</code> = <code>/api/hola</code>.</p>
        <p>Así se veía el controller de la primera clase:</p>
<pre class="ejemplo"><code>@RestController
@RequestMapping("/api")
public class SaludoController {

    @GetMapping("/hola")
    public String saludar() {
        return "Hola";
    }
}</code></pre>
        <p>Cuando el método devuelve un <code>String</code>, ese texto es exactamente lo que recibe quien hizo la petición.</p>`,
      tarea: `<ol>
          <li>Pon <code>@RestController</code> encima de la clase.</li>
          <li>Completa <code>@RequestMapping</code> con <code>"/api"</code>.</li>
          <li>Marca el método <code>hola()</code> con <code>@GetMapping</code>.</li>
          <li>Haz que devuelva exactamente <code>"Hola desde Spring Boot"</code> (con comillas, es un String).</li>
        </ol>
        <p>Luego pulsa <b>Ejecutar</b>: tu aplicación arranca de verdad y verás la respuesta a <code>GET /api/hola</code>. Después pulsa <b>Comprobar</b>.</p>`,
      pistas: [
        'Las anotaciones se escriben con <code>@</code> y el nombre exacto, respetando mayúsculas: <code>@RestController</code>, <code>@GetMapping</code>.',
        'En <code>@RequestMapping("____")</code> el texto va entre las comillas que ya están: queda <code>@RequestMapping("/api")</code>.',
        'El return debe ser un texto entre comillas dobles: <code>return "Hola desde Spring Boot";</code>'
      ]
    },
    {
      id: 'p2',
      ejecutar: {"peticiones": "GET /api/saludo?nombre=Ana\nGET /api/saludo"},
      ejecutar: {"peticiones": "GET /api/saludo?nombre=Ana\nGET /api/saludo"},
      titulo: 'Recibir datos por la URL con @RequestParam',
      archivos: ['SaludoController.java', 'SaludoResponse.java'],
      compilar: ['SaludoController.java', 'SaludoResponse.java'],
      nPruebas: 3,
      explicacion: `
        <p>Muchas veces el cliente envía datos en la <b>query string</b>: lo que va después del <code>?</code> en la URL.</p>
<pre class="ejemplo"><code>GET /api/saludo?nombre=Ana
                 └──┬──┘ └┬┘
                 nombre   valor</code></pre>
        <p>Para leer ese dato en Java se usa <code>@RequestParam</code> en el parámetro del método. Si el dato puede no venir, le damos un <b>valor por defecto</b>:</p>
<pre class="ejemplo"><code>@GetMapping("/buscar")
public String buscar(@RequestParam(defaultValue = "todos") String filtro) {
    return "Buscando: " + filtro;
}
// GET /api/buscar?filtro=java  ->  Buscando: java
// GET /api/buscar              ->  Buscando: todos</code></pre>
        <h3>Devolver JSON</h3>
        <p>Si en lugar de un <code>String</code> el método devuelve un <b>objeto</b>, Spring lo convierte a <b>JSON</b> automáticamente usando sus getters. Por eso existe la clase <code>SaludoResponse</code> (un DTO de respuesta, ya está lista en la otra pestaña):</p>
<pre class="ejemplo"><code>new SaludoResponse("Hola, Ana")   →   {"mensaje":"Hola, Ana"}</code></pre>`,
      tarea: `<ol>
          <li>En el parámetro <code>nombre</code> usa la anotación <code>@RequestParam</code>.</li>
          <li>Su valor por defecto debe ser <code>invitado</code>.</li>
          <li>Devuelve un <code>new SaludoResponse(...)</code> con el texto <code>"Hola, " + nombre</code>.</li>
        </ol>
        <p>Resultado esperado: <code>/api/saludo?nombre=Ana</code> → <code>{"mensaje":"Hola, Ana"}</code> y <code>/api/saludo</code> → <code>{"mensaje":"Hola, invitado"}</code>.</p>`,
      pistas: [
        'La anotación completa queda: <code>@RequestParam(defaultValue = "invitado") String nombre</code>.',
        'Para crear el objeto se usa <code>new</code> y el constructor de la clase: <code>new SaludoResponse(texto)</code>.',
        'Ojo con el espacio después de la coma: <code>return new SaludoResponse("Hola, " + nombre);</code>'
      ]
    },
    {
      id: 'p3',
      ejecutar: {"codigo": "VacanteService servicio = new VacanteService();\nSystem.out.println(\"listar() -> \" + servicio.listar().size() + \" vacantes\");\nVacante v = servicio.buscarPorId(2L);\nSystem.out.println(\"buscarPorId(2L) -> \" + (v == null ? \"null\" : v.getTitulo()));\nSystem.out.println(\"buscarPorId(99L) -> \" + servicio.buscarPorId(99L));\nVacante nueva = servicio.crear(new Vacante(null, \"QA Tester\", \"Datos SAS\", 2100000));\nSystem.out.println(\"crear(...) asignó el id \" + nueva.getId() + \"; ahora hay \" + servicio.listar().size() + \" vacantes\");"},
      ejecutar: {"codigo": "VacanteService servicio = new VacanteService();\nSystem.out.println(\"listar() -> \" + servicio.listar().size() + \" vacantes\");\nVacante v = servicio.buscarPorId(2L);\nSystem.out.println(\"buscarPorId(2L) -> \" + (v == null ? \"null\" : v.getTitulo()));\nSystem.out.println(\"buscarPorId(99L) -> \" + servicio.buscarPorId(99L));\nVacante nueva = servicio.crear(new Vacante(null, \"QA Tester\", \"Datos SAS\", 2100000));\nSystem.out.println(\"crear(...) asignó el id \" + nueva.getId() + \"; ahora hay \" + servicio.listar().size() + \" vacantes\");"},
      titulo: 'La capa de servicio (@Service)',
      archivos: ['VacanteService.java', 'Vacante.java'],
      compilar: ['VacanteService.java', 'Vacante.java'],
      nPruebas: 4,
      explicacion: `
        <p>Recuerda la regla de oro de la arquitectura por capas:</p>
        <div class="nota-info"><b>El controller traduce HTTP, el service decide y el repository persiste.</b></div>
        <p>El <b>service</b> guarda la lógica del negocio: buscar, crear, validar… El controller no debería tener esa lógica: solo recibe la petición y le pide al service que haga el trabajo.</p>
        <p>Para que Spring cree el servicio y lo pueda entregar a otras clases, se marca con <code>@Service</code>. En esta actividad, en lugar de una base de datos, las vacantes se guardan en una <code>List</code> en memoria (ya viene con 3 vacantes).</p>
        <h3>Recordatorio: recorrer una lista</h3>
<pre class="ejemplo"><code>for (Vacante v : vacantes) {      // "por cada vacante v de la lista"
    if (v.getId().equals(id)) {   // ¿es la que busco?
        return v;                 // sí: la devuelvo y termina
    }
}
return null;                      // la recorrí toda y no estaba</code></pre>
        <p><b>Ojo:</b> Como <code>id</code> es <code>Long</code> (un objeto), se compara con <code>.equals(...)</code>, no con <code>==</code>.</p>
        <p>Para agregar un elemento a una lista se usa <code>lista.add(elemento)</code>.</p>`,
      tarea: `<ol>
          <li>Marca la clase con <code>@Service</code>.</li>
          <li><code>listar()</code>: devuelve la lista <code>vacantes</code>.</li>
          <li><code>buscarPorId(id)</code>: completa la comparación y devuelve la vacante encontrada.</li>
          <li><code>crear(nueva)</code>: agrega <code>nueva</code> a la lista <code>vacantes</code>.</li>
        </ol>
        <p>No toques todavía los métodos del <b>Paso 6</b>.</p>`,
      pistas: [
        '<code>listar()</code> es una sola palabra: <code>return vacantes;</code>',
        'En <code>buscarPorId</code>: <code>if (v.getId().equals(id))</code> y adentro <code>return v;</code>',
        'En <code>crear</code>, el espacio en blanco es la instrucción <code>vacantes.add(nueva);</code>'
      ]
    },
    {
      id: 'p4',
      ejecutar: {"peticiones": "GET /api/vacantes\nGET /api/vacantes/2\nGET /api/vacantes/99"},
      ejecutar: {"peticiones": "GET /api/vacantes\nGET /api/vacantes/2\nGET /api/vacantes/99"},
      titulo: 'Controller de vacantes: inyección, GET y @PathVariable',
      archivos: ['VacanteController.java', 'VacanteService.java', 'Vacante.java'],
      compilar: ['VacanteController.java', 'VacanteService.java', 'Vacante.java'],
      nPruebas: 4,
      explicacion: `
        <h3>Inyección por constructor</h3>
        <p>El controller necesita al service. <b>No</b> lo creamos con <code>new</code>: lo pedimos en el constructor y <b>Spring nos lo entrega</b> (inyección de dependencias).</p>
<pre class="ejemplo"><code>private final VacanteService vacanteService;

public VacanteController(VacanteService vacanteService) {
    this.vacanteService = vacanteService;   // guardo lo que Spring me dio
}</code></pre>
        <h3>@PathVariable: un dato dentro de la ruta</h3>
        <p>Para identificar <b>un recurso concreto</b> (la vacante 7) el dato va en la ruta: <code>GET /api/vacantes/7</code>. En la anotación se escribe entre llaves y en el parámetro se usa <code>@PathVariable</code>:</p>
<pre class="ejemplo"><code>@GetMapping("/{id}")
public ... buscarPorId(@PathVariable Long id) { ... }</code></pre>
        <h3>ResponseEntity: controlar el código HTTP</h3>
        <p><code>ResponseEntity</code> permite decidir el <b>estado</b> de la respuesta, no solo el cuerpo:</p>
        <table class="tabla">
          <tr><th>Código</th><th>Significado</th><th>Cómo se escribe</th></tr>
          <tr><td>200</td><td>OK, aquí está</td><td><code>ResponseEntity.ok(objeto)</code></td></tr>
          <tr><td>404</td><td>No existe</td><td><code>ResponseEntity.notFound().build()</code></td></tr>
        </table>`,
      tarea: `<ol>
          <li>Ruta base del controller: <code>"/api/vacantes"</code>.</li>
          <li>En el constructor asigna el servicio recibido al atributo.</li>
          <li><code>listar()</code>: devuelve lo que entrega <code>vacanteService.listar()</code>.</li>
          <li><code>buscarPorId</code>: usa <code>@PathVariable</code>; si no existe responde <b>404</b> con <code>notFound()</code>; si existe, <b>200</b> con la vacante.</li>
        </ol>`,
      pistas: [
        'En el constructor: <code>this.vacanteService = vacanteService;</code> (el parámetro tiene el mismo nombre que el atributo).',
        'En <code>listar()</code> el controller delega: <code>return vacanteService.listar();</code>',
        'Los espacios de <code>buscarPorId</code> son: <code>@PathVariable</code>, <code>notFound</code> y <code>vacante</code>.'
      ]
    },
    {
      id: 'p5',
      ejecutar: {"peticiones": "POST /api/vacantes {\"titulo\": \"QA Tester\", \"empresa\": \"Datos SAS\", \"salario\": 2100000}\nPOST /api/vacantes {\"titulo\": \"\", \"empresa\": \"X\", \"salario\": 1000000}\nGET /api/vacantes"},
      ejecutar: {"peticiones": "POST /api/vacantes {\"titulo\": \"QA Tester\", \"empresa\": \"Datos SAS\", \"salario\": 2100000}\nPOST /api/vacantes {\"titulo\": \"\", \"empresa\": \"X\", \"salario\": 1000000}\nGET /api/vacantes"},
      titulo: 'Crear vacantes: @PostMapping, @RequestBody y 201/400',
      archivos: ['VacanteController.java', 'VacanteService.java', 'Vacante.java'],
      compilar: ['VacanteController.java', 'VacanteService.java', 'Vacante.java'],
      nPruebas: 3,
      explicacion: `
        <p>Para <b>crear</b> un recurso el cliente envía una representación completa en el <b>cuerpo</b> de la petición, en JSON:</p>
<pre class="ejemplo"><code>POST /api/vacantes
Content-Type: application/json

{ "titulo": "QA Tester", "empresa": "Datos SAS", "salario": 2100000 }</code></pre>
        <p>Con <code>@RequestBody</code> Spring convierte ese JSON en un objeto <code>Vacante</code> (usa el constructor vacío y los setters). El método ya tiene esa anotación.</p>
        <h3>Validar antes de crear</h3>
        <p>Si el título viene vacío, no creamos nada y respondemos <b>400 Bad Request</b> con un mensaje. Si todo está bien, el service crea la vacante y respondemos <b>201 Created</b> con la vacante creada (ya con su id).</p>
        <table class="tabla">
          <tr><th>Código</th><th>Cómo se escribe</th></tr>
          <tr><td>400</td><td><code>ResponseEntity.badRequest().body("mensaje")</code></td></tr>
          <tr><td>201</td><td><code>ResponseEntity.status(HttpStatus.CREATED).body(objeto)</code></td></tr>
        </table>
        <p>Un texto está “vacío” si es <code>null</code> o si después de quitarle los espacios (<code>trim()</code>) no queda nada (<code>isEmpty()</code>).</p>`,
      tarea: `<p>Dentro del método <code>crear</code>, borra <code>// TODO Paso 5</code> y <code>return null;</code> y escribe este código completando los <code>____</code>:</p>
<pre class="ejemplo"><code>if (vacante.getTitulo() == null || vacante.getTitulo().trim().____()) {
    return ResponseEntity.badRequest().body("El título es obligatorio");
}
Vacante creada = vacanteService.____(vacante);
return ResponseEntity.status(HttpStatus.____).body(creada);</code></pre>
        <p>Pruébalo con <b>Ejecutar</b>: verás un POST válido (201) y uno con título vacío (400).</p>`,
      pistas: [
        'Para saber si un String quedó vacío: <code>.isEmpty()</code>.',
        'El método del service que guarda es <code>crear</code>: <code>vacanteService.crear(vacante)</code>.',
        'El estado 201 en Spring se llama <code>HttpStatus.CREATED</code>. El mensaje de error debe ser exactamente <code>El título es obligatorio</code> (con tilde).'
      ]
    },
    {
      id: 'p6',
      ejecutar: {"peticiones": "GET /api/vacantes?empresa=tech\nDELETE /api/vacantes/1\nDELETE /api/vacantes/99\nGET /api/vacantes"},
      ejecutar: {"peticiones": "GET /api/vacantes?empresa=tech\nDELETE /api/vacantes/1\nDELETE /api/vacantes/99\nGET /api/vacantes"},
      titulo: 'Integración: filtro por empresa y DELETE',
      archivos: ['VacanteService.java', 'VacanteController.java', 'Vacante.java'],
      compilar: ['VacanteController.java', 'VacanteService.java', 'Vacante.java'],
      nPruebas: 4,
      explicacion: `
        <p>Último paso: juntas todo lo anterior (service + controller + parámetros + códigos HTTP).</p>
        <h3>A. En el service (<code>VacanteService.java</code>)</h3>
        <p><b>buscarPorEmpresa</b>: recorre la lista y agrega a <code>resultado</code> las vacantes cuya empresa contiene el texto, sin importar mayúsculas:</p>
<pre class="ejemplo"><code>for (Vacante v : vacantes) {
    if (v.getEmpresa().toLowerCase().contains(empresa.toLowerCase())) {
        resultado.add(v);
    }
}</code></pre>
        <p><b>eliminar</b>: reutiliza <code>buscarPorId</code>. Si no existe devuelve <code>false</code>; si existe la quita con <code>vacantes.remove(v)</code> y devuelve <code>true</code>.</p>
        <h3>B. En el controller (<code>VacanteController.java</code>)</h3>
        <p><b>Filtro opcional</b>: cambia <code>listar()</code> para que reciba <code>@RequestParam(required = false) String empresa</code>. Si <code>empresa</code> no es <code>null</code>, devuelve <code>vacanteService.buscarPorEmpresa(empresa)</code>; si es null, la lista completa. Así funcionan <code>GET /api/vacantes</code> y <code>GET /api/vacantes?empresa=tech</code>.</p>
        <p><b>DELETE</b>: agrega un método nuevo donde está <code>// TODO Paso 6</code>:</p>
<pre class="ejemplo"><code>@DeleteMapping("/{id}")
public ResponseEntity&lt;Void&gt; eliminar(@PathVariable Long id) {
    if (vacanteService.eliminar(id)) {
        return ResponseEntity.noContent().build();   // 204: borrado, sin cuerpo
    }
    return ResponseEntity.notFound().build();        // 404: no existía
}</code></pre>`,
      tarea: `<ol>
          <li>Completa <code>buscarPorEmpresa</code> y <code>eliminar</code> en <code>VacanteService.java</code>.</li>
          <li>Agrega el filtro opcional <code>empresa</code> a <code>listar()</code> del controller.</li>
          <li>Agrega el endpoint <code>DELETE /api/vacantes/{id}</code> (204 o 404).</li>
        </ol>
        <p>Cuando este paso pase, ve a <b>Nota</b> para calificar toda la actividad.</p>`,
      pistas: [
        '<code>eliminar</code> en el service: <code>Vacante v = buscarPorId(id); if (v == null) { return false; } vacantes.remove(v); return true;</code>',
        'La firma de listar queda: <code>public List&lt;Vacante&gt; listar(@RequestParam(required = false) String empresa)</code>.',
        'Dentro de listar: <code>if (empresa != null) { return vacanteService.buscarPorEmpresa(empresa); } return vacanteService.listar();</code>',
        'El DELETE va dentro de la clase (antes de la última llave <code>}</code>). Copia el ejemplo de la explicación.'
      ]
    }
  ]
};
