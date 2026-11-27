// ============================================================================
//  src/lib/geo.js — distancia entre dos puntos (fórmula de Haversine)
//
//  Sirve para el filtro "cerca de mí": el navegador manda la ubicación del
//  jugador (lat, lng) y ordenamos las canchas por kilómetros en línea recta.
//  Es gratis y suficiente a escala de ciudad; no necesita Google Maps.
// ============================================================================

const RADIO_TIERRA_KM = 6371;
const rad = g => (g * Math.PI) / 180;

function distanciaKm(a, b) {
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * RADIO_TIERRA_KM * Math.asin(Math.sqrt(h));
}

module.exports = { distanciaKm };
