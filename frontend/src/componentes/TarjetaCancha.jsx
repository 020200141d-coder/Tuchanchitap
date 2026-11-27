// ============================================================================
//  src/componentes/TarjetaCancha.jsx — tarjeta de una cancha en el listado
//
//  Foto (o la imagen "cancha sin foto" que define el admin), insignia de la
//  próxima hora libre de hoy, estrellas, etiquetas y las horas libres de hoy
//  como botones: tocar una abre directo la confirmación de reserva.
//  Efectos: aparece al hacer scroll, se inclina en 3D con el mouse y la foto
//  hace zoom suave al pasar.
// ============================================================================

import { Link, useNavigate } from 'react-router-dom';
import { Etiqueta } from './Estado';
import { useSesion } from '../contexto/Sesion';
import { useImagenes } from '../contexto/Imagenes';
import { inclinar } from '../util/animaciones';
import { reservarConAlerta } from '../util/reservar';
import { hoyCusco, soles, TIPOS } from '../util/formato';

export default function TarjetaCancha({ cancha }) {
  const { usuario } = useSesion();
  const { canchaSinFoto } = useImagenes();
  const navegar = useNavigate();
  const foto = cancha.fotos?.[0] || canchaSinFoto;
  const horas = cancha.horasLibresHoy || [];

  return (
    <article className="tarjeta tarjeta-cancha" data-aparecer {...inclinar}>
      <div className="tarjeta-foto">
        {foto && <img src={foto} alt={`Cancha ${cancha.nombre}`} loading="lazy" />}
        {horas[0] && (
          <span className="insignia-libre">
            <span className="punto-vivo" aria-hidden="true" /> Libre hoy {horas[0].etiqueta}
          </span>
        )}
        {cancha.promedioEstrellas && <span className="estrellas-tarjeta">★ {cancha.promedioEstrellas}</span>}
        <div className="etiquetas">
          <Etiqueta tono="exito">{TIPOS[cancha.tipo]}</Etiqueta>
          <Etiqueta>F{cancha.formato}</Etiqueta>
          {cancha.techada && <Etiqueta>Techada</Etiqueta>}
          {cancha.conLuz && <Etiqueta>Con luz</Etiqueta>}
        </div>
      </div>
      <div className="tarjeta-cuerpo">
        <h3>{cancha.nombre}</h3>
        <p className="texto-suave">
          📍 {cancha.zona || 'Cusco'}
          {cancha.distanciaKm !== null && cancha.distanciaKm !== undefined && ` · a ${cancha.distanciaKm.toLocaleString('es-PE')} km`}
        </p>
        {horas.length > 0 ? (
          <div className="horas-rapidas" aria-label="Horas libres hoy">
            {horas.map(h => (
              <button
                key={h.hora}
                type="button"
                className="hora-rapida"
                title={`Reservar hoy a las ${h.etiqueta} · ${soles(h.precio)}`}
                onClick={() => reservarConAlerta({ cancha, fecha: hoyCusco(), hora: h.hora, precioEstimado: h.precio, usuario, navegar })}
              >
                {h.etiqueta}
              </button>
            ))}
          </div>
        ) : (
          <span className="sin-horas">Hoy ya no hay horas libres · mira otros días</span>
        )}
        <div className="tarjeta-pie">
          <span>
            {cancha.precioDesde !== null ? (
              <>
                desde <span className="precio">{soles(cancha.precioDesde)}</span>/h
              </>
            ) : (
              <span className="texto-suave">Sin tarifas</span>
            )}
          </span>
          <Link to={`/canchas/${cancha.id}`} className="boton boton-principal boton-chico">
            Ver horarios →
          </Link>
        </div>
      </div>
    </article>
  );
}
