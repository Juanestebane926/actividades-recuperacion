# REGISTRO de trabajo autónomo (2026-11-20)

Entorno: teléfono Kalley Black Z, Android 12, Termux, Claude Code (Opus 5.5) vía T3 Code.

## Línea de tiempo por etapa

| Etapa | Inicio | Fin | Notas |
|---|---|---|---|
| 1. Investigación de repos | 02:36 | 02:40 | 45 repos listados, 14 clonados y revisados. Resultado en `docs/CURSOS.md` |
| 2. Elección de herramienta | 02:40 | 02:47 | Búsqueda web + revisión del código de JavaFiddle |
| 2b. Prototipo CheerpJ (riesgo principal) | 02:42 | 02:46 | javac funciona en Chromium headless: 1.ª compilación 38 s, siguientes ~13 s, ejecución 4 s (en el teléfono) |
| 3. Motor común + simulador Java + Spring Boot | 02:47 | 03:12 | Stubs de Spring/Servlet, MiniSpring, arnés de pruebas, motor web, actividad Spring (6 pasos, 21 comprobaciones) |

| 4. Java Web (7 pasos, 23 comprobaciones) | 03:14 | 03:45 | Probado en navegador: errores de compilación con pista, nota 5.0 con la solución, re-calificación docente detecta código alterado |
| 5. React (6 pasos, 21 comprobaciones) | 03:20 | 03:40 | Probado en navegador: nota 5.0 con la solución en 2 s; variantes incorrectas detectadas (sin key, sin preventDefault, push, `>` en vez de `>=`) |
| 7. Mejoras + repo privado de soluciones + README | 03:46 | 03:52 | «Ejecutar» en Java muestra cada llamada; soluciones movidas a `actividades-recuperacion-docente` (privado) |
| 8. Revisión visual (escritorio y 390 px) | 03:52 | 03:57 | Capturas en `docs/capturas/`; sin scroll horizontal en móvil |
| 6. Página del docente /verificar/ | 03:16 | 03:45 | Probado: firma válida, comprobante adulterado detectado, verificación rápida del código de 8 caracteres |

## Estado actual / qué sigue
- 03:57 TERMINADO: 3 actividades publicadas, probadas en Chromium headless y documentadas.
- 03:46 Las 3 actividades publicadas y probadas en el navegador. Sigue: re-probar Spring tras corrección de parámetros, README, PDF plan B opcional, capturas.
- 03:12 Spring Boot funcionando y probado en el navegador (nota y código de verificación OK). Sigue: re-probar corrección de nombres de parámetros, página de verificación, luego Java Web y React.

## Fallos de comandos y herramientas
- `pdftotext` no estaba instalado → `pkg install poppler` (ok, ~20 s).
- Prototipo: CheerpJ no acepta subcarpetas en `/str/` (`javac: file not found: /str/r2/...`) → se escriben los archivos planos en `/str/` y se sobrescriben.
- En CheerpJ la reflexión no entrega nombres de parámetros aunque se compile con `-parameters` → `@RequestParam String nombre` no encontraba el parámetro. Solución: el simulador lee los nombres desde el código fuente del estudiante.
- Primer arranque del motor: `document.getElementById('app')` se evaluaba antes de existir el `<body>` → se movió a `iniciar()`.
- `git commit` falló por falta de identidad → se configuró solo en el repo con el correo *noreply* de GitHub (para no exponer el correo personal).
- `java` no estaba instalado → `pkg install openjdk-17` (ok, ~1-2 min) para probar los arneses Java localmente.

## Lo lento o limitante del teléfono
- Chromium headless dentro de proot: la 1.ª compilación Java con CheerpJ tarda 38–51 s; las siguientes ~13–25 s. En un PC normal se espera bastante menos (CheerpJ usa JIT a WebAssembly).
- Cada publicación en GitHub Pages tarda ~40–60 s en reflejarse y el CDN cachea los .js ~10 min: tuve que agregar `?v=N` a los scripts para probar cambios.
- El navegador de Playwright (`--isolated`) perdió el localStorage entre sesiones: hubo que reinyectar el código de prueba. Pegar soluciones completas en `browser_evaluate` cuesta muchos tokens; se usaron pares buscar/reemplazar.
- Playwright solo permite guardar capturas en la carpeta scratch de la sesión: se copiaron luego al repo.
- Compilar el simulador con el JDK 17 de Termux: ~5 s. Correr las 21 pruebas de Spring localmente: ~6 s.

## Decisiones tomadas sin consultar
1. **Un solo repositorio** (`actividades-recuperacion`) con las tres actividades en carpetas y una sola página de GitHub Pages: menos enlaces que administrar.
2. **Herramienta propia** en vez de una plataforma: CodeHS/JuiceMind/CodingBat exigen cuentas, no cubren React ni Spring Boot y no permiten el formato paso a paso con nota propia.
3. **Java en el navegador con CheerpJ 5** (JVM en WebAssembly de Leaning Technologies, gratis para uso educativo; es el motor de JavaFiddle) + `tools.jar` (javac de Java 8) copiado de JavaFiddle (Apache-2.0 / GPL+CE). Consecuencia: el código del estudiante se compila como **Java 8** (sin `var`, `record`, `List.of`, `.toList()`). Las actividades se escriben con sintaxis compatible.
4. **Spring Boot no puede arrancar en el navegador** (sin red de sockets, sin classpath de 40 MB y arranque de minutos). Aproximación: el estudiante escribe controladores/servicios reales con anotaciones de Spring; se compilan con javac contra *stubs* de las anotaciones (mismos nombres y paquetes) y un mini-“DispatcherServlet” por reflexión simula las peticiones HTTP (rutas, `@PathVariable`, `@RequestParam`, `@RequestBody`, `ResponseEntity`, inyección por constructor).
5. **Java Web**: igual, con *stubs* de `javax.servlet` (HttpServlet, request/response simulados). JDBC/MySQL no se puede en el navegador: el DAO se hace con lista en memoria.
6. **React**: React 18 UMD + Babel standalone desde CDN, ejecutado en un iframe aislado; pruebas por comportamiento sobre el DOM (render, clics, escritura).
7. **Nota en escala 0.0–5.0** (aprueba con 3.0, como en los cursos).

## Decisiones adicionales
8. Las **soluciones** no se publican: van en el repo privado `actividades-recuperacion-docente`.
9. El código inicial usa espacios `____` solo en el paso donde aparece cada archivo; los pasos posteriores usan `// TODO` compilable, para que un paso no bloquee a otro.
10. La nota final se calcula re-ejecutando **todas** las pruebas sobre el código actual (no se suman los “Comprobar” anteriores).
11. No se generó PDF (plan B) porque las tres actividades funcionan interactivas.
12. Se omitieron del contenido evaluable: JPA/Security (Spring), JDBC/MySQL (Java Web) y TanStack Query (React), porque requieren servidor/BD reales.

## Resumen de rendimiento
- Duración total: ~1 h 21 min (02:36 → 03:57).
- Lo más lento: CheerpJ en Chromium dentro de proot (40–60 s para la 1.ª compilación, 13–25 s las siguientes, ~45–60 s calificar todo Java) y las esperas de despliegue de GitHub Pages (~45 s por cambio).
- Termux con JDK 17 nativo fue rápido para validar las pruebas Java sin navegador (~6 s por corrida completa).
