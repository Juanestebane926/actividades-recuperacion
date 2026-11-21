---
name: probar-en-navegador
description: Probar de verdad la página de las actividades (editor, autocompletado, Ejecutar/Comprobar, pistas, guía, capturas) en un Chrome sin ventana, con el servidor local. Úsala siempre que tengas que reproducir un bug de la interfaz, ver qué sugiere el autocompletado, simular lo que teclea un estudiante o tomar capturas, en vez de armar a mano scripts de CDP con código en cadenas.
---

# Probar la página en un navegador sin ventana

El repositorio trae una herramienta lista: `servidor/pruebas/navegador.mjs`. Levanta el servidor del curso con una base de datos propia, abre Chrome sin ventana por CDP y da atajos para manejar la página del estudiante. El ejemplo completo está en `servidor/pruebas/ejemplo-navegador.mjs` (córrelo desde `servidor/` con `node pruebas/ejemplo-navegador.mjs`).

## Por qué existe (lo que siempre sale mal)

Al probar la página, el código JavaScript que corre en el navegador suele pasar por tres capas: un heredoc de bash, un template literal de Node y la evaluación de una cadena por CDP. Cada capa interpreta las comillas, `\n` y `${...}` a su manera, y aparecen errores como:

- `SyntaxError: Invalid or unexpected token`, porque un `'\\n'` llegó a la página como un salto de línea real;
- `unexpected EOF while looking for matching '` en bash, por las comillas dentro de un heredoc;
- un `${variable}` que se reemplazó en Node cuando debía reemplazarse en la página, o al revés;
- `Object reference chain is too long` u otro error al devolver por valor un objeto que no se puede convertir a JSON (por ejemplo, el editor de CodeMirror).

## Reglas

1. **Escribe el script en un archivo `.mjs` con la herramienta de edición de archivos** (en tu carpeta temporal o scratchpad). No lo escribas con un heredoc ni con `node -e`.
2. **Al navegador pásale funciones, nunca código en cadenas.** Usa `nav.ev(fn, ...args)`: la función viaja tal cual y los argumentos viajan como JSON. Dentro de la función puedes usar `'\n'`, comillas y template literals con normalidad, porque se interpretan una sola vez, en la página.
   ```js
   // Bien
   await nav.ev((sel, texto) => document.querySelector(sel).innerText.includes(texto), '#salida', 'Muy bien');
   // Mal: código armado como cadena
   await ev(`document.querySelector('${sel}').innerText.includes('${texto}')`);
   ```
3. **Usa tu propio servidor:** `servidorLocal({ puerto })` usa un puerto aparte (8092 por defecto) y una base de datos temporal, así no tocas la base ni el servidor de nadie más (el 8090 suele estar en uso). Cada agente debe usar un puerto distinto.
4. **Cierra todo en un `finally`** (`nav.cerrar()` y `srv.cerrar()`). Si el script se corta, revisa `netstat -ano | grep LISTEN` y termina los procesos que quedaron colgados.
5. **No toques producción** (la API del VPS ni GitHub Pages) para probar: todo va contra el servidor local.

## Plantilla

```js
import { servidorLocal, abrirNavegador, entrarComoEstudiante, pagina, solucion } from 'file:///C:/Users/juane/Documents/GitHub/Actividades de recuperación/actividades-recuperacion/servidor/pruebas/navegador.mjs';

const srv = await servidorLocal({ puerto: 8093 });
const nav = await abrirNavegador({ ancho: 1366, alto: 768 });   // oscuro: true para el modo oscuro
try {
  await entrarComoEstudiante(nav, srv.url, 'spring-boot', { paso: 5 });   // pasos desde 0: 5 = paso 6
  await pagina.pestana(nav, 'VacanteService.java');
  await pagina.ponerCodigo(nav, solucion('spring', 'VacanteService.java'));
  console.log(await pagina.evaluar(nav, 'comprobar'));
  await nav.foto('C:/ruta/temporal/captura.png');
} finally {
  await nav.cerrar();
  srv.cerrar();
}
```

Si tu script está fuera del repositorio, importa con la ruta absoluta en forma de URL `file:///C:/...`, como en la plantilla. En Windows, Node no acepta `from 'C:/...'` y falla con `ERR_UNSUPPORTED_ESM_URL_SCHEME`. Los espacios y las tildes de la ruta pueden ir tal cual.

## Qué trae

**`servidorLocal({ puerto, clave, datos })`** devuelve `{ url, clave, datos, log(), cerrar() }`. Usa el código actual del repositorio (no hace falta reiniciar nada) y una base vacía en una carpeta temporal.

**`abrirNavegador({ ancho, alto, oscuro })`** devuelve `nav` con:
- `ir(url)`: navega y espera la carga.
- `ev(fn, ...args)`: ejecuta `fn` en la página (puede ser `async`) y devuelve el resultado convertido a JSON.
- `esperar(fn, args, { hasta })`: repite `fn` en la página hasta que devuelva algo verdadero.
- `escribir(texto)`: teclea letra por letra, así se abre el autocompletado. `{ de_golpe: true }` pega todo junto, sin sugerencias.
- `tecla('Enter' | 'Backspace' | 'Tab' | 'Escape' | 'ArrowDown' | 'Ctrl+Enter' | 'Shift+Tab' | 'Ctrl+Space' | 'Ctrl+Z' | 'Ctrl+Slash', veces)`.
- `foto(ruta, { completa })`, `tamano(ancho, alto, oscuro)`, `cdp(metodo, params)` para lo que falte, y `erroresPagina` con los errores de JavaScript y `console.error` de la página.

**`entrarComoEstudiante(nav, url, curso, { paso, guia, correo })`** crea un estudiante nuevo por la API, guarda su sesión en la página y abre el paso. Por defecto marca la guía de la primera vez como vista, para que no tape la pantalla; usa `guia: true` si quieres probar la guía. Los cursos son `spring-boot`, `java-web` y `react`.

**`pagina.*`** (todas reciben `nav` primero):
- `pestana(nav, 'Archivo.java')`: abre esa pestaña (o `'peticiones.http'`).
- `codigo(nav)`: el texto del archivo abierto.
- `ponerCodigo(nav, texto)`: reemplaza el archivo como si el estudiante pegara.
- `cursorDespuesDe(nav, ancla, { lineaNueva })`: pone el cursor después del texto `ancla`; con `lineaNueva` abre una línea debajo, con sangría.
- `sugerencias(nav)`: lo que muestra ahora el menú del autocompletado, o `null` si no hay menú.
- `evaluar(nav, 'comprobar' | 'ejecutar')`: pulsa el botón, espera a que termine y devuelve el texto del resultado.
- `resultado(nav)` y `clic(nav, selector)`.

**`solucion('spring' | 'web' | 'react', 'Archivo')`** lee la solución de referencia del repositorio privado `actividades-recuperacion-docente`, que está al lado de este.

## Trampas de esta aplicación

- **`cm.setValue()` no simula al estudiante:** la página ignora los cambios con origen `setValue`, así que no se guardan ni se marcan los `____`. Usa `pagina.ponerCodigo` (origen `paste`), `nav.escribir` o `cm.replaceRange(...)`.
- **El autocompletado solo se abre cuando entra un carácter suelto:** enseguida después de `.` o `@`, y con palabras desde la segunda letra. Por eso `escribir` va letra por letra. Con un menú abierto, `Enter` y `Tab` aceptan la sugerencia marcada, como en un IDE; para bajar de línea sin aceptar, cierra antes con `Escape`.
- **Los diálogos** (como "¿salir sin guardar?" al navegar) se aceptan solos, para que `ir()` no se quede colgado.
- **El editor no se puede devolver con `ev`:** no hagas `return cm` ni `window.cm = …` como último valor. Devuelve datos simples (texto, números, arreglos).
- **Pasos desde 0:** `#menu-pasos button[data-i="5"]` es el paso 6, y `data-i` igual al número de pasos es la pantalla de la nota.
- **Tiempos:** en este PC, Comprobar en Java tarda de 1 a 4 s, pero la primera vez arranca la JVM y puede tardar unos 10 s. En React tarda unos 2 s. `pagina.evaluar` ya espera, hasta 90 s.
- **Pistas:** se desbloquean con comprobaciones fallidas. Para probarlas, pulsa Comprobar varias veces con el código inicial.
- **`localhost` o `127.0.0.1`:** con cualquiera de los dos, `assets/config.js` hace que la página use la API de su mismo servidor. Con otro nombre de host apuntaría a producción: no lo hagas.
- **En la terminal (Git Bash en Windows),** las rutas con espacios van entre comillas. Para ver capturas, ábrelas con la herramienta de lectura de archivos.
