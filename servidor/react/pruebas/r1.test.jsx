import { render, screen } from '@testing-library/react';
import { Saludo, Perfil } from '@estudiante/Saludo';
import { pista } from '@ayudas';

test('<Saludo nombre="Ana" /> muestra "Hola, Ana" en un <h2>', () => {
  render(<Saludo nombre="Ana" />);
  const h2 = screen.getByRole('heading', { level: 2 });
  expect(h2.textContent).toBe('Hola, Ana');
});

test('Saludo usa la prop (no un nombre fijo)', () => {
  render(<Saludo nombre="Valentina" />);
  pista('Con nombre="Valentina" el <h2> debe decir "Hola, Valentina": usa {nombre}.', () =>
    expect(screen.getByRole('heading', { level: 2 }).textContent).toBe('Hola, Valentina'));
});

test('<Perfil nombre="Ana" edad={18} /> muestra "Ana tiene 18 años"', () => {
  const { container, unmount } = render(<Perfil nombre="Ana" edad={18} />);
  pista('Arma el texto con un template literal: `${nombre} tiene ${edad} años`', () =>
    expect(container.querySelector('p')?.textContent).toBe('Ana tiene 18 años'));
  unmount();
  const otro = render(<Perfil nombre="Luis" edad={25} />);
  expect(otro.container.querySelector('p')?.textContent).toBe('Luis tiene 25 años');
});
