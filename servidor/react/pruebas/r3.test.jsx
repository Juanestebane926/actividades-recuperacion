import { render } from '@testing-library/react';
import { ListaEstudiantes } from '@estudiante/ListaEstudiantes';
import { pista, ESTUDIANTES } from '@ayudas';

test('Muestra un <li> por estudiante con nombre y nota', () => {
  const { container } = render(<ListaEstudiantes estudiantes={ESTUDIANTES()} />);
  const li = container.querySelectorAll('li');
  expect(li).toHaveLength(3);
  pista('Cada <li> debe mostrar "nombre - nota", por ejemplo "Ana - 4.6".', () => {
    expect(li[0].textContent).toContain('Ana - 4.6');
    expect(li[2].textContent).toContain('Luisa');
  });
});

test('Cada estudiante tiene su EstadoBadge correcto', () => {
  const { container } = render(<ListaEstudiantes estudiantes={ESTUDIANTES()} />);
  const li = container.querySelectorAll('li');
  pista('Primero haz que se vean los 3 <li>.', () => expect(li).toHaveLength(3));
  pista('Cada <li> debe mostrar su EstadoBadge con la nota de ese estudiante.', () => {
    expect(li[0].querySelector('span')?.textContent).toBe('Aprobado');
    expect(li[2].querySelector('span')?.textContent).toBe('Reprobado');
  });
});

test('Cada <li> tiene una key única (sin advertencias de React)', () => {
  render(<ListaEstudiantes estudiantes={ESTUDIANTES()} />);
  const avisoKey = erroresDeReact().find(m => /unique "key" prop/.test(m));
  pista('React avisó que a los <li> les falta la key.', () => expect(avisoKey).toBeUndefined());
  pista('La key debe ser un dato que identifique a cada estudiante y nunca se repita (no su posición en la lista).', () =>
    expect(/key\s*=\s*\{\s*\w+\.id\s*\}/.test(fuente('ListaEstudiantes.jsx'))).toBe(true));   // sin mostrar el patrón
});

test('Lista vacía → "No hay estudiantes"', () => {
  const { container } = render(<ListaEstudiantes estudiantes={[]} />);
  expect(container.textContent).toContain('No hay estudiantes');
  expect(container.querySelectorAll('li')).toHaveLength(0);
});
