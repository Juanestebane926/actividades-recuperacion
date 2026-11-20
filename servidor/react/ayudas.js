// Ayudas para las pruebas de React (se importan como '@ayudas').
import { fireEvent } from '@testing-library/react';

/** Ejecuta fn; si falla, antepone una pista en español al mensaje real del error. */
export function pista(texto, fn) {
  try {
    return fn();
  } catch (e) {
    e.pista = '💡 ' + texto;
    throw e;
  }
}

/** Los dos <input> del formulario (por su atributo name, o los dos primeros). */
export function inputsFormulario(container) {
  const todos = container.querySelectorAll('input');
  const nombre = container.querySelector('input[name="nombre"]') || todos[0];
  const nota = container.querySelector('input[name="nota"]') || todos[1];
  pista('El formulario debe tener dos <input>: uno con name="nombre" y otro con name="nota".', () => {
    expect(nombre).toBeTruthy();
    expect(nota).toBeTruthy();
  });
  return [nombre, nota];
}

/** Escribe como el usuario: cambia el valor y dispara el evento que escucha onChange. */
export function escribir(input, valor) {
  fireEvent.change(input, { target: { value: valor } });
}

/** Envía el formulario. Devuelve true si el código llamó e.preventDefault(). */
export function enviar(form) {
  pista('No encontré el <form>.', () => expect(form).toBeTruthy());
  return !fireEvent.submit(form);
}

export const ESTUDIANTES = () => [
  { id: 1, nombre: 'Ana', nota: 4.6 },
  { id: 2, nombre: 'Pedro', nota: 3.1 },
  { id: 3, nombre: 'Luisa', nota: 2.8 },
];
