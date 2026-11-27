// ============================================================================
//  src/paginas/MisReservas.jsx — reservas del jugador
//
//  Cada reserva muestra su estado y la acción que toca:
//   • Esperando pago → ver QR del dueño, cuenta regresiva y "Subir
//     comprobante" (foto + n.º de operación). Si ya lo subió: "En revisión".
//   • Confirmada → "Cómo llegar", WhatsApp al dueño con texto listo, cancelar
//     (avisando si pierde el adelanto según la regla 5).
//   • Jugada sin reseña → "Dejar reseña".
//  No se muestran anuncios en esta pantalla: aquí se paga.
// ============================================================================

import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import api from '../api/cliente';
import { useCarga } from '../util/useCarga';
import Dialogo, { Confirmar } from '../componentes/Dialogo';
import Campo from '../componentes/Campo';
import { Aviso, Cargando, Etiqueta, MensajeError, Vacio } from '../componentes/Estado';
import { ESTADOS_PAGO, ESTADOS_RESERVA, enlaceComoLlegar, enlaceWhatsApp, fechaLarga, minutosRestantes, rangoHoras, soles, textoReservaWhatsApp } from '../util/formato';

export default function MisReservas() {
  const nueva = useLocation().state?.nueva;
  const [filtro, setFiltro] = useState('');
  const lista = useCarga(() => api.get('/reservas/mias', { params: { estado: filtro || undefined } }), [filtro]);
  const reglas = useCarga(() => api.get('/reglas'), []);
  const [pagar, setPagar] = useState(null);
  const [cancelar, setCancelar] = useState(null);
  const [resenar, setResenar] = useState(null);
  const [aviso, setAviso] = useState(nueva ? { tono: 'exito', texto: `Hora separada (reserva #${nueva}). Paga el adelanto y sube el comprobante antes de que se libere.` } : null);
  const [, refrescar] = useState(0);

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
            <article key={r.id} className={`tarjeta reserva ${r.id === nueva ? 'reserva-nueva' : ''}`}>
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
              {r.estado === 'PENDIENTE_PAGO' && !enRevision && min !== null && <p className="texto-aviso">Tienes {min} min para subir el comprobante; si no, la hora se libera.</p>}
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
                  <button type="button" className="boton boton-peligro-suave" onClick={() => setCancelar(r)}>
                    Cancelar
                  </button>
                )}
                {r.estado === 'JUGADA' && !r.resena && (
                  <button type="button" className="boton" onClick={() => setResenar(r)}>
                    Dejar reseña
                  </button>
                )}
                {r.resena && <span className="texto-suave">Tu reseña: {'★'.repeat(r.resena.estrellas)}</span>}
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

      <DialogoPago reserva={pagar} alCerrar={() => setPagar(null)} alTerminar={() => { setPagar(null); terminar('Comprobante enviado. El dueño lo revisará y tu reserva quedará confirmada.'); }} />
      <DialogoCancelar reserva={cancelar} horasLimite={reglas.datos?.horasCancelacion} alCerrar={() => setCancelar(null)} alTerminar={m => { setCancelar(null); terminar(m); }} />
      <DialogoResena reserva={resenar} alCerrar={() => setResenar(null)} alTerminar={() => { setResenar(null); terminar('¡Gracias por tu reseña!'); }} />
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

// Cancelar con aviso de la regla 5 (pierde el adelanto si cancela tarde).
function DialogoCancelar({ reserva, horasLimite, alCerrar, alTerminar }) {
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState(null);
  if (!reserva) return <Confirmar abierto={false} alCerrar={alCerrar} />;
  const horasAntes = (new Date(reserva.inicio) - Date.now()) / 3600000;
  const pierde = reserva.estado === 'CONFIRMADA' && horasLimite && horasAntes < horasLimite;
  const texto = pierde
    ? `Faltan menos de ${horasLimite} horas: si cancelas ahora pierdes el adelanto de ${soles(reserva.adelanto)}.`
    : reserva.estado === 'CONFIRMADA'
      ? 'Estás a tiempo: el dueño te devolverá el adelanto.'
      : 'La hora se liberará para otros jugadores.';
  return (
    <Confirmar
      abierto
      titulo="¿Cancelar la reserva?"
      texto={
        <>
          {texto}
          {error && <MensajeError error={error} />}
        </>
      }
      textoBoton="Sí, cancelar"
      ocupado={ocupado}
      alCerrar={alCerrar}
      alConfirmar={async () => {
        setOcupado(true);
        try {
          const r = await api.post(`/reservas/${reserva.id}/cancelar`);
          alTerminar(r.mensaje);
        } catch (e) {
          setError(e);
        } finally {
          setOcupado(false);
        }
      }}
    />
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
              ★
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
