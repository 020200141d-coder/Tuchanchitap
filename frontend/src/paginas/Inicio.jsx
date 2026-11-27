// ============================================================================
//  src/paginas/Inicio.jsx — buscar canchas: filtros, mapa y listado
//
//  Flujo:
//   1. Los filtros arman la query de GET /api/canchas (el filtrado y la
//      paginación los hace la API).
//   2. "Cerca de mí" pide la ubicación al navegador (gratis, sin Google) y la
//      manda como lat/lng: la API ordena por distancia.
//   3. El mapa muestra las canchas de la página actual.
//   4. Anuncios: como máximo UNO cada 6 canchas, intercalado en la lista.
//  Estados: cargando (girador), error (con reintentar), vacío (invitación a
//  quitar filtros) y éxito (mapa + tarjetas).
// ============================================================================

import { Fragment, useState } from 'react';
import api from '../api/cliente';
import { useCarga } from '../util/useCarga';
import { MapaCanchas } from '../componentes/Mapa';
import TarjetaCancha from '../componentes/TarjetaCancha';
import Anuncio from '../componentes/Anuncio';
import { Cargando, MensajeError, Vacio } from '../componentes/Estado';

const FILTROS_INICIALES = { q: '', tipo: '', formato: '', techada: false, conLuz: false, precioMax: '' };
const CADA_CUANTAS_UN_ANUNCIO = 6;

export default function Inicio() {
  const [filtros, setFiltros] = useState(FILTROS_INICIALES);
  const [pagina, setPagina] = useState(1);
  const [yo, setYo] = useState(null);
  const [errorUbicacion, setErrorUbicacion] = useState('');

  const params = {
    q: filtros.q || undefined,
    tipo: filtros.tipo || undefined,
    formato: filtros.formato || undefined,
    techada: filtros.techada ? 'true' : undefined,
    conLuz: filtros.conLuz ? 'true' : undefined,
    precioMax: filtros.precioMax || undefined,
    lat: yo?.lat,
    lng: yo?.lng,
    pagina,
    porPagina: 12
  };
  const { datos, cargando, error, recargar } = useCarga(() => api.get('/canchas', { params }), [JSON.stringify(params)]);

  const cambiar = (campo, valor) => {
    setFiltros(f => ({ ...f, [campo]: valor }));
    setPagina(1);
  };

  const cercaDeMi = () => {
    setErrorUbicacion('');
    if (!navigator.geolocation) return setErrorUbicacion('Tu navegador no permite compartir la ubicación.');
    navigator.geolocation.getCurrentPosition(
      p => {
        setYo({ lat: p.coords.latitude, lng: p.coords.longitude });
        setPagina(1);
      },
      () => setErrorUbicacion('No pudimos leer tu ubicación. Revisa el permiso del navegador.'),
      { timeout: 10000 }
    );
  };

  const hayFiltros = JSON.stringify(filtros) !== JSON.stringify(FILTROS_INICIALES);

  return (
    <div className="contenedor">
      <section className="portada">
        <h1>Encuentra tu canchita en Cusco</h1>
        <p className="texto-suave">Mira las horas libres, separa tu hora y paga el adelanto con Yape o Plin.</p>
      </section>

      <form className="filtros" onSubmit={e => e.preventDefault()} aria-label="Filtros de búsqueda">
        <input type="search" placeholder="Nombre o zona: Wanchaq, San Sebastián…" value={filtros.q} onChange={e => cambiar('q', e.target.value)} aria-label="Buscar por nombre o zona" />
        <select value={filtros.tipo} onChange={e => cambiar('tipo', e.target.value)} aria-label="Tipo de cancha">
          <option value="">Todo tipo</option>
          <option value="SINTETICO">Sintético</option>
          <option value="LOSA">Losa</option>
          <option value="GRASS">Grass natural</option>
        </select>
        <select value={filtros.formato} onChange={e => cambiar('formato', e.target.value)} aria-label="Jugadores por lado">
          <option value="">Fulbito 5, 7 u 11</option>
          <option value="5">Fulbito 5</option>
          <option value="7">Fulbito 7</option>
          <option value="11">Fútbol 11</option>
        </select>
        <input type="number" min="1" placeholder="Precio máx. S/ por hora" value={filtros.precioMax} onChange={e => cambiar('precioMax', e.target.value)} aria-label="Precio máximo por hora" />
        <label className="casilla">
          <input type="checkbox" checked={filtros.techada} onChange={e => cambiar('techada', e.target.checked)} /> Techada
        </label>
        <label className="casilla">
          <input type="checkbox" checked={filtros.conLuz} onChange={e => cambiar('conLuz', e.target.checked)} /> Con luz
        </label>
        <button type="button" className={`boton ${yo ? 'boton-activo' : ''}`} onClick={yo ? () => setYo(null) : cercaDeMi}>
          {yo ? 'Quitar "cerca de mí"' : '📍 Cerca de mí'}
        </button>
      </form>
      {errorUbicacion && <p className="campo-error">{errorUbicacion}</p>}

      {cargando && !datos && <Cargando texto="Buscando canchas…" />}
      <MensajeError error={error} alReintentar={recargar} />

      {datos && datos.items.length === 0 && (
        <Vacio titulo="No hay canchas con esos filtros" texto="Prueba quitando alguno: quizá la techada que buscas no tiene luz.">
          {hayFiltros && (
            <button type="button" className="boton" onClick={() => setFiltros(FILTROS_INICIALES)}>
              Quitar filtros
            </button>
          )}
        </Vacio>
      )}

      {datos && datos.items.length > 0 && (
        <>
          <MapaCanchas canchas={datos.items} yo={yo} />
          <p className="texto-suave resultado-cuenta">
            {datos.total} cancha{datos.total === 1 ? '' : 's'}
            {yo ? ', de la más cercana a la más lejana' : ''}
          </p>
          <div className="rejilla" aria-busy={cargando}>
            {datos.items.map((c, i) => (
              <Fragment key={c.id}>
                <TarjetaCancha cancha={c} />
                {(i + 1) % CADA_CUANTAS_UN_ANUNCIO === 0 && <Anuncio zona={c.zona} />}
              </Fragment>
            ))}
            {datos.items.length < CADA_CUANTAS_UN_ANUNCIO && <Anuncio zona={datos.items[0].zona} />}
          </div>
          {datos.paginas > 1 && (
            <nav className="paginacion" aria-label="Páginas">
              <button type="button" className="boton" disabled={pagina <= 1} onClick={() => setPagina(p => p - 1)}>
                Anterior
              </button>
              <span>
                Página {datos.pagina} de {datos.paginas}
              </span>
              <button type="button" className="boton" disabled={pagina >= datos.paginas} onClick={() => setPagina(p => p + 1)}>
                Siguiente
              </button>
            </nav>
          )}
        </>
      )}
    </div>
  );
}
