// ============================================================================
//  src/paginas/panel/Operacion.jsx — el día a día del dueño
//
//  • Calendario: reservas de la semana por día, con el nombre del jugador y
//    botón de WhatsApp para escribirle. Desde aquí se cancela una reserva
//    (el adelanto se devuelve: si cancela el local, el jugador no pierde nada).
//  • Pagos: bandeja de comprobantes Yape/Plin. El dueño mira la foto, la
//    compara con su app y aprueba (alerta de confirmación + confeti) o
//    rechaza escribiendo el motivo en la alerta (el jugador puede reenviar).
// ============================================================================

import { useState } from 'react';
import api from '../../api/cliente';
import { useCarga } from '../../util/useCarga';
import Dialogo from '../../componentes/Dialogo';
import { aviso as toast, confirmar, fiesta, pedirTexto, seguro } from '../../util/alertas';
import { Aviso, Cargando, Etiqueta, MensajeError, Vacio } from '../../componentes/Estado';
import { ESTADOS_PAGO, ESTADOS_RESERVA, enlaceWhatsApp, fechaLarga, fechaLocal, hoyCusco, rangoHoras, soles } from '../../util/formato';

// Suma días a 'YYYY-MM-DD' (al mediodía de Cusco para no cruzar de fecha).
const sumarDias = (fecha, n) => fechaLocal(new Date(`${fecha}T12:00:00-05:00`).getTime() + n * 86400000);

export function Calendario({ canchaId }) {
  const [desde, setDesde] = useState(hoyCusco());
  const hasta = sumarDias(desde, 6);
  const reservas = useCarga(() => api.get(`/canchas/${canchaId}/reservas`, { params: { desde, hasta } }), [canchaId, desde]);
  const [aviso, setAviso] = useState(null);

  const dias = Array.from({ length: 7 }, (_, i) => sumarDias(desde, i));
  const activas = (reservas.datos || []).filter(r => !['CANCELADA', 'EXPIRADA'].includes(r.estado));
  const moverSemana = n => setDesde(sumarDias(desde, n * 7));
  const cancelarReserva = r =>
    confirmar({
      titulo: '¿Cancelar esta reserva?',
      html: `Avísale a <b>${seguro(r.jugador.nombre)}</b>. Si ya pagó el adelanto, debes devolvérselo.`,
      boton: 'Sí, cancelar',
      cancelar: 'Volver',
      peligro: true,
      accion: () => api.post(`/reservas/${r.id}/cancelar`)
    }).then(res => {
      if (!res) return;
      setAviso({ tono: 'exito', texto: res.mensaje });
      reservas.recargar();
    });

  return (
    <section>
      <div className="fila-titulo">
        <h2>Calendario</h2>
        <div className="fila-botones">
          <button type="button" className="boton boton-chico" onClick={() => moverSemana(-1)}>
            ← Semana
          </button>
          <input type="date" value={desde} onChange={e => setDesde(e.target.value)} aria-label="Desde" />
          <button type="button" className="boton boton-chico" onClick={() => moverSemana(1)}>
            Semana →
          </button>
        </div>
      </div>
      {aviso && (
        <Aviso tono={aviso.tono} alCerrar={() => setAviso(null)}>
          {aviso.texto}
        </Aviso>
      )}
      {reservas.cargando && !reservas.datos && <Cargando />}
      <MensajeError error={reservas.error} alReintentar={reservas.recargar} />
      {reservas.datos && activas.length === 0 && <Vacio titulo="Semana libre" texto="Aún no hay reservas en estos 7 días. Comparte tu cancha por WhatsApp para llenarla." />}
      {activas.length > 0 && (
        <div className="calendario">
          {dias.map(dia => {
            const delDia = activas.filter(r => fechaLocal(r.inicio) === dia);
            return (
              <div key={dia} className="calendario-dia">
                <h3>{fechaLarga(`${dia}T12:00:00-05:00`)}</h3>
                {delDia.length === 0 && <p className="texto-suave">Libre</p>}
                {delDia.map(r => {
                  const wa = enlaceWhatsApp(r.jugador.telefono, `Hola ${r.jugador.nombre.split(' ')[0]}, te escribo de la cancha por tu reserva #${r.id} del ${fechaLarga(r.inicio)} (${rangoHoras(r.inicio, r.fin)}).`);
                  return (
                    <div key={r.id} className={`turno turno-${r.estado.toLowerCase()}`}>
                      <strong>{rangoHoras(r.inicio, r.fin)}</strong> {r.jugador.nombre}
                      <div>
                        <Etiqueta tono={ESTADOS_RESERVA[r.estado].tono}>{ESTADOS_RESERVA[r.estado].texto}</Etiqueta> {soles(r.total)}
                      </div>
                      <div className="fila-botones">
                        {wa && (
                          <a className="boton boton-chico boton-whatsapp" href={wa} target="_blank" rel="noopener noreferrer">
                            WhatsApp
                          </a>
                        )}
                        {['PENDIENTE_PAGO', 'CONFIRMADA'].includes(r.estado) && new Date(r.inicio) > new Date() && (
                          <button type="button" className="boton boton-chico boton-peligro-suave" onClick={() => cancelarReserva(r)}>
                            Cancelar
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

export function Pagos() {
  const [estado, setEstado] = useState('PENDIENTE');
  const pagos = useCarga(() => api.get('/pagos', { params: { estado: estado || undefined } }), [estado]);
  const [aviso, setAviso] = useState(null);
  const [foto, setFoto] = useState(null);

  const aprobar = p =>
    confirmar({
      titulo: '¿Aprobar el pago?',
      html: `Revisa en tu app que llegó <b>${soles(p.monto)}</b> con el n.º <b>${seguro(p.numeroOperacion)}</b>.`,
      boton: 'Sí, llegó ✔',
      cancelar: 'Aún no',
      icono: 'question',
      accion: () => api.post(`/pagos/${p.id}/aprobar`)
    }).then(ok => {
      if (!ok) return;
      fiesta();
      toast(`Reserva de ${p.reserva.jugador.nombre} confirmada`);
      pagos.recargar();
    });

  const rechazar = p =>
    pedirTexto({
      titulo: 'Rechazar comprobante',
      html: 'El jugador verá el motivo y tendrá unos minutos para reenviarlo.',
      placeholder: 'El monto no coincide con el adelanto',
      boton: 'Rechazar',
      accion: nota => api.post(`/pagos/${p.id}/rechazar`, { nota })
    }).then(ok => {
      if (!ok) return;
      toast('Comprobante rechazado', 'info');
      pagos.recargar();
    });

  return (
    <section>
      <div className="fila-titulo">
        <h2>Pagos Yape / Plin</h2>
        <select value={estado} onChange={e => setEstado(e.target.value)} aria-label="Filtrar pagos">
          <option value="PENDIENTE">Por revisar</option>
          <option value="APROBADO">Aprobados</option>
          <option value="RECHAZADO">Rechazados</option>
          <option value="">Todos</option>
        </select>
      </div>
      {aviso && (
        <Aviso tono={aviso.tono} alCerrar={() => setAviso(null)}>
          {aviso.texto}
        </Aviso>
      )}
      {pagos.cargando && !pagos.datos && <Cargando />}
      <MensajeError error={pagos.error} alReintentar={pagos.recargar} />
      {pagos.datos?.length === 0 && <Vacio titulo={estado === 'PENDIENTE' ? 'No hay comprobantes por revisar' : 'Sin pagos en este filtro'} texto="Cuando un jugador suba su captura de Yape o Plin, aparecerá aquí." />}
      <div className="lista">
        {pagos.datos?.map(p => (
          <article key={p.id} className="tarjeta pago">
            <button type="button" className="pago-foto" onClick={() => setFoto(p.fotoUrl)} aria-label="Ver comprobante en grande">
              <img src={p.fotoUrl} alt={`Comprobante ${p.metodo} n.º ${p.numeroOperacion}`} />
            </button>
            <div>
              <h3>
                {p.metodo} · {soles(p.monto)} <Etiqueta tono={ESTADOS_PAGO[p.estado].tono}>{ESTADOS_PAGO[p.estado].texto}</Etiqueta>
              </h3>
              <p>N.º de operación: <strong>{p.numeroOperacion}</strong></p>
              <p className="texto-suave">
                {p.reserva.jugador.nombre} · {p.reserva.cancha.nombre} · {fechaLarga(p.reserva.inicio)} {rangoHoras(p.reserva.inicio, p.reserva.fin)}
              </p>
              {p.nota && <p className="texto-peligro">Motivo: {p.nota}</p>}
              {p.estado === 'PENDIENTE' && (
                <div className="fila-botones">
                  <button type="button" className="boton boton-principal" onClick={() => aprobar(p)}>
                    Aprobar
                  </button>
                  <button type="button" className="boton boton-peligro-suave" onClick={() => rechazar(p)}>
                    Rechazar
                  </button>
                </div>
              )}
            </div>
          </article>
        ))}
      </div>
      <Dialogo abierto={Boolean(foto)} titulo="Comprobante" alCerrar={() => setFoto(null)} ancho={520}>
        {foto && <img src={foto} alt="Comprobante en grande" className="foto-grande" />}
      </Dialogo>
    </section>
  );
}
