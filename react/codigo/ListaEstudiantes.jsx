import { EstadoBadge } from './EstadoBadge';

// Recibe un arreglo de estudiantes: [{ id: 1, nombre: 'Ana', nota: 4.6 }, ...]

export function ListaEstudiantes({ estudiantes }) {
  // 1. Si la lista está vacía, muestra un mensaje en lugar de la lista
  if (estudiantes.length === ____) {
    return <p className="vacio">No hay estudiantes</p>;
  }

  return (
    <ul>
      {/* 2. Recorre la lista con map. Cada <li> necesita una key única: usa el id */}
      {estudiantes.____(est => (
        <li key={____}>
          {est.nombre} - {est.nota}
          {/* 3. Reutiliza el componente del paso anterior con la nota del estudiante */}
          <EstadoBadge nota={____} />
        </li>
      ))}
    </ul>
  );
}
