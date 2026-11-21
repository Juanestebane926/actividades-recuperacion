import { render } from '@testing-library/react';
import { FormularioEstudiante } from '@estudiante/FormularioEstudiante';
import { pista, inputsFormulario, escribir, enviar } from '@ayudas';

test('Los inputs son controlados (lo que escribes se ve)', () => {
  const { container } = render(<FormularioEstudiante onAgregar={() => {}} />);
  const [nombre, nota] = inputsFormulario(container);
  escribir(nombre, 'Sofía');
  escribir(nota, '4.2');
  pista('Lo que escribes en el nombre debe quedar en el estado: revisa qué propiedad del input trae el texto.', () => expect(nombre.value).toBe('Sofía'));
  pista('El onChange de la nota debe guardar lo escrito con su función set.', () => expect(nota.value).toBe('4.2'));
  pista('Al escribir, un input dejó de estar controlado por el estado (React lo avisó): revisa qué guardas en el estado en cada onChange.', () =>
    expect(erroresDeReact().find(x => /controlled input to be uncontrolled|uncontrolled input to be controlled/i.test(x))).toBeUndefined());
});

test('Al enviar llama onAgregar con la nota como número', () => {
  const onAgregar = vi.fn();
  const { container } = render(<FormularioEstudiante onAgregar={onAgregar} />);
  const [nombre, nota] = inputsFormulario(container);
  escribir(nombre, 'Sofía');
  escribir(nota, '4.2');
  const prevenido = enviar(container.querySelector('form'));
  pista('Al enviar, el navegador recargó la página: el evento tiene un método para evitarlo.', () => expect(prevenido).toBe(true));
  expect(onAgregar).toHaveBeenCalledTimes(1);
  pista('La nota llegó como texto: conviértela a número antes de avisarle al padre.', () => expect(onAgregar).toHaveBeenCalledWith({ nombre: 'Sofía', nota: 4.2 }));
});

test('Después de enviar, el formulario queda limpio', () => {
  const { container } = render(<FormularioEstudiante onAgregar={() => {}} />);
  const [nombre, nota] = inputsFormulario(container);
  escribir(nombre, 'Sofía');
  escribir(nota, '4.2');
  enviar(container.querySelector('form'));
  expect(nombre.value).toBe('');
  pista('Después de enviar, la nota debe quedar vacía.', () => expect(nota.value).toBe(''));
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
