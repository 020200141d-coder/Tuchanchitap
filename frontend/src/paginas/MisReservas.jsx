// ============================================================================
//  src/paginas/MisReservas.jsx — reservas del jugador
//
//  Cada reserva muestra su estado y la acción que toca:
//   • Esperando pago → anillo de cuenta regresiva, QR del dueño y "Subir
//     comprobante" (foto + n.º de operación). Si ya lo subió: "En revisión".
//   • Confirmada → "Cómo llegar", WhatsApp al dueño con texto listo, cancelar
//     con alerta SweetAlert2 (avisa si pierde el adelanto, regla 5).
//  Al enviar el comprobante o la reseña: celebración con confeti.
//   • Jugada sin reseña → "Dejar reseña".
//  No se muestran anuncios en esta pantalla: aquí se paga.
// ============================================================================

import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import api from '../api/cliente';
import { useCarga } from '../util/useCarga';
import Dialogo from '../componentes/Dialogo';
import { celebrar, confirmar, fiesta } from '../util/alertas';
import Campo from '../componentes/Campo';
import { Aviso, Cargando, Etiqueta, MensajeError, Vacio } from '../componentes/Estado';
import { ESTADOS_PAGO, ESTADOS_RESERVA, enlaceComoLlegar, enlaceWhatsApp, fechaLarga, minutosRestantes, rangoHoras, soles, textoReservaWhatsApp } from '../util/formato';
import { Star } from 'lucide-react';
import Estrellas from '../componentes/Estrellas';

// Anillo de cuenta regresiva (verde con tiempo de sobra, amarillo al final).
function CuentaRegresiva({ minutos, total = 15 }) {
  const fraccion = Math.max(0, Math.min(1, minutos / total));
  return (
    <span className="cuenta-regresiva" role="timer">
      <svg viewBox="0 0 36 36" aria-hidden="true">
        <circle cx="18" cy="18" r="15" fill="none" stroke="rgba(255,255,255,.15)" strokeWidth="4" />
        <circle cx="18" cy="18" r="15" fill="none" stroke={minutos > 5 ? '#bef264' : '#fcd34d'} strokeWidth="4" strokeLinecap="round" strokeDasharray="94.2" strokeDashoffset={94.2 * (1 - fraccion)} transform="rotate(-90 18 18)" />
      </svg>
      {minutos} min · {minutos > 5 ? 'tranqui, aún tienes tiempo' : 'ya casi: yapea ahorita'}
    </span>
  );
}

export default function MisReservas() {
  const estadoRuta = useLocation().state;
  const nueva = estadoRuta?.nueva;
  const [filtro, setFiltro] = useState('');
  const lista = useCarga(() => api.get('/reservas/mias', { params: { estado: filtro || undefined } }), [filtro]);
  const reglas = useCarga(() => api.get('/reglas'), []);
  const [pagar, setPagar] = useState(null);
  const [resenar, setResenar] = useState(null);
  const [aviso, setAviso] = useState(null);
  const [, refrescar] = useState(0);
  const [pagoAbierto, setPagoAbierto] = useState(false);

  // Si venimos de "Pagar ahora" en la celebración, abrimos el pago de esa reserva.
  useEffect(() => {
    if (pagoAbierto || !estadoRuta?.pagar || !lista.datos) return;
    const r = lista.datos.find(x => x.id === nueva);
    if (r) setPagar(r);
    setPagoAbierto(true);
  }, [lista.datos, estadoRuta, nueva, pagoAbierto]);

  // Cancelar con SweetAlert2: avisa si pierde el adelanto (regla 5).
  const cancelarReserva = r => {
    const limite = reglas.datos?.horasCancelacion;
    const horasAntes = (new Date(r.inicio) - Date.now()) / 3600000;
    const pierde = r.estado === 'CONFIRMADA' && limite && horasAntes < limite;
    const html = pierde
      ? `Faltan menos de ${limite} horas:<br><b>perderías el adelanto de ${soles(r.adelanto)}</b>.`
      : r.estado === 'CONFIRMADA'
        ? 'Estás a tiempo: el dueño te devolverá el adelanto.'
        : 'La hora se liberará para otros jugadores.';
    confirmar({ titulo: '¿Cancelar la reserva?', html, boton: 'Sí, cancelar', cancelar: 'No, la mantengo', peligro: true, accion: () => api.post(`/reservas/${r.id}/cancelar`) }).then(res => res && terminar(res.mensaje));
  };

  // Refresca la cuenta regresiva cada 30 s.
  useEffect(() => {
    const t = setInterval(() => refrescar(n => n + 1), 30000);
    return () => clearInterval(t);
  }, []);

  const terminar = texto => {
    setAviso({ tono: 'exito', texto });
    lista.recargar();
  };

  return (
    <div className="contenedor">
      <div className="fila-titulo">
        <h1>Mis reservas</h1>
        <select value={filtro} onChange={e => setFiltro(e.target.value)} aria-label="Filtrar por estado">
          <option value="">Todas</option>
          {Object.entries(ESTADOS_RESERVA).map(([k, v]) => (
            <option key={k} value={k}>
              {v.texto}
            </option>
          ))}
        </select>
      </div>
      {aviso && (
        <Aviso tono={aviso.tono} alCerrar={() => setAviso(null)}>
          {aviso.texto}
        </Aviso>
      )}

      {lista.cargando && !lista.datos && <Cargando texto="Cargando tus reservas…" />}
      <MensajeError error={lista.error} alReintentar={lista.recargar} />
      {lista.datos?.length === 0 && (
        <Vacio titulo={filtro ? 'No tienes reservas en ese estado' : 'Aún no reservaste ninguna cancha'} texto="Busca una canchita y separa tu hora en un minuto.">
          <Link to="/" className="boton boton-principal">
            Buscar canchas
          </Link>
        </Vacio>
      )}

      <div className="lista">
        {lista.datos?.map(r => {
          const estado = ESTADOS_RESERVA[r.estado];
          const ultimoPago = r.pagos?.[0];
          const enRevision = ultimoPago?.estado === 'PENDIENTE';
          const min = minutosRestantes(r.expiraEn);
          const futura = new Date(r.inicio) > new Date();
          const whatsapp = enlaceWhatsApp(r.cancha.telefono, textoReservaWhatsApp(r, r.cancha));
          return (
            <article key={r.id} className={`tarjeta reserva reserva-${r.estado.toLowerCase()} ${r.id === nueva ? 'reserva-nueva' : ''}`}>
              <div className="fila-titulo">
                <div>
                  <h3>{r.cancha.nombre}</h3>
                  <p className="texto-suave">
                    {fechaLarga(r.inicio)} · {rangoHoras(r.inicio, r.fin)} · #{r.id}
                  </p>
                </div>
                <Etiqueta tono={estado.tono}>{enRevision && r.estado === 'PENDIENTE_PAGO' ? 'Comprobante en revisión' : estado.texto}</Etiqueta>
              </div>
              <p>
                Total {soles(r.total)} · adelanto {soles(r.adelanto)}
                {r.adelantoPerdido && <span className="texto-peligro"> · adelanto perdido por cancelar tarde</span>}
              </p>
              {r.estado === 'PENDIENTE_PAGO' && !enRevision && min !== null && <CuentaRegresiva minutos={min} total={reglas.datos?.minutosSeparacion || 15} />}
              {ultimoPago?.estado === 'RECHAZADO' && r.estado === 'PENDIENTE_PAGO' && <p className="texto-peligro">El dueño rechazó tu comprobante: {ultimoPago.nota}</p>}
              <div className="fila-botones">
                {r.estado === 'PENDIENTE_PAGO' && !enRevision && (
                  <button type="button" className="boton boton-principal" onClick={() => setPagar(r)}>
                    Pagar y subir comprobante
                  </button>
                )}
                {['PENDIENTE_PAGO', 'CONFIRMADA'].includes(r.estado) && (
                  <a className="boton" href={enlaceComoLlegar(r.cancha.lat, r.cancha.lng)} target="_blank" rel="noopener noreferrer">
                    Cómo llegar
                  </a>
                )}
                {whatsapp && ['PENDIENTE_PAGO', 'CONFIRMADA'].includes(r.estado) && (
                  <a className="boton boton-whatsapp" href={whatsapp} target="_blank" rel="noopener noreferrer">
                    Avisar al dueño
                  </a>
                )}
                {['PENDIENTE_PAGO', 'CONFIRMADA'].includes(r.estado) && futura && (
                  <button type="button" className="boton boton-peligro-suave" onClick={() => cancelarReserva(r)}>
                    Cancelar
                  </button>
                )}
                {r.estado === 'JUGADA' && !r.resena && (
                  <button type="button" className="boton" onClick={() => setResenar(r)}>
                    Dejar reseña
                  </button>
                )}
                {r.resena && (
                  <span className="texto-suave">
                    Tu reseña: <Estrellas valor={r.resena.estrellas} tamano={14} />
                  </span>
                )}
              </div>
              {r.pagos?.length > 0 && (
                <details>
                  <summary className="texto-suave">Comprobantes enviados ({r.pagos.length})</summary>
                  {r.pagos.map(p => (
                    <p key={p.id} className="texto-suave">
                      {p.metodo} n.º {p.numeroOperacion} · {soles(p.monto)} · <Etiqueta tono={ESTADOS_PAGO[p.estado].tono}>{ESTADOS_PAGO[p.estado].texto}</Etiqueta>
                    </p>
                  ))}
                </details>
              )}
            </article>
          );
        })}
      </div>

      <DialogoPago
        reserva={pagar}
        alCerrar={() => setPagar(null)}
        alTerminar={() => {
          setPagar(null);
          lista.recargar();
          celebrar({ titulo: '¡Comprobante enviado!', html: 'El dueño lo revisará y tu reserva quedará <b>confirmada</b>. Te esperamos en la cancha.' });
        }}
      />
      <DialogoResena
        reserva={resenar}
        alCerrar={() => setResenar(null)}
        alTerminar={() => {
          setResenar(null);
          fiesta();
          terminar('¡Gracias por tu reseña!');
        }}
      />
    </div>
  );
}

// Subir comprobante: QR del dueño + n.º de operación + foto (multipart).
function DialogoPago({ reserva, alCerrar, alTerminar }) {
  const [metodo, setMetodo] = useState('YAPE');
  const [numero, setNumero] = useState('');
  const [foto, setFoto] = useState(null);
  const [error, setError] = useState(null);
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    setNumero('');
    setFoto(null);
    setError(null);
  }, [reserva?.id]);

  const enviar = async e => {
    e.preventDefault();
    if (!foto) return setError({ mensaje: 'Adjunta la foto del comprobante', campos: {} });
    const datos = new FormData();
    datos.append('metodo', metodo);
    datos.append('numeroOperacion', numero);
    datos.append('foto', foto);
    setEnviando(true);
    setError(null);
    try {
      await api.post(`/reservas/${reserva.id}/pagos`, datos);
      alTerminar();
    } catch (err) {
      setError(err);
    } finally {
      setEnviando(false);
    }
  };

  return (
    <Dialogo abierto={Boolean(reserva)} titulo="Pagar adelanto" alCerrar={alCerrar}>
      {reserva && (
        <form onSubmit={enviar} className="formulario">
          <p>
            Yapea o plinea <strong>{soles(reserva.adelanto)}</strong> a {reserva.cancha.nombre} y sube la captura.
          </p>
          {reserva.cancha.qrPagoUrl ? <img className="qr" src={reserva.cancha.qrPagoUrl} alt="QR de Yape o Plin del dueño" /> : <Aviso tono="aviso">El dueño aún no subió su QR. Escríbele por WhatsApp para pedir su número de Yape o Plin.</Aviso>}
          <Campo etiqueta="Método">
            <select value={metodo} onChange={e => setMetodo(e.target.value)}>
              <option value="YAPE">Yape</option>
              <option value="PLIN">Plin</option>
            </select>
          </Campo>
          <Campo etiqueta="N.º de operación" error={error?.campos?.numeroOperacion} ayuda="Aparece en la constancia de tu app.">
            <input inputMode="numeric" value={numero} onChange={e => setNumero(e.target.value)} placeholder="01234567" required />
          </Campo>
          <Campo etiqueta="Foto del comprobante" ayuda="JPG, PNG o WEBP, hasta 3 MB.">
            <input type="file" accept="image/jpeg,image/png,image/webp" onChange={e => setFoto(e.target.files[0] || null)} />
          </Campo>
          {error && !error.campos?.numeroOperacion && <MensajeError error={error} />}
          <button className="boton boton-principal boton-bloque" disabled={enviando}>
            {enviando ? 'Enviando…' : 'Enviar comprobante'}
          </button>
        </form>
      )}
    </Dialogo>
  );
}

function DialogoResena({ reserva, alCerrar, alTerminar }) {
  const [estrellas, setEstrellas] = useState(5);
  const [texto, setTexto] = useState('');
  const [error, setError] = useState(null);
  return (
    <Dialogo abierto={Boolean(reserva)} titulo="¿Qué tal la cancha?" alCerrar={alCerrar} ancho={440}>
      <form
        className="formulario"
        onSubmit={async e => {
          e.preventDefault();
          try {
            await api.post(`/reservas/${reserva.id}/resena`, { estrellas, texto: texto || undefined });
            alTerminar();
          } catch (err) {
            setError(err);
          }
        }}
      >
        <div className="estrellas" role="radiogroup" aria-label="Estrellas">
          {[1, 2, 3, 4, 5].map(n => (
            <button key={n} type="button" role="radio" aria-checked={estrellas === n} aria-label={`${n} estrellas`} className={n <= estrellas ? 'estrella-llena' : 'estrella'} onClick={() => setEstrellas(n)}>
              <Star size={34} fill={n <= estrellas ? 'currentColor' : 'none'} strokeWidth={n <= estrellas ? 0 : 1.6} aria-hidden="true" />
            </button>
          ))}
        </div>
        <Campo etiqueta="Comentario (opcional)">
          <textarea rows="3" maxLength="300" value={texto} onChange={e => setTexto(e.target.value)} placeholder="Buena luz, el grass está parejo…" />
        </Campo>
        <MensajeError error={error} />
        <button className="boton boton-principal boton-bloque">Publicar reseña</button>
      </form>
    </Dialogo>
  );
}
