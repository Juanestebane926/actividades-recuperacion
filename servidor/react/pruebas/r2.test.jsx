import { render } from '@testing-library/react';
import { EstadoBadge } from '@estudiante/EstadoBadge';
import { pista } from '@ayudas';

function badge(nota) {
  const { container } = render(<EstadoBadge nota={nota} />);
  const span = container.querySelector('span');
  pista('EstadoBadge debe devolver un <span>.', () => expect(span).not.toBeNull());
  return span;
}

test('Nota 4.5 → "Aprobado" con clase "badge badge-ok"', () => {
  const s = badge(4.5);
  expect(s.textContent).toBe('Aprobado');
  pista('Si aprobó, la clase debe ser exactamente "badge badge-ok".', () => expect(s.className).toBe('badge badge-ok'));
});

test('Nota 2.8 → "Reprobado" con clase "badge badge-mal"', () => {
  const s = badge(2.8);
  expect(s.textContent).toBe('Reprobado');
  expect(s.className).toBe('badge badge-mal');
});

test('Nota 3.0 exacta → "Aprobado"', () => {
  const s = badge(3.0);
  pista('Con 3.0 exacto también se aprueba: revisa el operador de la comparación.', () => expect(s.textContent).toBe('Aprobado'));
});
