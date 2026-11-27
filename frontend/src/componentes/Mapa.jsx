// ============================================================================
//  src/componentes/Mapa.jsx — mapas con Leaflet + OpenStreetMap (gratis)
//
//  ¿Por qué no Google Maps?  Su API pide tarjeta. Las teselas de
//  OpenStreetMap son gratuitas para un uso moderado como este (con la
//  atribución visible, que es obligatoria).
//
//  • MapaCanchas: todas las canchas del listado como pines; al tocar uno se
//    abre un globo con el enlace a su ficha. Si el jugador compartió su
//    ubicación, se muestra un punto azul.
//  • SelectorUbicacion: para el formulario del dueño; tocar el mapa fija lat
//    y lng de la cancha.
//  Los pines son íconos dibujados con CSS (divIcon) para no depender de las
//  imágenes por defecto de Leaflet, que se rompen al empaquetar con Vite.
// ============================================================================

import { MapContainer, Marker, Popup, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Link } from 'react-router-dom';
import { useEffect } from 'react';
import { soles } from '../util/formato';

export const CENTRO_CUSCO = [-13.5226, -71.9673];

const pin = new L.DivIcon({ className: 'pin', html: '<span></span>', iconSize: [26, 26], iconAnchor: [13, 26], popupAnchor: [0, -24] });
const puntoYo = new L.DivIcon({ className: 'pin-yo', html: '<span></span>', iconSize: [16, 16], iconAnchor: [8, 8] });

function Teselas() {
  return <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' maxZoom={19} />;
}

// Ajusta el encuadre para que se vean todos los pines.
function Encuadre({ puntos }) {
  const mapa = useMap();
  useEffect(() => {
    if (puntos.length === 0) return;
    if (puntos.length === 1) mapa.setView(puntos[0], 15);
    else mapa.fitBounds(puntos, { padding: [30, 30], maxZoom: 15 });
  }, [mapa, JSON.stringify(puntos)]); // eslint-disable-line react-hooks/exhaustive-deps
  return null;
}

export function MapaCanchas({ canchas, yo, alto = 340 }) {
  const puntos = canchas.map(c => [c.lat, c.lng]);
  if (yo) puntos.push([yo.lat, yo.lng]);
  return (
    <MapContainer center={CENTRO_CUSCO} zoom={13} style={{ height: alto }} className="mapa" scrollWheelZoom={false}>
      <Teselas />
      <Encuadre puntos={puntos} />
      {canchas.map(c => (
        <Marker key={c.id} position={[c.lat, c.lng]} icon={pin} title={c.nombre}>
          <Popup>
            <strong>{c.nombre}</strong>
            <br />
            {c.zona} {c.precioDesde !== null && `· desde ${soles(c.precioDesde)}/h`}
            <br />
            <Link to={`/canchas/${c.id}`}>Ver horas libres</Link>
          </Popup>
        </Marker>
      ))}
      {yo && <Marker position={[yo.lat, yo.lng]} icon={puntoYo} title="Tu ubicación" />}
    </MapContainer>
  );
}

// Dentro de un <dialog> el mapa se crea antes de que el diálogo tenga su
// tamaño final y Leaflet pinta solo un pedazo; recalculamos al aparecer.
function AjustarTamano() {
  const mapa = useMap();
  useEffect(() => {
    const t = setTimeout(() => mapa.invalidateSize(), 200);
    return () => clearTimeout(t);
  }, [mapa]);
  return null;
}

function AlTocar({ alElegir }) {
  useMapEvents({ click: e => alElegir({ lat: Number(e.latlng.lat.toFixed(6)), lng: Number(e.latlng.lng.toFixed(6)) }) });
  return null;
}

export function SelectorUbicacion({ lat, lng, alElegir, alto = 240 }) {
  const hay = Number.isFinite(lat) && Number.isFinite(lng);
  return (
    <MapContainer center={hay ? [lat, lng] : CENTRO_CUSCO} zoom={hay ? 16 : 13} style={{ height: alto }} className="mapa">
      <Teselas />
      <AjustarTamano />
      <AlTocar alElegir={alElegir} />
      {hay && <Encuadre puntos={[[lat, lng]]} />}
      {hay && <Marker position={[lat, lng]} icon={pin} />}
    </MapContainer>
  );
}

// Mapa pequeño de una sola cancha (ficha).
export function MapaUnaCancha({ cancha, alto = 220 }) {
  return (
    <MapContainer center={[cancha.lat, cancha.lng]} zoom={16} style={{ height: alto }} className="mapa" scrollWheelZoom={false}>
      <Teselas />
      <Marker position={[cancha.lat, cancha.lng]} icon={pin} title={cancha.nombre} />
    </MapContainer>
  );
}
