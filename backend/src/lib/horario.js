// ============================================================================
//  src/lib/horario.js — conversión entre la hora de Cusco y UTC
//
//  ¿Por qué hace falta?
//   La base guarda las fechas en UTC (así lo hace PostgreSQL con timestamptz
//   y Prisma). Pero la persona piensa en "sábado 28 a las 20:00 en Cusco" y
//   las tarifas están en horas locales. Cusco (Perú) es UTC-5 todo el año, sin
//   horario de verano, así que basta con sumar o restar 5 horas: no hace falta
//   una librería de zonas horarias.
//
//  Funciones:
//   aUtc('2026-11-28', 20)   → Date de 2026-11-29T01:00:00Z
//   local(date)              → { fecha: '2026-11-28', hora: 20, minuto: 0, diaSemana: 6 }
//   diaSemana('2026-11-28')  → 6 (0 = domingo … 6 = sábado)
//   hoyLocal()               → 'YYYY-MM-DD' de hoy en Cusco
// ============================================================================

const DESFASE_HORAS = -5; // Perú: UTC-5
const HORA_MS = 60 * 60 * 1000;

const RE_FECHA = /^\d{4}-\d{2}-\d{2}$/;

function partesFecha(fecha) {
  if (!RE_FECHA.test(fecha)) throw new Error(`Fecha inválida: ${fecha}`);
  const [y, m, d] = fecha.split('-').map(Number);
  return { y, m, d };
}

// ¿La fecha existe en el calendario? (rechaza 2026-02-30)
function esFechaValida(fecha) {
  if (!RE_FECHA.test(fecha)) return false;
  const { y, m, d } = partesFecha(fecha);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

// Hora local de Cusco → instante UTC. `hora` puede ser 24 (medianoche siguiente).
function aUtc(fecha, hora = 0, minuto = 0) {
  const { y, m, d } = partesFecha(fecha);
  return new Date(Date.UTC(y, m - 1, d, hora - DESFASE_HORAS, minuto));
}

// Instante UTC → partes en hora de Cusco.
function local(date) {
  const corrido = new Date(new Date(date).getTime() + DESFASE_HORAS * HORA_MS);
  const fecha = corrido.toISOString().slice(0, 10);
  return { fecha, hora: corrido.getUTCHours(), minuto: corrido.getUTCMinutes(), diaSemana: corrido.getUTCDay() };
}

function diaSemana(fecha) {
  const { y, m, d } = partesFecha(fecha);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

const hoyLocal = (ahora = new Date()) => local(ahora).fecha;

// Suma días a una fecha 'YYYY-MM-DD'.
function sumarDias(fecha, dias) {
  const { y, m, d } = partesFecha(fecha);
  return new Date(Date.UTC(y, m - 1, d + dias)).toISOString().slice(0, 10);
}

const NOMBRES_DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];

module.exports = { aUtc, local, diaSemana, hoyLocal, sumarDias, esFechaValida, HORA_MS, NOMBRES_DIAS };
