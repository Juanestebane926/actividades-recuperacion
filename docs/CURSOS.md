# Investigación: repositorios y temas de cada curso

Fuente: `gh repo list Juanestebane926 --limit 200` (45 repos), más README, código, commits y carpetas de los repos relevantes (revisados el 2026-11-20).
Este documento es el **criterio** para elegir el contenido de las actividades de recuperación.

## Mapa repositorio → curso

| Curso | Repositorio | Qué contiene | Fechas (commits) |
|---|---|---|---|
| **React** (incluye fundamentos JS) | `Curso-Javascript-React` | PDF *Fundamentos de JavaScript*, Clase 2 (arreglos, `map`/`find`/`filter`, render en el DOM), Clase 3 (PokeAPI con `fetch` + `async/await`, eventos) | 2026-04-22 → 04-29 |
| React | `react-estudiantes` | App React 18 + Vite: componentes, props, `useState`, `useEffect`, hook propio `useForm`, formularios controlados, listas con `map`/`key`, render condicional, TanStack Query consumiendo la API de Java Web | 2026-05-29 |
| **Java Web** | `Curso-Java-Web` | Proyecto Maven/NetBeans/Tomcat 9 con JSP: clase 1 fundamentos (variables, condicionales, ciclos, reto), clase 2 objetos (clase, constructor, getters, `ArrayList`, JSP), clase 3 API con Servlets (`doGet/doPost/doPut/doDelete`, JSON a mano, `getParameter`, códigos de estado), clase 4 JDBC (DAO/DTO, `PreparedStatement`, CRUD MySQL), filtro CORS | 2026-04-24 → 05-29 |
| Java Web | `java-web-codespace-undecimo` | Variante del mismo curso para Codespaces (grado 11): Java 17, Maven, MySQL, Jetty; unidad API con Servlets (CRUD de estudiantes en memoria) | 2026-05-05 → 05-20 |
| Java Web (proyecto final) | `Proyecto_final_curso_java_tecnico` | Proyecto final: API de gastos (modelo `Gasto`, `GastoDAO`, `DatabaseConfig`, recurso JAX-RS), Dockerfile | 2026-06-02 |
| Java Web (vacíos) | `Proyecto_final_curso_java`, `Proyecto-Final-Tecnico` | Sin código (solo `.gitignore` / vacío) | 2026-05/06 |
| **Spring Boot** | `Clase-Spring-Boot` | Clase 1: proyecto inicial, `@RestController`, `@RequestMapping("/api")`, `@GetMapping("/hola")` que devuelve texto | 2026-06-10 |
| Spring Boot | `spring-boot-catalogo-demo` | Clase 2 (demo docente): respuestas JSON, `ResponseEntity`, capas controller/service/repository, DTO, Mapper, excepciones, tests `@WebMvcTest` | 2026-06-17 |
| Spring Boot | `spring-boot-catalogo-plantilla` | Clase 3 (plantilla + guía estudiante): `@RequestParam`, `@PathVariable`, `@RequestBody`, crear `@Service`, inyección por constructor, flujo cliente→controller→service→JSON | 2026-06-17 → 07-22 |
| Spring Boot | `spring-boot-sesion-final-parte-1` | Sesión final 1: JPA (`@Entity`, `@ManyToOne`), `JpaRepository`, query methods, DTO request/response, `@Valid`/`@NotBlank`, `@RestControllerAdvice` + `@ExceptionHandler`, regla de negocio 409, autograding con GitHub Classroom | 2026-09-04 → 09-11 |
| Spring Boot | `spring-boot-sesion-final-parte-2` | Sesión final 2: Spring Security, roles, protección de endpoints | 2026-09-04 → 09-11 |
| (no son cursos) | `Geo_loc`, `Juanestebane926`, y proyectos personales/laborales (ERP, CinePlus, carbon-footprint, etc.) | Descartados | — |

## Temas por curso, en orden y nivel

### React (abril–mayo 2026)
1. Fundamentos JS (PDF): `const`/`let`, scope, funciones tradicionales y flecha, arreglos (`push`, índices, `length`), template literals, `if/else if/else`, ternario, `for`.
2. Clase 2: objetos y arreglos de objetos; `map` + `join` para generar HTML, `find`, `filter` (aprobados `nota >= 3.0`), mock → `fetch`.
3. Clase 3: eventos (`addEventListener`), `fetch` + `async/await`, reducir un JSON grande a `{id, nombre, imagen}`, validación de rango (1–151).
4. React (`react-estudiantes`): componentes de función, props (`EstadoBadge({ nota })`), render condicional con ternario y `&&`, `useState`, listas con `map` y `key`, formularios controlados (`value` + `onChange`, `name`, spread `{...prev, [name]: value}`), `useEffect` con dependencias, hook personalizado `useForm`, TanStack Query (`useQuery`, `useMutation`).
   Nivel: principiante. El dominio de ejemplo siempre es **estudiantes con nombre, edad y nota (aprobado si nota ≥ 3.0)**.

### Java Web (abril–junio 2026)
1. Fundamentos en JSP: variables (`String`, `int`, `double`, `boolean`), condicionales (`if/else if/else`, nota ≥ 3.0), ciclos (`for`, `while`), reto (estrellas).
2. Objetos: clase `Estudiante` (atributos privados, constructor, getters, `getEstadoAcademico()`, `getResumen()`), `ArrayList<Estudiante>` (`add`, `size`, `get`), recorrer y mostrar en JSP.
3. API con Servlets: `@WebServlet`, `doGet/doPost/doPut/doDelete`, `request.getParameter`, `Integer.parseInt`/`Double.parseDouble`, validación con 400/404, JSON armado con `StringBuilder`, `toString()` que devuelve JSON.
4. Base de datos: JDBC, DAO/DTO, `PreparedStatement` con `?`, CRUD (`SELECT/INSERT/UPDATE/DELETE`), CORS.
   Nivel: principiante (grado 11 / técnico). Ruta pedagógica: 1 → 2 → 3 → 4.

### Spring Boot (junio–septiembre 2026)
1. Clase 1: proyecto Spring Boot, `@RestController`, `@RequestMapping`, `@GetMapping` devolviendo texto.
2. Clase 2: devolver objetos como JSON, `ResponseEntity` (200/201/404), capas, DTO, Mapper.
3. Clase 3: `@RequestParam` (con valor por defecto), `@PathVariable`, `@RequestBody`, `@Service`, inyección por constructor (sin `new` en el controller).
4. Sesión final 1: JPA `@Entity`, `JpaRepository`, query methods, `@Valid`/`@NotBlank`, `@RestControllerAdvice`/`@ExceptionHandler`, 409 por regla de negocio.
5. Sesión final 2: Spring Security (roles).
   Nivel: principiante. Dominio: bolsa de empleo (categorías y vacantes) / catálogo de productos.

## Decisión de contenido para las actividades (principiante, ~20 min docente / ≤ 90 min estudiante)

- **React:** componente con props → render condicional (`EstadoBadge`) → lista con `map`/`key` + `filter` → `useState` (contador/botón) → formulario controlado → integración (mini gestor de estudiantes). Se omite TanStack Query (requiere servidor y es lo menos básico).
- **Java Web:** variables/condicionales (método `estado(nota)`) → ciclo (promedio) → clase `Estudiante` con constructor/getters/`toString` JSON → `ArrayList` → servlet `doGet` que responde JSON → `doPost` con `getParameter`, `parseInt` y 400 → integración. Se omite JDBC real (no hay MySQL en el navegador); se cubre DAO con una lista en memoria.
- **Spring Boot:** `@RestController` + `@GetMapping` → `@RequestParam` con `defaultValue` → `@PathVariable` + `ResponseEntity` 200/404 → `@Service` + inyección por constructor → `@PostMapping` + `@RequestBody` + 201/400 → integración. Se omiten JPA real y Security (necesitan el runtime de Spring).
