// ============================================================================
//  src/paginas/panel/Horarios.jsx — tarifas y bloqueos de una cancha
//
//  Tarifas: franjas de precio por día. "Nueva franja" abre un diálogo donde
//  se marcan varios días a la vez (lunes a viernes 18–23 a S/ 70). La API
//  rechaza franjas que se cruzan (409) y aquí se muestra su mensaje.
//  Bloqueos: cerrar horas por lluvia o mantenimiento. Si ya hay reservas en
//  ese rango, la API responde 409 para que el dueño las cancele primero.
// ============================================================================

import { useState } from 'react';
import api from '../../api/cliente';
import { useCarga } from '../../util/useCarga';
import Dialogo, { Confirmar } from '../../componentes/Dialogo';
import Campo from '../../componentes/Campo';
import { Aviso, Cargando, MensajeError, Vacio } from '../../componentes/Estado';
import { DIAS, MOTIVOS, fechaLarga, hoyCusco, rangoHoras, soles } from '../../util/formato';

export function SelectorCancha({ canchas, valor, alCambiar }) {
  if (!canchas.datos?.length) return null;
  return (
    <select value={valor ?? ''} onChange={e => alCambiar(Number(e.target.value))} aria-label="Cancha">
      {canchas.datos.map(c => (
        <option key={c.id} value={c.id}>
          {c.nombre}
        </option>
      ))}
    </select>
  );
}

const HORAS = Array.from({ length: 25 }, (_, h) => h);

export function Tarifas({ canchaId }) {
  const tarifas = useCarga(() => api.get(`/canchas/${canchaId}/tarifas`), [canchaId]);
  const [nueva, setNueva] = useState(false);
  const [editar, setEditar] = useState(null);
  const [borrar, setBorrar] = useState(null);
  const [aviso, setAviso] = useState(null);

  const porDia = DIAS.map((nombre, d) => ({ d, nombre, franjas: (tarifas.datos || []).filter(t => t.diaSemana === d) }));
  const listo = texto => {
    setAviso({ tono: 'exito', texto });
    tarifas.recargar();
  };

  return (
    <section>
      <div className="fila-titulo">
        <h2>Tarifas y horario</h2>
        <button type="button" className="boton boton-principal" onClick={() => setNueva(true)}>
          + Nueva franja
        </button>
      </div>
      <p className="texto-suave">Fuera de estas franjas la cancha aparece cerrada. El precio de cada reserva sale de aquí.</p>
      {aviso && (
        <Aviso tono={aviso.tono} alCerrar={() => setAviso(null)}>
          {aviso.texto}
        </Aviso>
      )}
      {tarifas.cargando && !tarifas.datos && <Cargando />}
      <MensajeError error={tarifas.error} alReintentar={tarifas.recargar} />
      {tarifas.datos?.length === 0 && <Vacio titulo="Aún no hay tarifas" texto="Sin tarifas nadie puede reservar. Empieza por lunes a viernes." />}
      {tarifas.datos?.length > 0 && (
        <table className="tabla">
          <tbody>
            {porDia.map(({ d, nombre, franjas }) => (
              <tr key={d}>
                <th scope="row">{nombre}</th>
                <td>
                  {franjas.length === 0 && <span className="texto-suave">Cerrado</span>}
                  {franjas.map(t => (
                    <span key={t.id} className="franja">
                      {t.horaInicio}:00–{t.horaFin}:00 · {soles(t.precioHora)}
                      <button type="button" className="boton-icono" aria-label="Editar franja" onClick={() => setEditar(t)}>
                        ✎
                      </button>
                      <button type="button" className="boton-icono" aria-label="Borrar franja" onClick={() => setBorrar(t)}>
                        ×
                      </button>
                    </span>
                  ))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <Dialogo abierto={nueva || Boolean(editar)} titulo={editar ? 'Editar franja' : 'Nueva franja de precio'} alCerrar={() => { setNueva(false); setEditar(null); }} ancho={460}>
        {(nueva || editar) && (
          <FormTarifa
            key={editar?.id || 'nueva'}
            canchaId={canchaId}
            tarifa={editar}
            alGuardar={texto => {
              setNueva(false);
              setEditar(null);
              listo(texto);
            }}
          />
        )}
      </Dialogo>
      <Confirmar
        abierto={Boolean(borrar)}
        titulo="¿Borrar esta franja?"
        texto={borrar && `${DIAS[borrar.diaSemana]} ${borrar.horaInicio}:00–${borrar.horaFin}:00 quedará cerrado.`}
        textoBoton="Borrar"
        alCerrar={() => setBorrar(null)}
        alConfirmar={async () => {
          try {
            await api.delete(`/tarifas/${borrar.id}`);
            listo('Franja borrada.');
          } catch (e) {
            setAviso({ tono: 'peligro', texto: e.mensaje });
          }
          setBorrar(null);
        }}
      />
    </section>
  );
}

function FormTarifa({ canchaId, tarifa, alGuardar }) {
  const [dias, setDias] = useState(tarifa ? [tarifa.diaSemana] : [1, 2, 3, 4, 5]);
  const [horaInicio, setHoraInicio] = useState(tarifa?.horaInicio ?? 18);
  const [horaFin, setHoraFin] = useState(tarifa?.horaFin ?? 23);
  const [precio, setPrecio] = useState(tarifa ? String(tarifa.precioHora) : '');
  const [error, setError] = useState(null);

  const alternar = d => setDias(x => (x.includes(d) ? x.filter(y => y !== d) : [...x, d]));

  const guardar = async e => {
    e.preventDefault();
    setError(null);
    try {
      if (tarifa) {
        await api.patch(`/tarifas/${tarifa.id}`, { horaInicio, horaFin, precioHora: Number(precio) });
        alGuardar('Franja actualizada.');
      } else {
        const creadas = await api.post(`/canchas/${canchaId}/tarifas`, { dias, horaInicio, horaFin, precioHora: Number(precio) });
        alGuardar(`${creadas.length} franja(s) creadas.`);
      }
    } catch (err) {
      setError(err);
    }
  };

  const c = error?.campos || {};
  return (
    <form className="formulario" onSubmit={guardar}>
      {!tarifa && (
        <fieldset>
          <legend className="campo-etiqueta">Días</legend>
          <div className="fila-casillas">
            {DIAS.map((n, d) => (
              <label key={d} className="casilla">
                <input type="checkbox" checked={dias.includes(d)} onChange={() => alternar(d)} /> {n.slice(0, 3)}
              </label>
            ))}
          </div>
          {c.dias && <span className="campo-error">{c.dias}</span>}
        </fieldset>
      )}
      <div className="dos-columnas">
        <Campo etiqueta="Desde" error={c.horaInicio}>
          <select value={horaInicio} onChange={e => setHoraInicio(Number(e.target.value))}>
            {HORAS.slice(0, 24).map(h => (
              <option key={h} value={h}>
                {h}:00
              </option>
            ))}
          </select>
        </Campo>
        <Campo etiqueta="Hasta" error={c.horaFin}>
          <select value={horaFin} onChange={e => setHoraFin(Number(e.target.value))}>
            {HORAS.slice(1).map(h => (
              <option key={h} value={h}>
                {h === 24 ? 'medianoche' : `${h}:00`}
              </option>
            ))}
          </select>
        </Campo>
      </div>
      <Campo etiqueta="Precio por hora (S/)" error={c.precioHora}>
        <input type="number" min="1" step="0.5" value={precio} onChange={e => setPrecio(e.target.value)} placeholder="70" />
      </Campo>
      {error && !Object.keys(c).length && <MensajeError error={error} />}
      <button className="boton boton-principal boton-bloque">Guardar</button>
    </form>
  );
}

export function Bloqueos({ canchaId }) {
  const bloqueos = useCarga(() => api.get(`/canchas/${canchaId}/bloqueos`), [canchaId]);
  const [abierto, setAbierto] = useState(false);
  const [aviso, setAviso] = useState(null);
  const [d, setD] = useState({ fecha: hoyCusco(), horaInicio: 0, horaFin: 24, motivo: 'LLUVIA', nota: '' });
  const [error, setError] = useState(null);

  const guardar = async e => {
    e.preventDefault();
    setError(null);
    try {
      await api.post(`/canchas/${canchaId}/bloqueos`, { ...d, nota: d.nota || undefined });
      setAbierto(false);
      setAviso({ tono: 'exito', texto: 'Horario cerrado. Ya no se puede reservar.' });
      bloqueos.recargar();
    } catch (err) {
      setError(err);
    }
  };

  const quitar = async b => {
    try {
      await api.delete(`/bloqueos/${b.id}`);
      setAviso({ tono: 'exito', texto: 'Bloqueo quitado: esas horas vuelven a estar libres.' });
      bloqueos.recargar();
    } catch (e) {
      setAviso({ tono: 'peligro', texto: e.mensaje });
    }
  };

  return (
    <section>
      <div className="fila-titulo">
        <h2>Bloqueos</h2>
        <button type="button" className="boton boton-principal" onClick={() => { setError(null); setAbierto(true); }}>
          + Cerrar horario
        </button>
      </div>
      <p className="texto-suave">Para lluvia, mantenimiento o un evento: esas horas no se podrán reservar.</p>
      {aviso && (
        <Aviso tono={aviso.tono} alCerrar={() => setAviso(null)}>
          {aviso.texto}
        </Aviso>
      )}
      {bloqueos.cargando && !bloqueos.datos && <Cargando />}
      <MensajeError error={bloqueos.error} alReintentar={bloqueos.recargar} />
      {bloqueos.datos?.length === 0 && <Vacio titulo="Sin bloqueos próximos" texto="La cancha atiende en todas sus franjas." />}
      <ul className="lista-simple">
        {bloqueos.datos?.map(b => (
          <li key={b.id}>
            <strong>{fechaLarga(b.inicio)}</strong> · {rangoHoras(b.inicio, b.fin)} · {MOTIVOS[b.motivo]}
            {b.nota && <span className="texto-suave"> — {b.nota}</span>}
            <button type="button" className="boton boton-chico" onClick={() => quitar(b)}>
              Quitar
            </button>
          </li>
        ))}
      </ul>
      <Dialogo abierto={abierto} titulo="Cerrar horario" alCerrar={() => setAbierto(false)} ancho={460}>
        <form className="formulario" onSubmit={guardar}>
          <Campo etiqueta="Día" error={error?.campos?.fecha}>
            <input type="date" min={hoyCusco()} value={d.fecha} onChange={e => setD({ ...d, fecha: e.target.value })} />
          </Campo>
          <div className="dos-columnas">
            <Campo etiqueta="Desde">
              <select value={d.horaInicio} onChange={e => setD({ ...d, horaInicio: Number(e.target.value) })}>
                {HORAS.slice(0, 24).map(h => (
                  <option key={h} value={h}>
                    {h}:00
                  </option>
                ))}
              </select>
            </Campo>
            <Campo etiqueta="Hasta" error={error?.campos?.horaFin}>
              <select value={d.horaFin} onChange={e => setD({ ...d, horaFin: Number(e.target.value) })}>
                {HORAS.slice(1).map(h => (
                  <option key={h} value={h}>
                    {h === 24 ? 'medianoche' : `${h}:00`}
                  </option>
                ))}
              </select>
            </Campo>
          </div>
          <Campo etiqueta="Motivo">
            <select value={d.motivo} onChange={e => setD({ ...d, motivo: e.target.value })}>
              {Object.entries(MOTIVOS).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </Campo>
          <Campo etiqueta="Nota (opcional)">
            <input value={d.nota} onChange={e => setD({ ...d, nota: e.target.value })} placeholder="Cambio de redes" />
          </Campo>
          {error && !error.campos?.fecha && !error.campos?.horaFin && <MensajeError error={error} />}
          <button className="boton boton-principal boton-bloque">Cerrar horario</button>
        </form>
      </Dialogo>
    </section>
  );
}
