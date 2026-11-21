import { render, screen, fireEvent } from '@testing-library/react';
import App from '@estudiante/App';
import { pista, inputsFormulario, escribir, enviar } from '@ayudas';

const conteo = c => c.querySelector('.conteo')?.textContent;

function agregar(container, nombre, nota) {
  const [n, k] = inputsFormulario(container);
  escribir(n, nombre);
  escribir(k, nota);
  enviar(container.querySelector('form'));
}

test('La App muestra el título y los 3 estudiantes iniciales', () => {
  const { container } = render(<App />);
  expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Gestión de Estudiantes');
  pista('El estado de App debe empezar con la lista inicial definida arriba del componente.', () => expect(container.querySelectorAll('li')).toHaveLength(3));
});

test('Agregar desde el formulario suma un estudiante a la lista', () => {
  const { container } = render(<App />);
  agregar(container, 'Sofía', '4.2');
  pista('El formulario debe recibir la función que agrega, y agregar debe crear un arreglo nuevo (con push React no se entera del cambio).', () =>
    expect(container.querySelectorAll('li')).toHaveLength(4));
  expect(conteo(container)).toBe('Mostrando 4 de 4');
  expect(container.textContent).toContain('Sofía');
});

test('useEffect actualiza el título de la pestaña', () => {
  const { container } = render(<App />);
  expect(document.title).toBe('Estudiantes: 3');
  agregar(container, 'Sofía', '2.0');
  pista('El useEffect debe volver a ejecutarse cuando cambia la lista: revisa su arreglo de dependencias.', () =>
    expect(document.title).toBe('Estudiantes: 4'));
});

test('El filtro sigue funcionando con los nuevos estudiantes', () => {
  const { container } = render(<App />);
  agregar(container, 'Mario', '1.5');
  fireEvent.click(screen.getByRole('button', { name: /aprobados|todos/i }));
  expect(conteo(container)).toBe('Mostrando 2 de 4');
});
