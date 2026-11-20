# REGISTRO de trabajo autónomo (2026-11-20)

Entorno: teléfono Kalley Black Z, Android 12, Termux, Claude Code (Opus 5.5) vía T3 Code.

## Línea de tiempo por etapa

| Etapa | Inicio | Fin | Notas |
|---|---|---|---|
| 1. Investigación de repos | 02:36 | 02:40 | 45 repos listados, 14 clonados y revisados. Resultado en `docs/CURSOS.md` |
| 2. Elección de herramienta | 02:40 | 02:47 | Búsqueda web + revisión del código de JavaFiddle |

## Estado actual / qué sigue
- (se actualiza en cada etapa)

## Fallos de comandos y herramientas
- `pdftotext` no estaba instalado → `pkg install poppler` (ok, ~20 s).
- `java` no estaba instalado → `pkg install openjdk-17` (ok, ~1-2 min) para probar los arneses Java localmente.

## Lo lento o limitante del teléfono
- (pendiente)

## Decisiones tomadas sin consultar
1. **Un solo repositorio** (`actividades-recuperacion`) con las tres actividades en carpetas y una sola página de GitHub Pages: menos enlaces que administrar.
2. **Herramienta propia** en vez de una plataforma: CodeHS/JuiceMind/CodingBat exigen cuentas, no cubren React ni Spring Boot y no permiten el formato paso a paso con nota propia.
3. **Java en el navegador con CheerpJ 5** (JVM en WebAssembly de Leaning Technologies, gratis para uso educativo; es el motor de JavaFiddle) + `tools.jar` (javac de Java 8) copiado de JavaFiddle (Apache-2.0 / GPL+CE). Consecuencia: el código del estudiante se compila como **Java 8** (sin `var`, `record`, `List.of`, `.toList()`). Las actividades se escriben con sintaxis compatible.
4. **Spring Boot no puede arrancar en el navegador** (sin red de sockets, sin classpath de 40 MB y arranque de minutos). Aproximación: el estudiante escribe controladores/servicios reales con anotaciones de Spring; se compilan con javac contra *stubs* de las anotaciones (mismos nombres y paquetes) y un mini-“DispatcherServlet” por reflexión simula las peticiones HTTP (rutas, `@PathVariable`, `@RequestParam`, `@RequestBody`, `ResponseEntity`, inyección por constructor).
5. **Java Web**: igual, con *stubs* de `javax.servlet` (HttpServlet, request/response simulados). JDBC/MySQL no se puede en el navegador: el DAO se hace con lista en memoria.
6. **React**: React 18 UMD + Babel standalone desde CDN, ejecutado en un iframe aislado; pruebas por comportamiento sobre el DOM (render, clics, escritura).
7. **Nota en escala 0.0–5.0** (aprueba con 3.0, como en los cursos).
