// ============================================================================
//  src/paginas/Inicio.jsx — portada "Noche de estadio" + buscador de canchas
//
//  Flujo:
//   1. Portada a pantalla completa: fotos de fondo (las elige el admin en
//      Imágenes del sitio) que cambian solas y "respiran", reflectores que se
//      encienden, título que se escribe solo y contador animado de canchas.
//   2. Buscador + filtros en píldoras (Techada, Con luz, Fulbito 5/7/11,
//      Cerca de mí…). Cada cambio vuelve a pedir GET /api/canchas.
//   3. Mientras carga: esqueletos con brillo. Error: reintentar. Vacío:
//      invitación a quitar filtros.
//   4. Tarjetas con las horas libres de hoy (reservar en dos toques), mapa
//      oscuro con los pines y, como máximo, un anuncio cada 6 canchas.
// ============================================================================

import { Fragment, useEffect, useState } from 'react';
import api from '../api/cliente';
import { useCarga } from '../util/useCarga';
import { useImagenes } from '../contexto/Imagenes';
import { useAparecer, useContador, useEscribir } from '../util/animaciones';
import { aviso } from '../util/alertas';
import { MapaCanchas } from '../componentes/Mapa';
import TarjetaCancha from '../componentes/TarjetaCancha';
import Anuncio from '../componentes/Anuncio';
import { Esqueletos, MensajeError, Vacio } from '../componentes/Estado';
import { ChevronLeft, ChevronRight, Lightbulb, LocateFixed, SlidersHorizontal, Umbrella, X } from 'lucide-react';

const FILTROS_INICIALES = { q: '', tipo: '', formato: '', techada: false, conLuz: false, precioMax: '' };
const CADA_CUANTAS_UN_ANUNCIO = 6;
const FRASES = ['¿JUEGAS HOY, CAUSA?', '¿PICHANGA EN WANCHAQ?', '¿FULBITO DE NOCHE?', 'ARMA TU PARTIDO'];

function Portada({ total, alBuscar, texto, setTexto }) {
  const { portada } = useImagenes();
  const [actual, setActual] = useState(0);
  const titulo = useEscribir(FRASES);
  const cuenta = useContador(total);

  // Carrusel: cambia de foto cada 7 s.
  useEffect(() => {
    if (portada.length < 2) return undefined;
    const t = setInterval(() => setActual(a => (a + 1) % portada.length), 7000);
    return () => clearInterval(t);
  }, [portada.length]);

  const foto = portada[actual];
  return (
    <section className="portada-hero">
      {portada.map((f, i) => (
        <div key={f.id} className={`portada-foto ${i === actual ? 'activa' : ''}`} style={{ backgroundImage: `url("${f.url}")` }} role="img" aria-label={f.titulo || 'Cancha de fútbol'} />
      ))}
      <div className="contenedor" style={{ width: '100%' }}>
        <span className="portada-etiqueta">
          <span className="punto-vivo" aria-hidden="true" /> Canchitas de Cusco · horas libres en vivo
        </span>
        <h1 className="portada-titulo" aria-label={FRASES[0]}>
          <span className="lima">{titulo}</span>
          <span className="cursor-escribir" aria-hidden="true" />
        </h1>
        <p className="portada-bajada">
          {total === null ? 'Buscando canchas…' : <><b>{cuenta}</b> cancha{total === 1 ? '' : 's'} esperando tu pichanga. Separa tu hora y paga el adelanto con Yape o Plin.</>}
        </p>
        <form
          className="buscador"
          onSubmit={e => {
            e.preventDefault();
            alBuscar();
          }}
          role="search"
        >
          <input type="search" placeholder="Busca tu zona: Wanchaq, San Sebastián…" value={texto} onChange={e => setTexto(e.target.value)} aria-label="Buscar por nombre o zona" />
          <button className="boton boton-principal">Buscar</button>
        </form>
        {portada.length > 1 && (
          <div className="portada-puntos" aria-label="Fotos de portada">
            {portada.map((f, i) => (
              <button key={f.id} type="button" className={i === actual ? 'activo' : ''} aria-label={`Ver foto ${i + 1}`} onClick={() => setActual(i)} />
            ))}
          </div>
        )}
      </div>
      {foto?.credito && (
        <span className="portada-credito">
          {foto.enlaceCredito ? (
            <a href={foto.enlaceCredito} target="_blank" rel="noopener noreferrer">
              {foto.credito}
            </a>
          ) : (
            foto.credito
          )}
        </span>
      )}
    </section>
  );
}

export default function Inicio() {
  const [filtros, setFiltros] = useState(FILTROS_INICIALES);
  const [texto, setTexto] = useState('');
  const [pagina, setPagina] = useState(1);
  const [yo, setYo] = useState(null);
  const [masFiltros, setMasFiltros] = useState(false);

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
  useAparecer(datos);

  const cambiar = (campo, valor) => {
    setFiltros(f => ({ ...f, [campo]: valor }));
    setPagina(1);
  };
  const alternarFormato = n => cambiar('formato', filtros.formato === String(n) ? '' : String(n));

  const cercaDeMi = () => {
    if (yo) return setYo(null);
    if (!navigator.geolocation) return aviso('Tu navegador no permite compartir la ubicación', 'error');
    navigator.geolocation.getCurrentPosition(
      p => {
        setYo({ lat: p.coords.latitude, lng: p.coords.longitude });
        setPagina(1);
        aviso('Ordenamos las canchas de la más cercana a la más lejana');
      },
      () => aviso('No pudimos leer tu ubicación. Revisa el permiso del navegador.', 'error'),
      { timeout: 10000 }
    );
  };

  const hayFiltros = JSON.stringify(filtros) !== JSON.stringify(FILTROS_INICIALES) || yo;

  return (
    <>
      <Portada total={datos ? datos.total : null} texto={texto} setTexto={setTexto} alBuscar={() => cambiar('q', texto.trim())} />

      <div className="contenedor">
        <div className="chips" role="toolbar" aria-label="Filtros">
          <button type="button" className={`chip ${yo ? 'activo' : ''}`} onClick={cercaDeMi}>
            <LocateFixed size={16} aria-hidden="true" /> Cerca de mí
          </button>
          <button type="button" className={`chip ${filtros.techada ? 'activo' : ''}`} onClick={() => cambiar('techada', !filtros.techada)}>
            <Umbrella size={16} aria-hidden="true" /> Techada
          </button>
          <button type="button" className={`chip ${filtros.conLuz ? 'activo' : ''}`} onClick={() => cambiar('conLuz', !filtros.conLuz)}>
            <Lightbulb size={16} aria-hidden="true" /> Con luz
          </button>
          {[5, 7, 11].map(n => (
            <button key={n} type="button" className={`chip ${filtros.formato === String(n) ? 'activo' : ''}`} onClick={() => alternarFormato(n)}>
              Fulbito {n}
            </button>
          ))}
          <button type="button" className={`chip ${masFiltros ? 'activo' : ''}`} onClick={() => setMasFiltros(v => !v)}>
            <SlidersHorizontal size={16} aria-hidden="true" /> Más filtros
          </button>
          {hayFiltros && (
            <button
              type="button"
              className="chip"
              onClick={() => {
                setFiltros(FILTROS_INICIALES);
                setTexto('');
                setYo(null);
              }}
            >
              <X size={16} aria-hidden="true" /> Limpiar
            </button>
          )}
        </div>
        {masFiltros && (
          <div className="filtros-extra">
            <select value={filtros.tipo} onChange={e => cambiar('tipo', e.target.value)} aria-label="Tipo de cancha">
              <option value="">Todo tipo de piso</option>
              <option value="SINTETICO">Sintético</option>
              <option value="LOSA">Losa</option>
              <option value="GRASS">Grass natural</option>
            </select>
            <input type="number" min="1" placeholder="Precio máx. S/ por hora" value={filtros.precioMax} onChange={e => cambiar('precioMax', e.target.value)} aria-label="Precio máximo por hora" />
          </div>
        )}

        {cargando && !datos && <Esqueletos cantidad={3} />}
        <MensajeError error={error} alReintentar={recargar} />

        {datos && datos.items.length === 0 && (
          <Vacio titulo="Ninguna cancha con esos filtros" texto="Prueba quitando alguno: quizá la techada que buscas no tiene luz.">
            <button type="button" className="boton boton-principal" onClick={() => { setFiltros(FILTROS_INICIALES); setYo(null); setTexto(''); }}>
              Ver todas las canchas
            </button>
          </Vacio>
        )}

        {datos && datos.items.length > 0 && (
          <>
            <div className="fila-titulo">
              <h2>{yo ? 'Las más cerca de ti' : filtros.q ? `Resultados para "${filtros.q}"` : 'Canchas con horas libres'}</h2>
              <span className="texto-suave">{datos.total} cancha{datos.total === 1 ? '' : 's'}</span>
            </div>
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
              <nav className="paginacion fila-botones" style={{ justifyContent: 'center', marginTop: '1.5rem' }} aria-label="Páginas">
                <button type="button" className="boton" disabled={pagina <= 1} onClick={() => setPagina(p => p - 1)}>
                  <ChevronLeft size={18} aria-hidden="true" /> Anterior
                </button>
                <span>
                  Página {datos.pagina} de {datos.paginas}
                </span>
                <button type="button" className="boton" disabled={pagina >= datos.paginas} onClick={() => setPagina(p => p + 1)}>
                  Siguiente <ChevronRight size={18} aria-hidden="true" />
                </button>
              </nav>
            )}
            <section className="seccion-mapa" data-aparecer>
              <h2>Mapa de canchas</h2>
              <MapaCanchas canchas={datos.items} yo={yo} alto={380} />
            </section>
          </>
        )}
      </div>
    </>
  );
}
