// ============================================================================
//  src/componentes/Campo.jsx — etiqueta + control + error del campo
//
//  La API devuelve los errores de validación por campo ({ campos: { email:
//  'Correo no válido' } }); este componente muestra cada mensaje debajo de su
//  input, para que la persona sepa qué corregir.
// ============================================================================

export default function Campo({ etiqueta, error, ayuda, children, id }) {
  return (
    <label className="campo" htmlFor={id}>
      <span className="campo-etiqueta">{etiqueta}</span>
      {children}
      {ayuda && !error && <span className="campo-ayuda">{ayuda}</span>}
      {error && <span className="campo-error">{error}</span>}
    </label>
  );
}

// Interruptor sí/no (techada, con luz, publicada, activo…).
export function Casilla({ etiqueta, checked, onChange }) {
  return (
    <label className="casilla">
      <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} />
      {etiqueta}
    </label>
  );
}
