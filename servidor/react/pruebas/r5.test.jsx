import { render } from '@testing-library/react';
import { FormularioEstudiante } from '@estudiante/FormularioEstudiante';
import { pista, inputsFormulario, escribir, enviar } from '@ayudas';

test('Los inputs son controlados (lo que escribes se ve)', () => {
  const { container } = render(<FormularioEstudiante onAgregar={() => {}} />);
  const [nombre, nota] = inputsFormulario(container);
  escribir(nombre, 'Sofía');
  escribir(nota, '4.2');
  pista('El onChange del nombre debe guardar e.target.value en el estado.', () => expect(nombre.value).toBe('Sofía'));
  pista('El onChange de la nota debe llamar setNota(e.target.value).', () => expect(nota.value).toBe('4.2'));
});

test('Al enviar llama onAgregar con la nota como número', () => {
  const onAgregar = vi.fn();
  const { container } = render(<FormularioEstudiante onAgregar={onAgregar} />);
  const [nombre, nota] = inputsFormulario(container);
  escribir(nombre, 'Sofía');
  escribir(nota, '4.2');
  const prevenido = enviar(container.querySelector('form'));
  pista('Llama e.preventDefault() al enviar (si no, el navegador recarga la página).', () => expect(prevenido).toBe(true));
  expect(onAgregar).toHaveBeenCalledTimes(1);
  pista('La nota debe llegar como número: Number(nota).', () => expect(onAgregar).toHaveBeenCalledWith({ nombre: 'Sofía', nota: 4.2 }));
});

test('Después de enviar, el formulario queda limpio', () => {
  const { container } = render(<FormularioEstudiante onAgregar={() => {}} />);
  const [nombre, nota] = inputsFormulario(container);
  escribir(nombre, 'Sofía');
  escribir(nota, '4.2');
  enviar(container.querySelector('form'));
  expect(nombre.value).toBe('');
  pista('Limpia la nota con setNota(\'\').', () => expect(nota.value).toBe(''));
});

test('Nombre vacío → muestra "El nombre es obligatorio" y no envía', () => {
  const onAgregar = vi.fn();
  const { container } = render(<FormularioEstudiante onAgregar={onAgregar} />);
  const [, nota] = inputsFormulario(container);
  escribir(nota, '3');
  enviar(container.querySelector('form'));
  expect(onAgregar).not.toHaveBeenCalled();
  expect(container.querySelector('form').textContent).toContain('El nombre es obligatorio');
});
