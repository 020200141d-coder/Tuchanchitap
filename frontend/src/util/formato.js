// ============================================================================
//  src/util/formato.js — textos, fechas y enlaces gratuitos
//
//  • Fechas: la API manda instantes UTC; aquí se muestran en hora de Cusco
//    (America/Lima, UTC-5) sin importar la zona del navegador.
//  • enlaceComoLlegar: enlace oficial y gratuito de Google Maps (no usa la API
//    de pago, no necesita clave).
//  • enlaceWhatsApp: wa.me con el texto listo; abre WhatsApp sin la API de
//    WhatsApp Business (que es de pago).
// ============================================================================

const ZONA = 'America/Lima';

export const soles = n => `S/ ${Number(n ?? 0).toLocaleString('es-PE', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;

export const fechaLarga = d => new Date(d).toLocaleDateString('es-PE', { timeZone: ZONA, weekday: 'long', day: 'numeric', month: 'long' });
export const fechaCorta = d => new Date(d).toLocaleDateString('es-PE', { timeZone: ZONA, day: '2-digit', month: 'short' });
export const hora = d => new Date(d).toLocaleTimeString('es-PE', { timeZone: ZONA, hour: '2-digit', minute: '2-digit', hour12: false });
export const rangoHoras = (inicio, fin) => `${hora(inicio)}–${hora(fin)}`;

// 'YYYY-MM-DD' de hoy en Cusco (en-CA da justo ese formato).
export const hoyCusco = (dias = 0) => new Date(Date.now() + dias * 86400000).toLocaleDateString('en-CA', { timeZone: ZONA });
export const fechaLocal = d => new Date(d).toLocaleDateString('en-CA', { timeZone: ZONA });

export const DIAS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
export const TIPOS = { SINTETICO: 'Sintético', LOSA: 'Losa', GRASS: 'Grass natural' };
export const MOTIVOS = { LLUVIA: 'Lluvia', MANTENIMIENTO: 'Mantenimiento', EVENTO: 'Evento', OTRO: 'Otro' };
export const ESTADOS_RESERVA = {
  PENDIENTE_PAGO: { texto: 'Esperando pago', tono: 'aviso' },
  CONFIRMADA: { texto: 'Confirmada', tono: 'exito' },
  CANCELADA: { texto: 'Cancelada', tono: 'neutro' },
  EXPIRADA: { texto: 'Expirada', tono: 'neutro' },
  JUGADA: { texto: 'Jugada', tono: 'info' }
};
export const ESTADOS_PAGO = {
  PENDIENTE: { texto: 'Por revisar', tono: 'aviso' },
  APROBADO: { texto: 'Aprobado', tono: 'exito' },
  RECHAZADO: { texto: 'Rechazado', tono: 'peligro' }
};

export const enlaceComoLlegar = (lat, lng) => `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;

export const enlaceWhatsApp = (telefono, texto) => (telefono ? `https://wa.me/${telefono}?text=${encodeURIComponent(texto)}` : null);

export function textoReservaWhatsApp(reserva, cancha) {
  return `Hola, reservé ${cancha.nombre} por TukanchitaP el ${fechaLarga(reserva.inicio)} de ${rangoHoras(reserva.inicio, reserva.fin)} (reserva #${reserva.id}). Total ${soles(reserva.total)}, adelanto ${soles(reserva.adelanto)}.`;
}

export const minutosRestantes = expiraEn => (expiraEn ? Math.max(0, Math.ceil((new Date(expiraEn) - Date.now()) / 60000)) : null);
