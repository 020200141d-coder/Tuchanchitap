// ============================================================================
//  src/componentes/Estado.jsx — piezas para los estados de cada pantalla
//
//  Cargando (loading), MensajeError (error, con botón para reintentar) y
//  Vacio (empty, una invitación con acción). El "success" es la pantalla
//  misma; los avisos breves usan <Aviso>.
// ============================================================================

export function Cargando({ texto = 'Cargando…' }) {
  return (
    <div className="estado" role="status" aria-live="polite">
      <span className="girador" aria-hidden="true" />
      {texto}
    </div>
  );
}

export function MensajeError({ error, alReintentar }) {
  if (!error) return null;
  return (
    <div className="aviso aviso-peligro" role="alert">
      <span>{error.mensaje || error.message}</span>
      {alReintentar && (
        <button type="button" className="boton boton-chico" onClick={alReintentar}>
          Reintentar
        </button>
      )}
    </div>
  );
}

export function Vacio({ titulo, texto, children }) {
  return (
    <div className="vacio">
      <p className="vacio-titulo">{titulo}</p>
      {texto && <p className="texto-suave">{texto}</p>}
      {children}
    </div>
  );
}

export function Aviso({ tono = 'exito', children, alCerrar }) {
  if (!children) return null;
  return (
    <div className={`aviso aviso-${tono}`} role={tono === 'peligro' ? 'alert' : 'status'}>
      <span>{children}</span>
      {alCerrar && (
        <button type="button" className="boton-icono" aria-label="Cerrar aviso" onClick={alCerrar}>
          ×
        </button>
      )}
    </div>
  );
}

export const Etiqueta = ({ tono = 'neutro', children }) => <span className={`etiqueta etiqueta-${tono}`}>{children}</span>;
