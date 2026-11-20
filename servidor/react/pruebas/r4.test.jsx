import { render, screen, fireEvent } from '@testing-library/react';
import { FiltroAprobados } from '@estudiante/FiltroAprobados';
import { pista, ESTUDIANTES } from '@ayudas';

const conteo = c => c.querySelector('.conteo')?.textContent;

test('Al inicio muestra todos: "Mostrando 3 de 3"', () => {
  const { container } = render(<FiltroAprobados estudiantes={ESTUDIANTES()} />);
  pista('El estado soloAprobados empieza en false, así que al inicio se ven todos.', () => expect(conteo(container)).toBe('Mostrando 3 de 3'));
  expect(container.querySelectorAll('li')).toHaveLength(3);
});

test('Un clic muestra solo los aprobados', () => {
  const { container } = render(<FiltroAprobados estudiantes={ESTUDIANTES()} />);
  fireEvent.click(screen.getByRole('button'));
  pista('Después de un clic soloAprobados debe ser true y filter debe dejar las notas >= 3.0.', () =>
    expect(conteo(container)).toBe('Mostrando 2 de 3'));
  expect(container.textContent).not.toContain('Luisa');
  expect(screen.getByRole('button').textContent).toBe('Ver todos');
});

test('Otro clic vuelve a mostrar todos', () => {
  const { container } = render(<FiltroAprobados estudiantes={ESTUDIANTES()} />);
  fireEvent.click(screen.getByRole('button'));
  fireEvent.click(screen.getByRole('button'));
  pista('El botón debe invertir el valor: setSoloAprobados(!soloAprobados).', () =>
    expect(conteo(container)).toBe('Mostrando 3 de 3'));
});
