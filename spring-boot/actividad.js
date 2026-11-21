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
      titulo: 'Tu primer endpoint: GET /api/hola',
      archivos: ['HolaController.java'],
      compilar: ['HolaController.java'],
      nPruebas: 3,
      explicacion: `<p>En Spring Boot, un <b>controller</b> es la clase que recibe las peticiones HTTP (por ejemplo, las que haces desde el navegador o Thunder Client) y devuelve una respuesta.</p>
        <h3>Las tres anotaciones básicas</h3>
        <table class="tabla">
          <tr><th>Anotación</th><th>¿Dónde va?</th><th>¿Qué hace?</th></tr>
          <tr><td><code>@RestController</code></td><td>Encima de la clase</td><td>Le dice a Spring: “esta clase atiende peticiones HTTP y lo que devuelva se envía como respuesta”.</td></tr>
          <tr><td><code>@RequestMapping("/ruta")</code></td><td>Encima de la clase</td><td>Prefijo común: todas las rutas de la clase empiezan con esa ruta.</td></tr>
          <tr><td><code>@GetMapping("/otra")</code></td><td>Encima de un método</td><td>Ese método atiende las peticiones <b>GET</b> a esa ruta.</td></tr>
        </table>
        <p>La ruta final se arma <b>sumando</b> la de la clase y la del método. Por ejemplo, en una tienda:</p>
<pre class="ejemplo"><code>@RestController
@RequestMapping("/tienda")
public class TiendaController {

    @GetMapping("/bienvenida")
    public String bienvenida() {
        return "Bienvenido a la tienda";
    }
}
// GET /tienda/bienvenida  ->  Bienvenido a la tienda</code></pre>
        <p>Cuando el método devuelve un <code>String</code>, ese texto es exactamente lo que recibe quien hizo la petición.</p>`,
      tarea: `<ol>
          <li>Marca la clase como un controlador REST.</li>
          <li>Haz que todas las rutas de la clase empiecen con <code>/api</code>.</li>
          <li>Marca el método <code>hola()</code> para que atienda las peticiones GET a <code>/hola</code>, así la ruta completa es <code>/api/hola</code>.</li>
          <li>Haz que devuelva exactamente el texto <code>Hola desde Spring Boot</code> (es un String: va entre comillas).</li>
        </ol>
        <p>Luego pulsa <b>Ejecutar</b>: tu aplicación arranca de verdad y verás la respuesta a <code>GET /api/hola</code>. Después pulsa <b>Comprobar</b>.</p>`,
    },
    {
      id: 'p2',
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
        <p>Si en lugar de un <code>String</code> el método devuelve un <b>objeto</b>, Spring lo convierte a <b>JSON</b> automáticamente usando sus getters. Por ejemplo, con una clase de respuesta de productos:</p>
<pre class="ejemplo"><code>return new ProductoResponse("Lápiz", 1200);   →   {"nombre":"Lápiz","precio":1200}</code></pre>
        <p>A esas clases que solo sirven para armar la respuesta se les llama <b>DTO</b>. Tu DTO es <code>SaludoResponse</code>: ya está listo en la otra pestaña; mira qué recibe su constructor.</p>`,
      tarea: `<ol>
          <li>Haz que el parámetro <code>nombre</code> se lea de la query string.</li>
          <li>Si no llega, su valor debe ser <code>invitado</code>.</li>
          <li>Devuelve un objeto de la clase de respuesta (la otra pestaña) cuyo mensaje sea el saludo con el nombre, como en el resultado esperado.</li>
        </ol>
        <p>Resultado esperado: <code>/api/saludo?nombre=Ana</code> → <code>{"mensaje":"Hola, Ana"}</code> y <code>/api/saludo</code> → <code>{"mensaje":"Hola, invitado"}</code>.</p>`,
    },
    {
      id: 'p3',
      ejecutar: {"codigo": "VacanteService servicio = new VacanteService();\nSystem.out.println(\"listar() -> \" + servicio.listar().size() + \" vacantes\");\nVacante v = servicio.buscarPorId(2L);\nSystem.out.println(\"buscarPorId(2L) -> \" + (v == null ? \"null\" : v.getTitulo()));\nSystem.out.println(\"buscarPorId(99L) -> \" + servicio.buscarPorId(99L));\nVacante nueva = servicio.crear(new Vacante(null, \"QA Tester\", \"Datos SAS\", 2100000));\nSystem.out.println(\"crear(...) asignó el id \" + nueva.getId() + \"; ahora hay \" + servicio.listar().size() + \" vacantes\");"},
      titulo: 'La capa de servicio (@Service)',
      archivos: ['VacanteService.java', 'Vacante.java'],
      compilar: ['VacanteService.java', 'Vacante.java'],
      nPruebas: 4,
      explicacion: `
        <p>Recuerda la regla de oro de la arquitectura por capas:</p>
        <div class="nota-info"><b>El controller traduce HTTP, el service decide y el repository persiste.</b></div>
        <p>El <b>service</b> guarda la lógica del negocio: buscar, crear, validar… El controller no debería tener esa lógica: solo recibe la petición y le pide al service que haga el trabajo.</p>
        <p>Para que Spring cree el servicio y lo pueda entregar a otras clases, la clase se marca con la anotación <code>@Service</code>. En esta actividad, en lugar de una base de datos, las vacantes se guardan en una <code>List</code> en memoria (ya viene con 3 vacantes).</p>
        <h3>Recordatorio: recorrer una lista</h3>
        <p>Por ejemplo, para encontrar en una lista de nombres el primero que empieza con "A":</p>
<pre class="ejemplo"><code>for (String n : nombres) {        // "por cada nombre n de la lista"
    if (n.startsWith("A")) {      // ¿es el que busco?
        return n;                 // sí: lo devuelvo y termina
    }
}
return null;                      // la recorrí toda y no estaba</code></pre>
        <p><b>Ojo:</b> los objetos, como <code>Long</code> o <code>String</code>, se comparan con <code>.equals(...)</code>, no con <code>==</code> (que compara si son el mismo objeto, no si valen lo mismo).</p>
        <p>Para agregar un elemento a una lista se usa <code>lista.add(elemento)</code>.</p>`,
      tarea: `<ol>
          <li>Marca la clase con la anotación que la registra como servicio.</li>
          <li><code>listar()</code>: devuelve la lista de vacantes que ya tiene el servicio.</li>
          <li><code>buscarPorId(id)</code>: completa la comparación del id de cada vacante con el que recibes y devuelve la vacante encontrada.</li>
          <li><code>crear(nueva)</code>: guarda la vacante nueva en la lista.</li>
        </ol>
        <p>Los métodos del <b>paso 6</b> se completan más adelante.</p>`,
    },
    {
      id: 'p4',
      ejecutar: {"peticiones": "GET /api/vacantes\nGET /api/vacantes/2\nGET /api/vacantes/99"},
      titulo: 'Controller de vacantes: inyección, GET y @PathVariable',
      archivos: ['VacanteController.java', 'VacanteService.java', 'Vacante.java'],
      compilar: ['VacanteController.java', 'VacanteService.java', 'Vacante.java'],
      nPruebas: 4,
      explicacion: `
        <h3>Inyección por constructor</h3>
        <p>El controller necesita al service. <b>No</b> lo creamos con <code>new</code>: lo pedimos en el constructor y <b>Spring nos lo entrega</b> (inyección de dependencias).</p>
        <p>Por ejemplo, un controller de productos que necesita su servicio:</p>
<pre class="ejemplo"><code>private final ProductoService productoService;

public ProductoController(ProductoService productoService) {
    this.productoService = productoService;   // guardo lo que Spring me dio
}</code></pre>
        <h3>@PathVariable: un dato dentro de la ruta</h3>
        <p>Para identificar <b>un recurso concreto</b> el dato va en la ruta, por ejemplo <code>GET /cursos/MAT1</code>. En la anotación se escribe entre llaves y el parámetro que lo recibe se marca con <code>@PathVariable</code>:</p>
<pre class="ejemplo"><code>@GetMapping("/{codigo}")
public ... buscarCurso(@PathVariable String codigo) { ... }</code></pre>
        <h3>ResponseEntity: controlar el código HTTP</h3>
        <p><code>ResponseEntity</code> permite decidir el <b>estado</b> de la respuesta, no solo el cuerpo:</p>
        <table class="tabla">
          <tr><th>Código</th><th>Significado</th><th>Cómo se escribe</th></tr>
          <tr><td>200</td><td>OK, aquí está</td><td><code>ResponseEntity.ok(objeto)</code></td></tr>
          <tr><td>404</td><td>No existe</td><td><code>ResponseEntity.notFound().build()</code></td></tr>
        </table>`,
      tarea: `<ol>
          <li>La ruta base del controller es <code>/api/vacantes</code>.</li>
          <li>En el constructor, guarda en el atributo el servicio que recibes.</li>
          <li><code>listar()</code>: el controller no guarda datos; pídele la lista al servicio.</li>
          <li><code>buscarPorId</code>: lee el id de la ruta; si la vacante no existe responde <b>404</b> y si existe, <b>200</b> con la vacante (usa la tabla de <code>ResponseEntity</code>).</li>
        </ol>`,
    },
    {
      id: 'p5',
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
        <p>Primero se revisan los datos. Si algo está mal, no se crea nada y se responde <b>400 Bad Request</b> con un mensaje. Si todo está bien, el service crea el recurso y se responde <b>201 Created</b> con el objeto creado (ya con su id).</p>
        <table class="tabla">
          <tr><th>Código</th><th>Cómo se escribe</th></tr>
          <tr><td>400</td><td><code>ResponseEntity.badRequest().body("mensaje")</code></td></tr>
          <tr><td>201</td><td><code>ResponseEntity.status(HttpStatus.CREATED).body(objeto)</code></td></tr>
        </table>
        <p>Así se vería en otro caso: una tienda que crea <b>productos</b> y no acepta precios de cero o negativos. Tu tarea es con vacantes, y lo que se valida es el título.</p>
<pre class="ejemplo"><code>@PostMapping
public ResponseEntity&lt;?&gt; crear(@RequestBody Producto producto) {
    if (producto.getPrecio() &lt;= 0) {
        return ResponseEntity.badRequest().body("El precio debe ser mayor que cero");
    }
    Producto guardado = productoService.guardar(producto);
    return ResponseEntity.status(HttpStatus.CREATED).body(guardado);
}</code></pre>
        <h3>Varias condiciones en un if</h3>
        <p>Con <code>||</code> (“o”) Java revisa de izquierda a derecha y se detiene en la primera condición verdadera. Por eso el orden importa: si la primera ya fue verdadera, la segunda ni se evalúa.</p>
        <h3>¿Cuándo está vacío un texto?</h3>
        <p>Un <code>String</code> puede faltar (<code>null</code>), estar vacío (<code>""</code>) o tener solo espacios (<code>"   "</code>), y los tres casos cuentan como vacío. <code>trim()</code> quita los espacios del inicio y del final, e <code>isEmpty()</code> dice si no queda ningún carácter. Revisa primero el <code>null</code>: llamar a un método sobre un <code>null</code> lanza <code>NullPointerException</code>.</p>`,
      tarea: `<p>Escribe el cuerpo del método <code>crear</code> del controller, en lugar del comentario <code>// Escribe aquí tu código del paso 5</code> y del <code>return null;</code>:</p>
          <ol>
            <li>Si el título de la vacante falta, está vacío o solo tiene espacios, responde <b>400</b> con este texto exacto: <code>El título es obligatorio</code>.</li>
            <li>Si el título está bien, pídele al service que cree la vacante (ese método lo hiciste en el paso 3).</li>
            <li>Responde <b>201</b> con la vacante creada.</li>
          </ol>
          <p>Pruébalo con <b>Ejecutar</b>: verás un POST válido (201) y uno con título vacío (400).</p>`,
    },
    {
      id: 'p6',
      ejecutar: {"peticiones": "GET /api/vacantes?empresa=tech\nDELETE /api/vacantes/1\nDELETE /api/vacantes/99\nGET /api/vacantes"},
      titulo: 'Integración: filtro por empresa y DELETE',
      archivos: ['VacanteService.java', 'VacanteController.java', 'Vacante.java'],
      compilar: ['VacanteController.java', 'VacanteService.java', 'Vacante.java'],
      nPruebas: 4,
      explicacion: `
        <p>Último paso: juntas todo lo anterior (service + controller + parámetros + códigos HTTP). Los ejemplos son de otros casos para que veas la idea; tú la aplicas a las vacantes.</p>
        <h3>A. En el service (<code>VacanteService.java</code>)</h3>
        <p><b>Filtrar una lista</b>: se recorre y se agregan a una lista nueva los elementos que cumplen la condición. Por ejemplo, los productos que cuestan menos que un máximo:</p>
<pre class="ejemplo"><code>List&lt;Producto&gt; baratos = new ArrayList&lt;&gt;();
for (Producto p : productos) {
    if (p.getPrecio() &lt; maximo) {
        baratos.add(p);
    }
}
return baratos;</code></pre>
        <p>En tu caso la condición es sobre textos: que la empresa <b>contenga</b> el texto buscado, sin importar mayúsculas. <code>String</code> tiene <code>contains</code>, <code>startsWith</code> y <code>endsWith</code>; para no distinguir mayúsculas, pasa los dos textos a minúsculas antes de compararlos.</p>
        <p><b>Eliminar</b>: reutiliza lo que ya tienes. Si <code>buscarPorId</code> no encuentra la vacante, devuelve <code>false</code>; si la encuentra, quítala de la lista (<code>List</code> tiene un método para quitar un elemento) y devuelve <code>true</code>.</p>
        <h3>B. En el controller (<code>VacanteController.java</code>)</h3>
        <p><b>Parámetro opcional</b>: con <code>required = false</code> el parámetro deja de ser obligatorio, y si no llega en la URL vale <code>null</code>. Por ejemplo:</p>
<pre class="ejemplo"><code>@GetMapping("/saludo")
public String saludar(@RequestParam(required = false) String nombre) {
    if (nombre == null) {
        return "Hola";               // GET /saludo
    }
    return "Hola, " + nombre;        // GET /saludo?nombre=Ana
}</code></pre>
        <p>Con la misma idea haces que <code>GET /api/vacantes</code> devuelva todas y <code>GET /api/vacantes?empresa=tech</code> solo las que coinciden.</p>
        <p><b>DELETE</b>: es un endpoint nuevo con <code>@DeleteMapping</code>. Responde <b>204</b> si borró y <b>404</b> si no existía:</p>
        <table class="tabla">
          <tr><th>Código</th><th>Cómo se escribe</th></tr>
          <tr><td>204 (borrado, sin cuerpo)</td><td><code>ResponseEntity.noContent().build()</code></td></tr>
          <tr><td>404 (no existía)</td><td><code>ResponseEntity.notFound().build()</code></td></tr>
        </table>
        <p>Ejemplo con productos, cuyo service tiene métodos distintos a los tuyos:</p>
<pre class="ejemplo"><code>@DeleteMapping("/{id}")
public ResponseEntity&lt;Void&gt; borrar(@PathVariable Long id) {
    Producto p = productoService.buscar(id);
    if (p == null) {
        return ResponseEntity.notFound().build();
    }
    productoService.quitar(p);
    return ResponseEntity.noContent().build();
}</code></pre>
        <p>El tuyo va dentro de la clase, donde dice <code>// Escribe aquí el endpoint DELETE /api/vacantes/{id}</code>.</p>`,
      tarea: `<ol>
          <li>Completa <code>buscarPorEmpresa</code> y <code>eliminar</code> en <code>VacanteService.java</code>.</li>
          <li>Agrega el filtro opcional <code>empresa</code> a <code>listar()</code> del controller.</li>
          <li>Agrega el endpoint <code>DELETE /api/vacantes/{id}</code> (204 o 404).</li>
        </ol>
        <p>Cuando este paso pase, ve a <b>Nota</b> para calificar toda la actividad.</p>`,
    }
  ]
};
