// ============================================================================
//  src/componentes/Estrellas.jsx — calificación con iconos SVG (Lucide)
//
//  Reemplaza los caracteres ★/☆: se ven iguales en todos los celulares y
//  computadoras, sin depender de la fuente del sistema.
//   <Estrellas valor={4} />            → 4 llenas y 1 vacía
//   <Estrellas valor={4.7} compacta /> → una estrella y el número
// ============================================================================

import { Star } from 'lucide-react';

export default function Estrellas({ valor, compacta = false, tamano = 16 }) {
  if (compacta) {
    return (
      <span className="estrellas-compactas" aria-label={`${valor} de 5 estrellas`}>
        <Star size={tamano} fill="currentColor" strokeWidth={0} aria-hidden="true" /> {valor}
      </span>
    );
  }
  const llenas = Math.round(valor);
  return (
    <span className="estrellas-fila" aria-label={`${llenas} de 5 estrellas`}>
      {[1, 2, 3, 4, 5].map(n => (
        <Star key={n} size={tamano} aria-hidden="true" fill={n <= llenas ? 'currentColor' : 'none'} strokeWidth={n <= llenas ? 0 : 1.8} />
      ))}
    </span>
  );
}
