// ============================================================================
//  src/componentes/Pestanas.jsx — barra de pestañas accesible (role="tablist")
// ============================================================================

export function Pestanas({ pestanas, activa, alCambiar }) {
  return (
    <div className="pestanas" role="tablist">
      {pestanas.map(p => (
        <button key={p.id} type="button" role="tab" aria-selected={activa === p.id} className={`pestana ${activa === p.id ? 'pestana-activa' : ''}`} onClick={() => alCambiar(p.id)}>
          {p.texto}
        </button>
      ))}
    </div>
  );
}
