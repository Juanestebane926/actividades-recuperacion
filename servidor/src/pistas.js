// Pistas de cada paso. Solo las entrega el servidor (POST /api/pista) y solo cuando el estudiante las desbloquea:
// la pista n se abre después de 2·n comprobaciones del paso que no pasaron todas las pruebas. Cada pista abierta
// resta el 15% del valor de ese paso al calificar.
//
// Son pistas, no respuestas: de menos a más, dicen qué concepto aplica y dónde mirar, pero nunca el código exacto.

export const COSTO_PISTA = 0.15;

/** Comprobaciones fallidas del paso que hacen falta para abrir la pista n (1, 2, 3…). */
export const intentosParaPista = n => 2 * n;

export const PISTAS = {
  'spring-boot': {
    p1: [
      'Faltan tres anotaciones distintas: una convierte la clase en un controlador REST, otra fija la ruta base de toda la clase y otra indica que el método responde a peticiones GET. Las tres aparecen en el primer ejemplo de la explicación.',
      'La ruta base es la parte de la URL que comparten todos los endpoints de la clase; el método solo agrega su parte final. Une las dos y compárala con la URL de la tarea.',
      'Si Comprobar responde 404, la ruta completa no coincide. Si dice que el texto no coincide, compara tu respuesta letra por letra con la de la tarea: mayúsculas, espacios y comillas cuentan.',
    ],
    p2: [
      'El nombre llega en la <i>query string</i> (lo que va después del <code>?</code>). Busca en la explicación la anotación que lee esos datos y cómo se le da un valor por defecto.',
      'El valor por defecto debe ser exactamente el que pide la tarea. Para responder JSON no devuelves un String: creas un objeto de la clase de respuesta (está en la otra pestaña) y le pasas el texto.',
      'Si la prueba dice que el mensaje no coincide, revisa el saludo completo de la tarea: la coma, el espacio después de ella y la mayúscula inicial.',
    ],
    p3: [
      'El service guarda las vacantes en la lista declarada arriba de la clase. Para listar solo tienes que entregar esa lista; no hace falta copiarla ni recorrerla.',
      'En <code>buscarPorId</code> recorres la lista y comparas el id de cada vacante con el que recibes. Los id son <code>Long</code> (objetos): repasa en la explicación por qué se comparan con un método y no con <code>==</code>.',
      'En <code>crear</code> ya se asigna el id; falta la instrucción que mete la vacante nueva en la lista. Es el mismo método que usa el constructor para cargar las tres vacantes iniciales.',
    ],
    p4: [
      'En el constructor, Spring te entrega el service como parámetro y tú debes guardarlo en el atributo de la clase. Como se llaman igual, <code>this</code> indica cuál es el atributo.',
      'El controller no guarda datos: para listar le pide la lista al service. Para leer el <code>{id}</code> de la ruta hay una anotación distinta a la del paso 2, que leía la <i>query string</i>; búscala en la explicación.',
      '<code>ResponseEntity</code> tiene un método con el nombre de cada estado HTTP. Busca en la explicación el que significa «no encontrado». Cuando la vacante sí existe, responde 200 con la que encontraste.',
    ],
    p5: [
      'Primero valida y después guarda. El título puede faltar de tres formas: que no llegue (<code>null</code>), que llegue vacío o que solo tenga espacios. Revisa primero el null y después quita los espacios antes de preguntar si quedó vacío.',
      'Guardar no es trabajo del controller: el service ya sabe crear vacantes (lo hiciste en el paso 3). Para responder «creado» usa la constante de <code>HttpStatus</code> que aparece en la tabla de códigos de la explicación.',
      'Si falla la prueba del 400 por el mensaje, copia el texto exacto que pide la tarea; la tilde cuenta.',
    ],
    p6: [
      '<code>buscarPorEmpresa</code> sigue el mismo patrón del ejemplo de la explicación. Para <code>eliminar</code> no recorras la lista otra vez: ya tienes un método que encuentra una vacante por su id.',
      'En el controller, <code>listar</code> ahora recibe un parámetro opcional de la URL. Repasa cómo se marca un <code>@RequestParam</code> como no obligatorio y qué valor tiene cuando no llega.',
      'El DELETE es un método nuevo dentro de la clase (antes de la última llave), con su propia anotación. Debe responder 204 si borró y 404 si la vacante no existía; el ejemplo de la explicación muestra el patrón.',
    ],
  },

  'java-web': {
    w1: [
      'Repasa los operadores de comparación de la explicación: necesitas uno que incluya el 3.0, porque con 3.0 se aprueba.',
      'Los textos que devuelves se comparan letra por letra con los de la tarea: van entre comillas dobles y con mayúscula inicial.',
      'En <code>nivel</code>, cuando el programa llega al <code>else if</code> ya sabe que la nota no era excelente. Mira en el comentario del código cuál es el límite inferior del rango «Aceptable».',
    ],
    w2: [
      'Para recorrer un arreglo necesitas un <code>for</code> que vaya desde la primera posición hasta antes de su longitud. En cada vuelta acumulas en <code>suma</code> el valor de esa posición.',
      'El promedio es la suma dividida entre la cantidad de notas, y el arreglo conoce su propia cantidad de elementos.',
      '<code>contarAprobados</code> sigue el mismo patrón del ejemplo que cuenta mayores de edad: cambia la condición por la de aprobar.',
    ],
    w3: [
      'En el constructor, cada atributo recibe el parámetro del mismo nombre, y <code>this</code> distingue el atributo del parámetro. Haz lo mismo que ya está hecho con el nombre.',
      'Un getter solo devuelve su atributo. La condición para estar aprobado es la misma que usaste en el paso 1.',
      'En <code>toString</code> compara el texto esperado de la tarea con lo que ya se arma y fíjate qué partes faltan. Una de ellas ya la calcula otro método de la clase.',
    ],
    w4: [
      'La lista se crea con la clase de lista dinámica de Java que viste en la explicación; ya está importada arriba del archivo.',
      'Agregar un elemento y saber cuántos hay son métodos de esa lista. Revisa la tabla de métodos de la explicación.',
      'Para buscar por nombre sin importar mayúsculas, <code>String</code> tiene una variante de <code>equals</code>. Compara el nombre de cada estudiante con el que recibes.',
    ],
    w5: [
      'Antes de escribir la respuesta, indica qué tipo de contenido envías: es JSON y en UTF-8. La explicación muestra el valor exacto.',
      'Para recorrer la lista del DAO necesitas su tamaño y, en cada vuelta, el elemento de esa posición. Son los métodos de <code>ArrayList</code> del paso 4.',
      'Al final falta enviar lo que armaste en el <code>StringBuilder</code>: conviértelo en texto y escríbelo con <code>out</code>.',
    ],
    w6: [
      'Los datos del formulario llegan como texto. La edad y la nota se deben convertir a número; las clases <code>Integer</code> y <code>Double</code> tienen métodos para eso.',
      'Si la conversión falla, Java lanza una excepción: atrápala y responde 400, como dice la tarea. Si todo está bien, guarda el estudiante con el DAO.',
      'El código de «creado» es una constante de <code>HttpServletResponse</code> (está en la tabla de la explicación). Todo va dentro del <code>try</code> que ya existe, porque ahí está <code>out</code>.',
    ],
    w7: [
      'Lee el parámetro de búsqueda al inicio de <code>doGet</code>. Si llega, respondes solo con el estudiante que encontraste (o 404); si no, se mantiene lo de antes.',
      'Para el promedio usa la clase <code>Estadisticas</code> del paso 2. Si el compilador dice <i>cannot find symbol</i> con ese nombre, revisa los <code>import</code>.',
      'Si el promedio inicial está bien pero el que se ve después de agregar un estudiante no, el problema es el POST del paso 6. Si el inicial también está mal, revisa tu método del paso 2.',
    ],
  },

  'react': {
    r1: [
      'Las props llegan como un objeto. Entre las llaves del parámetro escribes el nombre de la prop que quieres sacar; mira el ejemplo de <code>Tarjeta</code>.',
      'Dentro del JSX, lo que va entre llaves es JavaScript: ahí va la variable que recibiste.',
      'En un template literal, cada variable va dentro de <code>${...}</code>. Arma la frase exactamente como la muestra la tarea.',
    ],
    r2: [
      '<code>aprobado</code> debe ser <code>true</code> o <code>false</code>: es una comparación entre la nota y el mínimo para aprobar.',
      'El operador ternario elige entre dos valores: <code>condición ? siEsVerdad : siEsFalso</code>. Úsalo una vez para la clase y otra para el texto.',
      'Las pruebas comparan las clases y los textos letra por letra: cópialos tal cual aparecen en la tarea.',
    ],
    r3: [
      'Con la longitud de la lista decides si muestras el mensaje de que no hay estudiantes.',
      'Para convertir cada estudiante en un <code>&lt;li&gt;</code> se usa el método de los arreglos que transforma elemento por elemento; está en la explicación.',
      'Cada elemento de una lista en React necesita una <code>key</code> única: usa un dato del estudiante que nunca se repita. Al badge pásale la nota de ese estudiante.',
    ],
    r4: [
      'El filtro empieza apagado, así que el valor inicial del estado es un booleano.',
      'Para quedarte solo con los aprobados, los arreglos tienen un método que deja pasar únicamente los elementos que cumplen una condición.',
      'Al hacer clic, el estado debe pasar al valor contrario del que tiene en ese momento.',
    ],
    r5: [
      'Al enviarse, un formulario recarga la página. El evento tiene un método que lo evita: llámalo al inicio.',
      'Lo que se escribe en un input siempre es texto, pero la nota debe llegar como número. Después de agregar, deja los campos vacíos con sus funciones <code>set</code>.',
      'En un input controlado, <code>onChange</code> recibe el evento. Repasa en la explicación qué propiedad del input que cambió trae el texto escrito.',
    ],
    r6: [
      'El estado de la App empieza con la lista inicial que ya está definida arriba del componente.',
      '<code>useEffect</code> se vuelve a ejecutar cuando cambia lo que pones en su arreglo de dependencias. ¿Qué dato debe vigilar?',
      'Para agregar sin modificar el arreglo original, crea uno nuevo con lo que ya había más el estudiante nuevo. Al formulario le pasas la función, no el resultado de llamarla.',
    ],
  },
};
