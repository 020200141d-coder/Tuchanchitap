// ============================================================================
//  src/paginas/PanelDueno.jsx — panel del dueño de canchas
//
//  Pestañas: Mis canchas (CRUD) · Calendario · Pagos · Tarifas · Bloqueos.
//  Calendario, tarifas y bloqueos trabajan sobre la cancha elegida en el
//  selector. La pestaña activa se guarda en la URL (?pestana=pagos) para que
//  al recargar no se pierda.
// ============================================================================

import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../api/cliente';
import { useCarga } from '../util/useCarga';
import { Pestanas } from '../componentes/Pestanas';
import GestionCanchas from './panel/GestionCanchas';
import { Bloqueos, SelectorCancha, Tarifas } from './panel/Horarios';
import { Calendario, Pagos } from './panel/Operacion';
import { Vacio } from '../componentes/Estado';

const PESTANAS = [
  { id: 'canchas', texto: 'Mis canchas' },
  { id: 'calendario', texto: 'Calendario' },
  { id: 'pagos', texto: 'Pagos' },
  { id: 'tarifas', texto: 'Tarifas' },
  { id: 'bloqueos', texto: 'Bloqueos' }
];

export default function PanelDueno() {
  const canchas = useCarga(() => api.get('/canchas/mias'), []);
  return <PanelCanchas titulo="Mi panel" pestanas={PESTANAS} canchas={canchas} />;
}

// Reutilizado por el panel admin con sus pestañas extra.
export function PanelCanchas({ titulo, pestanas, canchas, esAdmin = false, duenos, extras = {} }) {
  const [params, setParams] = useSearchParams();
  const activa = params.get('pestana') || pestanas[0].id;
  const [canchaId, setCanchaId] = useState(null);

  useEffect(() => {
    if (canchas.datos?.length && !canchas.datos.some(c => c.id === canchaId)) setCanchaId(canchas.datos[0].id);
  }, [canchas.datos, canchaId]);

  const necesitaCancha = ['calendario', 'tarifas', 'bloqueos'].includes(activa);
  const sinCanchas = canchas.datos && canchas.datos.length === 0;

  return (
    <div className="contenedor">
      <div className="fila-titulo">
        <h1>{titulo}</h1>
        {necesitaCancha && <SelectorCancha canchas={canchas} valor={canchaId} alCambiar={setCanchaId} />}
      </div>
      <Pestanas pestanas={pestanas} activa={activa} alCambiar={id => setParams({ pestana: id })} />
      <div className="panel-contenido">
        {activa === 'canchas' && <GestionCanchas canchas={canchas} esAdmin={esAdmin} duenos={duenos} />}
        {necesitaCancha && sinCanchas && <Vacio titulo="Primero registra una cancha" texto="Ve a la pestaña de canchas y crea la tuya." />}
        {activa === 'calendario' && canchaId && <Calendario canchaId={canchaId} />}
        {activa === 'tarifas' && canchaId && <Tarifas canchaId={canchaId} />}
        {activa === 'bloqueos' && canchaId && <Bloqueos canchaId={canchaId} />}
        {activa === 'pagos' && <Pagos />}
        {extras[activa]}
      </div>
    </div>
  );
}
