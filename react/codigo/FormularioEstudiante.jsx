import { useState } from 'react';

// Formulario controlado: el valor de cada input vive en el estado.
export function FormularioEstudiante({ onAgregar }) {
  const [nombre, setNombre] = useState('');
  const [nota, setNota] = useState('');
  const [error, setError] = useState('');

  function handleSubmit(e) {
    // 1. Evita que el formulario recargue la página
    e.____();

    // Validación: el nombre no puede estar vacío
    if (nombre.trim() === '') {
      setError('El nombre es obligatorio');
      return;
    }

    // 2. Avisa al componente padre. La nota llega como texto: conviértela a número
    onAgregar({ nombre: nombre.trim(), nota: ____(nota) });

    // 3. Limpia el formulario
    setNombre('');
    setNota(____);
    setError('');
  }

  return (
    <form onSubmit={handleSubmit}>
      {/* 4. Input controlado: value viene del estado y onChange lo actualiza */}
      <input
        name="nombre"
        placeholder="Nombre"
        value={nombre}
        onChange={e => setNombre(e.target.____)}
      />
      <input
        name="nota"
        placeholder="Nota (0 - 5)"
        type="number"
        step="0.1"
        value={nota}
        onChange={e => ____(e.target.value)}
      />
      <button type="submit">Agregar</button>
      {error && <p className="error">{error}</p>}
    </form>
  );
}
