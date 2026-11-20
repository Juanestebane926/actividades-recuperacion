# Actividades de recuperación (Spring Boot, React, Java Web)

Son actividades paso a paso, al estilo DataCamp, para los estudiantes que perdieron la materia. El estudiante abre un enlace, entra con su documento y un PIN, y escribe el código en el navegador.

**El código se ejecuta de verdad en el servidor del curso.** Los errores que ve el estudiante son los reales de `javac`, Spring Boot, Tomcat, esbuild o React. Las pruebas también son reales: JUnit 5 y React Testing Library. Nada se simula.

| Curso | Pasos / pruebas | ▶ Ejecutar | ✔ Comprobar |
|---|---|---|---|
| Spring Boot | 6 / 21 | Arranca la app con **Spring Boot 3.3** y su Tomcat embebido, y le envía las peticiones HTTP de la pestaña `peticiones.http`, como Thunder Client. En el paso del servicio corre un programa de prueba. | **JUnit 5 + MockMvc** sobre un contexto real de Spring Boot: inyección de dependencias, Spring MVC y Jackson. |
| Java Web | 7 / 23 | En los pasos 1 a 4 corre un programa de prueba (`main`). En los pasos 5 a 7 despliega el servlet en **Tomcat 9** real (`javax.servlet`, como en NetBeans) y le envía peticiones HTTP. | **JUnit 5**; las pruebas del servlet hacen peticiones HTTP reales a Tomcat. |
| React | 6 / 21 | **esbuild** arma los archivos con sus `import`/`export`, como lo hace Vite, y la app corre en el navegador con React 18. | **React Testing Library + expect** (el de Jest/Vitest) en un DOM real (jsdom). |

Por ejemplo, estos son mensajes que ve un estudiante:

- `';' expected` con la línea y un `^` en la columna exacta. Debajo va la explicación en español.
- `Parameter 0 of constructor in VacanteController required a bean of type 'VacanteService' that could not be found.`: es el "APPLICATION FAILED TO START" real de Spring Boot.
- `POST /api/estudiantes respondió 200 y se esperaba 400. Tu código lanzó: NumberFormatException: For input string: "diecisiete" en EstudianteServlet.java, línea 89`.
- `ReferenceError: EstadoBadge is not defined en ListaEstudiantes.jsx, línea 17`, que aparece cuando falta el `import`.
- `expect(received).toBe(expected)  Expected: "Aprobado"  Received: ""`.

## Para el estudiante

1. Abre el enlace del curso y entra con su documento, su nombre y un PIN de 4 a 8 números que elige.
2. En cada paso lee la explicación y completa los `____`. Usa **▶ Ejecutar** para ver qué hace el código y **✔ Comprobar** para correr las pruebas. Hay pistas en cada paso.
3. Su avance se guarda en el servidor. Puede seguir desde otro computador con el mismo documento y PIN.
4. En **🏁 Nota** pulsa *Calificar*. La nota queda registrada para el docente, así que no hay comprobantes que enviar.

La navegación (‹ Anterior, los pasos, Siguiente ›) va en la barra superior. El editor, los botones y el resultado caben en la pantalla de un portátil de 1366×768.

## Para el docente: `/docente/`

- Entra con la clave `DOCENTE_CLAVE`.
- Ve una tabla con todos los estudiantes. Puede filtrarla por curso, por estado o con un buscador.
- Por cada estudiante ve las pruebas que pasa en cada paso, su última nota y su mejor nota, y cuántas veces calificó y comprobó.
- En el detalle de un estudiante puede:
  - leer su código;
  - **re-calificar** su código actual o cualquier entrega;
  - **restablecer el PIN** si el estudiante lo olvida;
  - borrar al estudiante.
- **⬇ Descargar notas** genera un CSV que se abre en Excel.

**Nota** = 5 × el promedio de los pasos (pruebas que pasan ÷ pruebas del paso), redondeada a una décima. Se aprueba con 3.0.

## Despliegue actual

- **Página:** GitHub Pages (`https://juanestebane926.github.io/actividades-recuperacion/`). `assets/config.js` dice a qué API llamar.
- **API:** contenedor `recuperacion` en el VPS, detrás de Caddy en `https://recuperacion.23-95-192-198.sslip.io`. Escucha solo en `127.0.0.1:3010` y tiene un tope de 1,5 CPU y 900 MB de RAM.
- **Despliegue automático:** cada push a `main` que toque el servidor, el evaluador o las actividades dispara `.github/workflows/desplegar.yml`. GitHub compila la imagen, la copia por SSH y reemplaza el contenedor con `despliegue/en-vps.sh`. Los secretos del repo son `VPS_HOST`, `VPS_USER`, `VPS_SSH_KEY` (llave solo de despliegue), `VPS_KNOWN_HOSTS` y `DOCENTE_CLAVE`.
- **Para quitarlo del VPS:**
  - `docker rm -f recuperacion && docker volume rm recuperacion-datos`;
  - borrar el bloque `recuperacion.23-95-192-198.sslip.io` del Caddyfile y recargar Caddy;
  - borrar la línea `github-actions-actividades-recuperacion` de `~/.ssh/authorized_keys`.

## Cómo ponerlo en marcha

### Con Docker (recomendado)

```bash
docker build -t recuperacion .
docker run -d --name recuperacion -p 8080:8080 \
  -e DOCENTE_CLAVE='una-clave-larga' \
  -v recuperacion-datos:/datos \
  recuperacion
```

Queda en `http://<servidor>:8080`. Se puede montar en cualquier VPS o en un PC del colegio dentro de la red local; en ese caso los estudiantes entran a `http://IP-del-PC:8080`. La base de datos (SQLite) queda en el volumen `/datos`.

Para ~35 estudiantes a la vez se recomiendan **4 vCPU y 4 GB de RAM**. Cada evaluación Java usa una JVM propia de hasta 384 MB durante 2 a 5 s.

### Sin Docker

Requiere **JDK 17 o superior**, **Maven** (solo para construir) y **Node 22.13 o superior**.

```bash
bash evaluador-java/build.sh          # descarga Spring Boot/Tomcat/JUnit y compila el evaluador
cd servidor && npm ci
DOCENTE_CLAVE='una-clave' node src/servidor.js
```

### Variables de entorno

| Variable | Por defecto | Qué hace |
|---|---|---|
| `DOCENTE_CLAVE` | aleatoria (se muestra al arrancar) | Clave del panel docente. |
| `PORT` | 8080 | Puerto. |
| `DATOS` | `servidor/datos` | Carpeta de la base SQLite. |
| `MAX_PARALELO` | núcleos de la CPU | Evaluaciones simultáneas; las demás esperan en cola. |
| `POOL_SPRING`, `POOL_WEB` | 1 | JVM precalentadas por curso. Subirlas acelera las respuestas pero usa más RAM. |
| `MEMORIA_JAVA` | 384m | Memoria máxima de cada JVM que evalúa. |
| `SANDBOX_UID`/`SANDBOX_GID` | — (en Docker: 10001) | Usuario sin privilegios con el que corre el código de los estudiantes. |

### Probar que todo funciona

Con el servidor en marcha y el repositorio privado de soluciones clonado al lado:

```bash
cd servidor
DOCENTE_CLAVE='una-clave' node pruebas/probar-soluciones.mjs http://localhost:8080 ../../actividades-recuperacion-docente/soluciones
```

El script hace lo siguiente en las tres actividades:
- entra como un estudiante de prueba;
- ejecuta y comprueba cada paso con la solución;
- califica y verifica que la nota sea 5.0 y que aparezca en el panel;
- borra al estudiante de prueba.

## Seguridad

El código de los estudiantes corre en el servidor. Hay varias capas de protección:

- **Revisión previa:** se rechaza el código que use archivos, red, procesos, hilos, reflexión, `System.exit`, `require`, `fetch`, etc. Las actividades no los necesitan.
- **Un proceso nuevo por evaluación:** con límite de tiempo (ciclos infinitos) y de memoria. Ningún estudiante comparte JVM ni carpeta con otro.
- **En Docker, usuario sin privilegios:** el código corre con un usuario que no puede leer ni escribir la base de datos. React corre además con el modelo de permisos de Node: sin escritura y sin procesos hijos.
- **PIN:** se guarda con scrypt. Hay bloqueo temporal tras varios intentos fallidos.

Las pruebas (`evaluador-java/pruebas`, `servidor/react/pruebas`) solo existen en el servidor: la página no las envía al navegador. Pero **si este repositorio sigue siendo público en GitHub, se pueden leer ahí**. No contienen las soluciones, solo los resultados esperados. Si quieres ocultarlas del todo, haz el repositorio privado: el servidor no lo necesita público.

## Estructura

```
index.html, assets/          portada, motor de la interfaz (motor.js) y estilos
spring-boot/ react/ java-web/  actividad.js (explicaciones, pasos, pistas) + codigo/ (código inicial)
docente/                     panel del docente
servidor/                    servidor Node: API, SQLite, cola de evaluación, evaluador React
  react/pruebas/             pruebas de React (Testing Library)
evaluador-java/              evaluador Java: javac + JUnit 5 + Spring Boot / Tomcat reales
  nucleo/                    compila, corre JUnit y el modo Ejecutar
  soporte-spring/, soporte-web/  arranque real de Spring Boot (MockMvc y Tomcat) y de Tomcat 9
  pruebas/spring-boot, pruebas/java-web   pruebas JUnit de cada paso (P1Test…, W1Test…)
Dockerfile
```

## Cómo modificar una actividad

- **Textos, pasos, pistas y peticiones de ejemplo:** `*/actividad.js`. El código inicial está en `*/codigo/`.
- **Pruebas Java:** `evaluador-java/pruebas/<actividad>/<PASO>Test.java`. Son JUnit 5 normales y usan `AppSpring`, `ServidorWeb` y `Http` de `evaluador-java/soporte-*`. Si cambias el soporte, vuelve a correr `build.sh`.
- **Pruebas React:** `servidor/react/pruebas/<paso>.test.jsx`, con Testing Library y la misma sintaxis de Vitest/Jest.
- Si cambias la cantidad de pruebas de un paso, actualiza `nPruebas` en `actividad.js`.

Las soluciones de referencia están en el repositorio **privado** `actividades-recuperacion-docente`.
