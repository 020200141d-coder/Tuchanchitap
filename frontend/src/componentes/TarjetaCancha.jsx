// ============================================================================
//  src/componentes/TarjetaCancha.jsx — resumen de una cancha en el listado
//  (nombre, zona, características, precio desde, estrellas y distancia)
// ============================================================================

import { Link } from 'react-router-dom';
import { Etiqueta } from './Estado';
import { soles, TIPOS } from '../util/formato';

export default function TarjetaCancha({ cancha }) {
  return (
    <article className="tarjeta tarjeta-cancha">
      {cancha.fotos?.[0] ? <img className="tarjeta-foto" src={cancha.fotos[0]} alt={`Foto de ${cancha.nombre}`} loading="lazy" /> : <div className="tarjeta-foto tarjeta-foto-vacia" aria-hidden="true">⚽</div>}
      <div className="tarjeta-cuerpo">
        <h3>{cancha.nombre}</h3>
        <p className="texto-suave">
          {cancha.zona || 'Cusco'}
          {cancha.distanciaKm !== null && cancha.distanciaKm !== undefined && ` · a ${cancha.distanciaKm.toLocaleString('es-PE')} km`}
        </p>
        <div className="etiquetas">
          <Etiqueta tono="exito">{TIPOS[cancha.tipo]}</Etiqueta>
          <Etiqueta>Fulbito {cancha.formato}</Etiqueta>
          {cancha.techada && <Etiqueta>Techada</Etiqueta>}
          {cancha.conLuz && <Etiqueta>Con luz</Etiqueta>}
        </div>
        <div className="tarjeta-pie">
          <span>
            {cancha.precioDesde !== null ? (
              <>
                desde <strong>{soles(cancha.precioDesde)}</strong>/h
              </>
            ) : (
              <span className="texto-suave">Sin tarifas</span>
            )}
          </span>
          {cancha.promedioEstrellas && (
            <span aria-label={`${cancha.promedioEstrellas} de 5 estrellas`}>
              ★ {cancha.promedioEstrellas} <span className="texto-suave">({cancha.totalResenas})</span>
            </span>
          )}
        </div>
        <Link to={`/canchas/${cancha.id}`} className="boton boton-principal boton-bloque">
          Ver horas libres
        </Link>
      </div>
    </article>
  );
}
