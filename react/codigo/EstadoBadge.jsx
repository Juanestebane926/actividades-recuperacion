// Componente presentacional: recibe una nota y muestra si aprobó.

export function EstadoBadge({ nota }) {
  // 1. aprobado debe ser true si la nota es mayor o igual a 3.0
  const aprobado = ____;

  return (
    // 2. Si aprobó, la clase es "badge badge-ok"; si no, "badge badge-mal"
    <span className={aprobado ? '____' : 'badge badge-mal'}>
      {/* 3. Muestra el texto "Aprobado" o "Reprobado" con un ternario */}
      {____}
    </span>
  );
}
