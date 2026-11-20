// Carga la definición de cada actividad desde <id>/actividad.js (el mismo archivo que usa la página),
// así los pasos, los archivos y lo que se compila en cada paso están en un solo lugar.
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { RAIZ, EVALUADOR_JAVA } from './config.js';

// Lo que solo sabe el servidor: qué motor usa cada actividad y dónde están sus pruebas
const MOTORES = {
  'spring-boot': {
    tipo: 'java', lib: 'spring', paquete: 'com.curso.vacantes', aplicacion: 'com.curso.vacantes.AplicacionVacantes',
    // Clase principal de Spring Boot (en un proyecto real la genera Spring Initializr)
    extras: {
      'AplicacionVacantes.java': `package com.curso.vacantes;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
public class AplicacionVacantes {
    public static void main(String[] args) {
        SpringApplication.run(AplicacionVacantes.class, args);
    }
}
`
    }
  },
  'java-web': { tipo: 'java', lib: 'web', paquete: 'com.mycompany.recuperacion', extras: {} },
  'react': { tipo: 'react' },
};

function cargar(id) {
  const archivo = path.join(RAIZ, id, 'actividad.js');
  const ventana = {};
  vm.runInNewContext(fs.readFileSync(archivo, 'utf8'), { window: ventana }, { filename: archivo, timeout: 2000 });
  const A = ventana.ACTIVIDAD;
  const motor = MOTORES[id];
  const originales = {};
  for (const [n, f] of Object.entries(A.archivos)) originales[n] = fs.readFileSync(path.join(RAIZ, id, f.ruta), 'utf8').replace(/\r\n/g, '\n');
  const pasos = A.pasos.map(p => {
    const prueba = motor.tipo === 'java'
      ? path.join(EVALUADOR_JAVA, 'pruebas', id, p.id.toUpperCase() + 'Test.java')
      : path.join(RAIZ, 'servidor', 'react', 'pruebas', p.id + '.test.jsx');
    if (!fs.existsSync(prueba)) throw new Error('Falta el archivo de pruebas ' + prueba);
    return { id: p.id, titulo: p.titulo, compilar: p.compilar, archivos: p.archivos, nPruebas: p.nPruebas, prueba, ejecutar: p.ejecutar, demo: p.demo };
  });
  return { id, curso: A.curso, titulo: A.titulo, motor, pasos, archivos: A.archivos, originales, componentes: A.componentes || [] };
}

export const ACTIVIDADES = {};
for (const id of Object.keys(MOTORES)) ACTIVIDADES[id] = cargar(id);

/** Archivos editables por el estudiante (los de solo lectura siempre se toman del original). */
export function archivosValidos(act, recibidos) {
  const r = {};
  for (const [n, f] of Object.entries(act.archivos)) {
    const v = recibidos && typeof recibidos[n] === 'string' && !f.soloLectura ? recibidos[n] : act.originales[n];
    r[n] = v.length > 60000 ? v.slice(0, 60000) : v;
  }
  return r;
}
