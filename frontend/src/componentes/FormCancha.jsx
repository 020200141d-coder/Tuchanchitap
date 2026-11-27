// ============================================================================
//  src/componentes/FormCancha.jsx — formulario para crear o editar una cancha
//
//  Lo usan el panel del dueño y el del admin (el admin además elige el
//  dueño). Ubicación: se busca la dirección con Nominatim (botón "Buscar",
//  máx. 1 consulta por segundo) o se toca el mapa para poner el pin exacto.
//  Al guardar: POST /canchas (nueva) o PATCH /canchas/:id (edición) y los
//  errores de la API se pintan bajo cada campo.
// ============================================================================

import { useState } from 'react';
import api from '../api/cliente';
import Campo, { Casilla } from './Campo';
import { SelectorUbicacion } from './Mapa';
import { MensajeError } from './Estado';
import { buscarDireccion } from '../util/nominatim';

const VACIA = { nombre: '', descripcion: '', tipo: 'SINTETICO', formato: 7, techada: false, conLuz: true, lat: null, lng: null, direccion: '', zona: '', telefono: '', publicada: false, duenoId: '' };

export default function FormCancha({ cancha, duenos, alGuardar }) {
  const [d, setD] = useState(() => (cancha ? { ...VACIA, ...cancha, telefono: cancha.telefono || '', zona: cancha.zona || '', descripcion: cancha.descripcion || '', duenoId: cancha.duenoId } : VACIA));
  const [error, setError] = useState(null);
  const [guardando, setGuardando] = useState(false);
  const [resultados, setResultados] = useState([]);
  const [buscando, setBuscando] = useState(false);
  const [errorBusqueda, setErrorBusqueda] = useState('');

  const poner = (campo, valor) => setD(x => ({ ...x, [campo]: valor }));
  const c = error?.campos || {};

  const buscar = async () => {
    if (d.direccion.trim().length < 4) return setErrorBusqueda('Escribe la dirección primero.');
    setBuscando(true);
    setErrorBusqueda('');
    try {
      const lista = await buscarDireccion(d.direccion);
      setResultados(lista);
      if (lista.length === 0) setErrorBusqueda('No encontramos esa dirección. Toca el mapa para ubicar la cancha.');
    } catch (e) {
      setErrorBusqueda(e.message);
    } finally {
      setBuscando(false);
    }
  };

  const guardar = async e => {
    e.preventDefault();
    if (d.lat === null || d.lng === null) return setError({ mensaje: 'Falta la ubicación', campos: { lat: 'Ubica la cancha: busca la dirección o toca el mapa' } });
    setGuardando(true);
    setError(null);
    const cuerpo = {
      nombre: d.nombre,
      descripcion: d.descripcion || null,
      tipo: d.tipo,
      formato: Number(d.formato),
      techada: d.techada,
      conLuz: d.conLuz,
      lat: d.lat,
      lng: d.lng,
      direccion: d.direccion,
      zona: d.zona || null,
      telefono: d.telefono || null,
      publicada: d.publicada
    };
    if (duenos && d.duenoId) cuerpo.duenoId = Number(d.duenoId);
    try {
      const guardada = cancha ? await api.patch(`/canchas/${cancha.id}`, cuerpo) : await api.post('/canchas', cuerpo);
      alGuardar(guardada);
    } catch (err) {
      setError(err);
    } finally {
      setGuardando(false);
    }
  };

  return (
    <form className="formulario" onSubmit={guardar} noValidate>
      {duenos && (
        <Campo etiqueta="Dueño" error={c.duenoId}>
          <select value={d.duenoId} onChange={e => poner('duenoId', e.target.value)}>
            <option value="">Elige un dueño</option>
            {duenos.map(u => (
              <option key={u.id} value={u.id}>
                {u.nombre} ({u.email})
              </option>
            ))}
          </select>
        </Campo>
      )}
      <Campo etiqueta="Nombre" error={c.nombre}>
        <input value={d.nombre} onChange={e => poner('nombre', e.target.value)} placeholder="La Cancha de Cusco" />
      </Campo>
      <div className="dos-columnas">
        <Campo etiqueta="Tipo" error={c.tipo}>
          <select value={d.tipo} onChange={e => poner('tipo', e.target.value)}>
            <option value="SINTETICO">Sintético</option>
            <option value="LOSA">Losa</option>
            <option value="GRASS">Grass natural</option>
          </select>
        </Campo>
        <Campo etiqueta="Formato" error={c.formato}>
          <select value={d.formato} onChange={e => poner('formato', e.target.value)}>
            <option value="5">Fulbito 5</option>
            <option value="7">Fulbito 7</option>
            <option value="11">Fútbol 11</option>
          </select>
        </Campo>
      </div>
      <div className="fila-casillas">
        <Casilla etiqueta="Techada" checked={d.techada} onChange={v => poner('techada', v)} />
        <Casilla etiqueta="Con luz" checked={d.conLuz} onChange={v => poner('conLuz', v)} />
        <Casilla etiqueta="Publicada (visible para jugadores)" checked={d.publicada} onChange={v => poner('publicada', v)} />
      </div>
      <Campo etiqueta="Descripción" error={c.descripcion}>
        <textarea rows="2" value={d.descripcion} onChange={e => poner('descripcion', e.target.value)} placeholder="Vestuarios, estacionamiento, cafetín…" />
      </Campo>
      <div className="dos-columnas">
        <Campo etiqueta="Zona" error={c.zona}>
          <input value={d.zona} onChange={e => poner('zona', e.target.value)} placeholder="Wanchaq" />
        </Campo>
        <Campo etiqueta="WhatsApp de reservas" error={c.telefono}>
          <input type="tel" inputMode="numeric" value={d.telefono} onChange={e => poner('telefono', e.target.value)} placeholder="984123456" />
        </Campo>
      </div>
      <Campo etiqueta="Dirección" error={c.direccion}>
        <div className="fila-input">
          <input value={d.direccion} onChange={e => poner('direccion', e.target.value)} placeholder="Av. Las Américas E-24, Parque Industrial" />
          <button type="button" className="boton" onClick={buscar} disabled={buscando}>
            {buscando ? 'Buscando…' : 'Buscar'}
          </button>
        </div>
      </Campo>
      {errorBusqueda && <p className="campo-error">{errorBusqueda}</p>}
      {resultados.length > 0 && (
        <ul className="resultados-busqueda">
          {resultados.map(r => (
            <li key={`${r.lat},${r.lng}`}>
              <button
                type="button"
                className="enlace"
                onClick={() => {
                  setD(x => ({ ...x, lat: Number(r.lat.toFixed(6)), lng: Number(r.lng.toFixed(6)) }));
                  setResultados([]);
                }}
              >
                {r.nombre}
              </button>
            </li>
          ))}
        </ul>
      )}
      <p className="campo-ayuda">Toca el mapa para poner el pin justo en la cancha.</p>
      <SelectorUbicacion lat={d.lat} lng={d.lng} alElegir={({ lat, lng }) => setD(x => ({ ...x, lat, lng }))} />
      {(c.lat || c.lng) && <p className="campo-error">{c.lat || c.lng}</p>}
      {error && !Object.keys(c).length && <MensajeError error={error} />}
      <button className="boton boton-principal boton-bloque" disabled={guardando}>
        {guardando ? 'Guardando…' : cancha ? 'Guardar cambios' : 'Crear cancha'}
      </button>
    </form>
  );
}
