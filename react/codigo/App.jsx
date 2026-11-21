import { useState, useEffect } from 'react';
import { Saludo } from './Saludo';
import { FormularioEstudiante } from './FormularioEstudiante';
import { FiltroAprobados } from './FiltroAprobados';

const INICIALES = [
  { id: 1, nombre: 'Ana', nota: 4.6 },
  { id: 2, nombre: 'Pedro', nota: 3.1 },
  { id: 3, nombre: 'Luisa', nota: 2.8 },
];

// App es el orquestador: guarda la lista y se la pasa a los hijos.
export default function App() {
  // 1. Estado con la lista de estudiantes (empieza con la lista inicial de arriba)
  const [estudiantes, setEstudiantes] = useState(____);

  // 2. useEffect: cada vez que cambie la lista, actualiza el título de la pestaña
  useEffect(() => {
    document.title = `Estudiantes: ${estudiantes.length}`;
  }, [____]);

  // 3. Agrega un estudiante SIN modificar el arreglo original: copia con spread (...)
  function agregar(nuevo) {
    const conId = { ...nuevo, id: estudiantes.length + 1 };
    setEstudiantes([...____, conId]);
  }

  return (
    <div className="contenedor">
      <h1>Gestión de Estudiantes</h1>
      <Saludo nombre="profe" />
      {/* 4. Pásale al formulario la función que agrega */}
      <FormularioEstudiante onAgregar={____} />
      <FiltroAprobados estudiantes={estudiantes} />
    </div>
  );
}
