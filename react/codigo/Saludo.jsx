// Un componente es una función que recibe "props" y devuelve JSX.

// 1. Recibe la prop "nombre" (desestructurada entre llaves) y muéstrala en el <h2>
export function Saludo({ ____ }) {
  return <h2>Hola, {____}</h2>;
}

// 2. Recibe las props "nombre" y "edad" y muestra: Ana tiene 18 años
//    Usa un template literal: `${nombre} tiene ${edad} años`
export function Perfil({ nombre, edad }) {
  const texto = `____`;
  return <p className="perfil">{texto}</p>;
}
