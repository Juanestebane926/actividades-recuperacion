# Actividades de recuperación (Spring Boot, React, Java Web)

Actividades paso a paso al estilo DataCamp para estudiantes que perdieron la materia.
Se abren con un enlace y se resuelven en el navegador: no hay que instalar nada, clonar repositorios ni crear cuentas.

**Sitio:** https://juanestebane926.github.io/actividades-recuperacion/

| Curso | Enlace para estudiantes | Pasos | Comprobaciones | Motor |
|---|---|---|---|---|
| Spring Boot | https://juanestebane926.github.io/actividades-recuperacion/spring-boot/ | 6 | 21 | javac real (CheerpJ) + simulador de Spring |
| React | https://juanestebane926.github.io/actividades-recuperacion/react/ | 6 | 21 | React 18 + Babel en el navegador |
| Java Web | https://juanestebane926.github.io/actividades-recuperacion/java-web/ | 7 | 23 | javac real (CheerpJ) + simulador de Servlets |
| Docente | https://juanestebane926.github.io/actividades-recuperacion/verificar/ | — | — | Verificación de comprobantes y re-calificación |

## Cómo funciona para el estudiante

1. Abre el enlace, escribe su nombre y documento.
2. En cada paso lee la explicación, completa los espacios `____` del código y usa **▶ Ejecutar** (ver qué hace) y **✔ Comprobar** (pruebas automáticas con mensajes de ayuda). Hay pistas por paso.
3. En **🏁 Nota** pulsa *Calificar mi actividad*: se ejecutan todas las pruebas sobre su código actual y ve su nota (0.0–5.0, cada paso pesa igual), un **código de verificación** de 8 caracteres y un **comprobante** para copiar o descargar.
4. Envía el comprobante al docente.

El avance se guarda en el navegador (localStorage): si cierra la pestaña, continúa donde iba (mismo navegador y equipo).

## Cómo se calcula la nota

`nota = 5 × promedio_de_los_pasos(comprobaciones superadas / comprobaciones del paso)`, redondeada a una décima.
Un paso con espacios `____` sin completar cuenta 0. Si el proyecto Java no compila completo, se califica cada paso por separado para no perder los pasos que sí compilan.

## Cómo verifica el docente

- **Rápido:** en `/verificar/` → *Verificación rápida*, con nombre, documento, nota, fecha y código.
- **Seguro:** pegar el comprobante completo (`REC1.…`) en `/verificar/`: se valida la firma (detecta cualquier cambio en nota, nombre o código) y con **Re-calificar ejecutando su código** se vuelven a correr todas las pruebas con el código entregado. Esto es lo que realmente impide inventar una nota.

## Estructura

```
index.html              portada con los 3 cursos
assets/motor.js         motor común: pasos, editor (CodeMirror), comprobar, nota, comprobante
assets/motor-java.js    evaluador Java: CheerpJ 5 + javac (assets/java/tools.jar)
assets/motor-react.js   evaluador React: Babel + React 18 en iframe, pruebas sobre el DOM
assets/firma.js         código de verificación y comprobante firmado (HMAC-SHA-256)
assets/java/sim-*.jar   stubs de Spring/Servlet + MiniSpring + pruebas (compilado de java-sim/)
java-sim/               fuentes del simulador y de las pruebas Java (build.sh, probar-local.sh)
spring-boot/, react/, java-web/   actividad.js (explicaciones, pasos, pruebas React) + codigo/ (código inicial)
verificar/              página del docente
docs/CURSOS.md          investigación: qué repositorio corresponde a qué curso y qué temas tiene
REGISTRO.md             bitácora del trabajo autónomo (tiempos, fallos, decisiones)
```

Las soluciones de referencia están en el repositorio **privado** `actividades-recuperacion-docente`.

## Modificar una actividad

- Textos, pasos y pistas: `*/actividad.js`. Código inicial: `*/codigo/`.
- Pruebas Java: `java-sim/src/curso/sim/SuitesSpring.java` y `SuitesWeb.java`; luego `java-sim/build.sh` (requiere JDK 17+) y subir `assets/java/`.
- Pruebas React: dentro de `react/actividad.js` (`pruebas` de cada paso).
- Tras cambiar JS/CSS, sube el número `?v=` en los `<script>` de los `index.html` (GitHub Pages cachea ~10 min).

## Limitaciones conocidas

- **Spring Boot y Servlets se simulan:** el código se compila de verdad con javac, pero no corre un Spring/Tomcat real (no es posible en el navegador). Un mini-Spring lee las anotaciones y llama los métodos como lo haría Spring. JPA, base de datos y Spring Security no se evalúan.
- **Java 8:** el compilador disponible en el navegador es javac 8 (sin `var`, `record`, `List.of`, `.toList()`). Las actividades están escritas para eso.
- **Primera compilación lenta:** la máquina virtual de Java se descarga y arranca en el navegador (≈ 20–60 s la primera vez; luego unos segundos). Requiere internet.
- **Soluciones y clave en código público:** las pruebas validan comportamiento (no comparan con la respuesta escrita), pero un estudiante con conocimientos podría leer las pruebas o la clave del código de verificación. Por eso la verificación fuerte es re-calificar el comprobante.

Java en el navegador: [CheerpJ](https://cheerpj.com/) (licencia gratuita para uso educativo — Built with CheerpJ).
