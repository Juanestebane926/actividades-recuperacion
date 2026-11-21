// Ejemplo y prueba rápida de pruebas/navegador.mjs. Correr desde servidor/:  node pruebas/ejemplo-navegador.mjs
// Levanta su propio servidor (puerto 8092, base temporal), entra como estudiante nuevo al paso 6 de Spring Boot,
// prueba el autocompletado, comprueba el paso y toma una captura.
import { servidorLocal, abrirNavegador, entrarComoEstudiante, pagina } from './navegador.mjs';
import os from 'node:os';
import path from 'node:path';

const srv = await servidorLocal({ puerto: Number(process.env.PUERTO_PRUEBA || 8092) });
const nav = await abrirNavegador();
try {
  await entrarComoEstudiante(nav, srv.url, 'spring-boot', { paso: 5 });   // paso 5 = el sexto (se cuenta desde 0)
  await pagina.pestana(nav, 'VacanteController.java');

  // Autocompletado: abre una línea dentro de buscarPorId y escribe como el estudiante
  await pagina.cursorDespuesDe(nav, 'Vacante vacante = vacanteService.buscarPorId(id);', { lineaNueva: true });
  await nav.escribir('vacanteService.');
  console.log('Sugerencias tras "vacanteService.":', await pagina.sugerencias(nav));
  await nav.tecla('Escape');
  await nav.tecla('Ctrl+Z');   // deshace lo escrito

  // Comprobar el paso con el código inicial
  const res = await pagina.evaluar(nav, 'comprobar');
  console.log('Resultado de Comprobar:\n' + res.slice(0, 400));

  const foto = await nav.foto(path.join(os.tmpdir(), 'ejemplo-navegador.png'));
  console.log('Captura:', foto);
  if (nav.erroresPagina.length) console.log('Errores de la página:', nav.erroresPagina);
} finally {
  await nav.cerrar();
  srv.cerrar();
}
