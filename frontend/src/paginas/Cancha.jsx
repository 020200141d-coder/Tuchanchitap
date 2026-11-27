// ============================================================================
//  src/paginas/Cancha.jsx — ficha de una cancha y reserva
//
//  Flujo del jugador:
//   1. Elige el día → GET /canchas/:id/disponibilidad?fecha= pinta las horas
//      (libre / ocupada / bloqueada / pasada) con su precio.
//   2. Toca una hora libre (y cuántas horas) → resumen con el precio que
//      calcula la API. El navegador NUNCA manda el precio (regla 3).
//   3. "Separar hora" → alerta de confirmación (SweetAlert2) → POST /reservas
//      → confeti y opciones: pagar ahora o avisar al equipo por WhatsApp.
//      Queda esperando pago unos minutos en "Mis reservas".
//  Portada: la primera foto de la cancha o la imagen "cancha sin foto" que
//  define el admin.
//  Extras gratis: "Cómo llegar" (enlace de Google Maps, sin API) y WhatsApp
//  del dueño (wa.me con texto listo). Un anuncio discreto al final de la
//  ficha; ninguno en el resumen de reserva.
// ============================================================================

import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import api from '../api/cliente';
import { useSesion } from '../contexto/Sesion';
import { useCarga } from '../util/useCarga';
import { useImagenes } from '../contexto/Imagenes';
import { reservarConAlerta } from '../util/reservar';
import { MapaUnaCancha } from '../componentes/Mapa';
import Anuncio from '../componentes/Anuncio';
import { Aviso, Cargando, Etiqueta, MensajeError, Vacio } from '../componentes/Estado';
import { DIAS, MOTIVOS, TIPOS, enlaceComoLlegar, enlaceWhatsApp, fechaLarga, hoyCusco, soles } from '../util/formato';
import { ArrowLeft, MessageCircle, Navigation } from 'lucide-react';
import Estrellas from '../componentes/Estrellas';

export default function Cancha() {
  const { id } = useParams();
  const { usuario } = useSesion();
  const navegar = useNavigate();
  const { canchaSinFoto } = useImagenes();
  const [fecha, setFecha] = useState(hoyCusco());
  const [elegida, setElegida] = useState(null);
  const [horas, setHoras] = useState(1);
  const [reservando, setReservando] = useState(false);
  const [errorReserva, setErrorReserva] = useState(null);

  const ficha = useCarga(() => api.get(`/canchas/${id}`), [id, usuario?.id]);
  const dia = useCarga(() => api.get(`/canchas/${id}/disponibilidad`, { params: { fecha } }), [id, fecha]);
  const resenas = useCarga(() => api.get(`/canchas/${id}/resenas`), [id]);
  const reglas = useCarga(() => api.get('/reglas'), []);

  if (ficha.cargando && !ficha.datos) return <Cargando texto="Cargando la cancha…" />;
  if (ficha.error) {
    return (
      <div className="contenedor">
        {ficha.error.status === 404 ? <Vacio titulo="Esta cancha no existe o aún no está publicada"><Link to="/" className="boton">Ver otras canchas</Link></Vacio> : <MensajeError error={ficha.error} alReintentar={ficha.recargar} />}
      </div>
    );
  }
  const c = ficha.datos;
  const horasDelDia = dia.datos?.horas || [];

  // ¿Están libres las `horas` seguidas desde la elegida? (para el selector)
  const libresSeguidas = desde => {
    let n = 0;
    for (let h = desde; ; h++) {
      const x = horasDelDia.find(y => y.hora === h);
      if (!x || x.estado !== 'libre') break;
      n++;
    }
    return n;
  };
  const maxHoras = elegida ? Math.min(libresSeguidas(elegida.hora), reglas.datos?.horasMaximasReserva || 3) : 1;
  const precioEstimado = elegida ? horasDelDia.filter(h => h.hora >= elegida.hora && h.hora < elegida.hora + horas).reduce((s, h) => s + h.precio, 0) : 0;

  const elegir = h => {
    setErrorReserva(null);
    setElegida(h);
    setHoras(1);
  };

  // Confirmación con SweetAlert2, reserva y celebración con confeti
  // (util/reservar.js). Si no se concretó, refrescamos el día por si alguien
  // tomó la hora mientras tanto.
  const reservar = async () => {
    setReservando(true);
    setErrorReserva(null);
    try {
      const hecha = await reservarConAlerta({ cancha: c, fecha, hora: elegida.hora, horas, precioEstimado, usuario, navegar });
      if (!hecha) dia.recargar();
    } finally {
      setReservando(false);
    }
  };

  const whatsapp = enlaceWhatsApp(c.telefono, `Hola, vi ${c.nombre} en tukanchitape y quisiera consultar por una reserva.`);
  const tarifasPorDia = DIAS.map((nombre, d) => ({ nombre, franjas: (c.tarifas || []).filter(t => t.diaSemana === d) }));

  const portada = c.fotos?.[0] || canchaSinFoto;

  return (
    <>
    {portada && (
      <div className="ficha-portada">
        <img src={portada} alt={`Cancha ${c.nombre}`} />
      </div>
    )}
    <div className="contenedor" style={{ position: 'relative' }}>
      <Link to="/" className="volver">
        <ArrowLeft size={18} aria-hidden="true" /> Todas las canchas
      </Link>
      {!c.publicada && <Aviso tono="aviso">Borrador: solo tú (dueño o admin) ves esta ficha. Publícala desde tu panel.</Aviso>}

      <div className="ficha">
        <div className="ficha-principal">
          <h1>{c.nombre}</h1>
          <p className="texto-suave">
            {c.direccion}
            {c.zona && ` · ${c.zona}`}
          </p>
          <div className="etiquetas">
            <Etiqueta tono="exito">{TIPOS[c.tipo]}</Etiqueta>
            <Etiqueta>Fulbito {c.formato}</Etiqueta>
            {c.techada && <Etiqueta>Techada</Etiqueta>}
            {c.conLuz && <Etiqueta>Con luz</Etiqueta>}
            {c.promedioEstrellas && (
              <Etiqueta tono="aviso">
                <Estrellas valor={c.promedioEstrellas} compacta tamano={13} /> ({c.totalResenas})
              </Etiqueta>
            )}
          </div>
          {c.descripcion && <p>{c.descripcion}</p>}
          {c.fotos?.length > 0 && (
            <div className="galeria">
              {c.fotos.map(f => (
                <img key={f} src={f} alt={`Foto de ${c.nombre}`} loading="lazy" />
              ))}
            </div>
          )}

          <section className="tarjeta">
            <div className="fila-titulo">
              <h2>Horas libres</h2>
              <input type="date" value={fecha} min={hoyCusco()} max={hoyCusco(reglas.datos?.diasAnticipacion || 30)} onChange={e => { setFecha(e.target.value); setElegida(null); }} aria-label="Día" />
            </div>
            <p className="texto-suave">{fechaLarga(`${fecha}T12:00:00-05:00`)}</p>
            {dia.cargando && <Cargando texto="Viendo las horas…" />}
            <MensajeError error={dia.error} alReintentar={dia.recargar} />
            {dia.datos && !dia.datos.abierta && <Vacio titulo="La cancha no atiende este día" texto="Prueba con otra fecha." />}
            {dia.datos?.abierta && (
              <>
                <div className="horas" role="list">
                  {horasDelDia.map(h => {
                    const marcada = elegida && h.hora >= elegida.hora && h.hora < elegida.hora + horas;
                    return (
                      <button
                        key={h.hora}
                        type="button"
                        role="listitem"
                        className={`hora hora-${h.estado} ${marcada ? 'hora-elegida' : ''}`}
                        disabled={h.estado !== 'libre'}
                        onClick={() => elegir(h)}
                        title={h.estado === 'bloqueada' ? `Cerrada: ${MOTIVOS[h.motivo] || 'bloqueo'}` : h.estado}
                      >
                        <span>{h.etiqueta}</span>
                        <small>{h.estado === 'libre' ? soles(h.precio) : h.estado === 'bloqueada' ? MOTIVOS[h.motivo] : h.estado}</small>
                      </button>
                    );
                  })}
                </div>
                <p className="leyenda texto-suave">
                  <span className="punto punto-libre" /> libre <span className="punto punto-ocupada" /> ocupada <span className="punto punto-bloqueada" /> cerrada
                </p>
              </>
            )}

            {elegida && (
              <div className="resumen-reserva">
                <div>
                  <strong>
                    {elegida.etiqueta.slice(0, 5)}–{String(elegida.hora + horas).padStart(2, '0')}:00
                  </strong>{' '}
                  · {horas} hora{horas > 1 ? 's' : ''}
                  <label className="en-linea">
                    Horas:
                    <select value={horas} onChange={e => setHoras(Number(e.target.value))}>
                      {Array.from({ length: maxHoras }, (_, i) => i + 1).map(n => (
                        <option key={n} value={n}>
                          {n}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
                <p>
                  Total aprox. <strong>{soles(precioEstimado)}</strong>
                  {reglas.datos && <span className="texto-suave"> · adelanto {reglas.datos.porcentajeAdelanto}% por Yape/Plin · tienes {reglas.datos.minutosSeparacion} min para pagar</span>}
                </p>
                <MensajeError error={errorReserva} />
                <button type="button" className="boton boton-principal" disabled={reservando} onClick={reservar}>
                  {reservando ? 'Separando…' : usuario ? 'Separar hora' : 'Ingresa para reservar'}
                </button>
              </div>
            )}
          </section>

          <section className="tarjeta">
            <h2>Reseñas</h2>
            {resenas.cargando && <Cargando />}
            <MensajeError error={resenas.error} alReintentar={resenas.recargar} />
            {resenas.datos?.length === 0 && <p className="texto-suave">Aún no hay reseñas. Solo quien jugó aquí puede dejar una.</p>}
            {resenas.datos?.map(r => (
              <div key={r.id} className="resena">
                <Estrellas valor={r.estrellas} /> <strong>{r.jugador}</strong>
                {r.texto && <p>{r.texto}</p>}
              </div>
            ))}
          </section>
        </div>

        <aside className="ficha-lateral">
          <MapaUnaCancha cancha={c} />
          <div className="fila-botones">
            <a className="boton" href={enlaceComoLlegar(c.lat, c.lng)} target="_blank" rel="noopener noreferrer">
              <Navigation size={17} aria-hidden="true" /> Cómo llegar
            </a>
            {whatsapp && (
              <a className="boton boton-whatsapp" href={whatsapp} target="_blank" rel="noopener noreferrer">
                <MessageCircle size={17} aria-hidden="true" /> WhatsApp
              </a>
            )}
          </div>
          <section className="tarjeta">
            <h2>Tarifas</h2>
            {(c.tarifas || []).length === 0 && <p className="texto-suave">El dueño aún no cargó sus tarifas.</p>}
            <table className="tabla tabla-compacta">
              <tbody>
                {tarifasPorDia
                  .filter(d => d.franjas.length)
                  .map(d => (
                    <tr key={d.nombre}>
                      <th scope="row">{d.nombre}</th>
                      <td>
                        {d.franjas.map(t => (
                          <div key={t.id}>
                            {t.horaInicio}:00–{t.horaFin}:00 · {soles(t.precioHora)}
                          </div>
                        ))}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </section>
          <Anuncio zona={c.zona} />
        </aside>
      </div>
    </div>
    </>
  );
}
