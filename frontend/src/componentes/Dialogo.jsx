// ============================================================================
//  src/componentes/Dialogo.jsx — ventana modal para formularios (crear/editar)
//
//  Usa el elemento nativo <dialog> con showModal(): el navegador ya resuelve
//  el foco, la tecla Esc y el fondo oscuro, sin librerías. Los paneles del
//  dueño y del admin hacen sus CRUD dentro de estos diálogos.
//
//  Uso: <Dialogo abierto={x} titulo="Nueva cancha" alCerrar={() => setX(false)}>…</Dialogo>
// ============================================================================

import { useEffect, useRef } from 'react';

export default function Dialogo({ abierto, titulo, alCerrar, children, ancho = 560 }) {
  const ref = useRef(null);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (abierto && !d.open) d.showModal();
    if (!abierto && d.open) d.close();
  }, [abierto]);

  return (
    <dialog
      ref={ref}
      className="dialogo"
      style={{ maxWidth: ancho }}
      onClose={alCerrar}
      onClick={e => e.target === ref.current && alCerrar()} // clic en el fondo
      aria-labelledby="titulo-dialogo"
    >
      {abierto && (
        <div className="dialogo-contenido">
          <div className="dialogo-cabecera">
            <h2 id="titulo-dialogo">{titulo}</h2>
            <button type="button" className="boton-icono" aria-label="Cerrar" onClick={alCerrar}>
              ×
            </button>
          </div>
          {children}
        </div>
      )}
    </dialog>
  );
}

// Confirmación corta para acciones irreversibles (borrar, cancelar reserva).
export function Confirmar({ abierto, titulo, texto, textoBoton = 'Confirmar', peligro = true, ocupado, alConfirmar, alCerrar }) {
  return (
    <Dialogo abierto={abierto} titulo={titulo} alCerrar={alCerrar} ancho={420}>
      <div className="dialogo-texto">{texto}</div>
      <div className="fila-botones">
        <button type="button" className="boton" onClick={alCerrar}>
          Volver
        </button>
        <button type="button" className={`boton ${peligro ? 'boton-peligro' : 'boton-principal'}`} disabled={ocupado} onClick={alConfirmar}>
          {ocupado ? 'Un momento…' : textoBoton}
        </button>
      </div>
    </Dialogo>
  );
}
