import { useState } from 'react';
import { ListaEstudiantes } from './ListaEstudiantes';

export function FiltroAprobados({ estudiantes }) {
  // 1. Estado: ¿mostrar solo los aprobados? Empieza apagado (se ven todos)
  const [soloAprobados, setSoloAprobados] = useState(____);

  // 2. Si soloAprobados es true, deja solo los que tienen nota >= 3.0
  const visibles = soloAprobados
    ? estudiantes.____(est => est.nota >= 3.0)
    : estudiantes;

  return (
    <div>
      {/* 3. Al hacer clic, invierte el valor (true -> false, false -> true) */}
      <button onClick={() => setSoloAprobados(____)}>
        {soloAprobados ? 'Ver todos' : 'Ver solo aprobados'}
      </button>
      <p className="conteo">Mostrando {visibles.length} de {estudiantes.length}</p>
      <ListaEstudiantes estudiantes={visibles} />
    </div>
  );
}
