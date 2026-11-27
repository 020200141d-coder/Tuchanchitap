// ============================================================================
//  src/componentes/Estado.jsx — piezas para los estados de cada pantalla
//
//  Cargando (girador), Esqueletos (tarjetas con brillo mientras llegan los
//  datos), MensajeError (con reintentar), Vacio (invitación con acción) y
//  Aviso. Los avisos de ÉXITO se muestran como toast de SweetAlert2 (se
//  cierran solos); los de error o advertencia quedan fijos en la pantalla
//  para que la persona los lea con calma.
// ============================================================================

import { useEffect } from 'react';
import { aviso } from '../util/alertas';
import { SearchX, X } from 'lucide-react';

export function Cargando({ texto = 'Cargando…' }) {
  return (
    <div className="estado" role="status" aria-live="polite">
      <span className="girador" aria-hidden="true" />
      {texto}
    </div>
  );
}

export function Esqueletos({ cantidad = 3 }) {
  return (
    <div className="rejilla" aria-busy="true" aria-label="Cargando canchas">
      {Array.from({ length: cantidad }, (_, i) => (
        <div key={i} className="esqueleto">
          <div className="brillo" style={{ height: 170, borderRadius: 0 }} />
          <div style={{ padding: 16 }}>
            <div className="brillo" style={{ height: 22, width: '70%' }} />
            <div className="brillo" style={{ height: 14, width: '45%', marginTop: 10 }} />
            <div className="brillo" style={{ height: 32, width: '90%', marginTop: 16 }} />
          </div>
        </div>
      ))}
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

export function Vacio({ titulo, texto, children, icono: Icono = SearchX }) {
  return (
    <div className="vacio">
      <Icono className="vacio-icono" size={42} strokeWidth={1.6} aria-hidden="true" />
      <p className="vacio-titulo">{titulo}</p>
      {texto && <p className="texto-suave">{texto}</p>}
      {children}
    </div>
  );
}

export function Aviso({ tono = 'exito', children, alCerrar }) {
  const esToast = tono === 'exito' && typeof children === 'string';
  useEffect(() => {
    if (!esToast || !children) return;
    aviso(children, 'success');
    alCerrar?.();
  }, [esToast, children]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!children || esToast) return null;
  return (
    <div className={`aviso aviso-${tono}`} role={tono === 'peligro' ? 'alert' : 'status'}>
      <span>{children}</span>
      {alCerrar && (
        <button type="button" className="boton-icono" aria-label="Cerrar aviso" onClick={alCerrar}>
          <X size={18} aria-hidden="true" />
        </button>
      )}
    </div>
  );
}

export const Etiqueta = ({ tono = 'neutro', children }) => <span className={`etiqueta etiqueta-${tono}`}>{children}</span>;
