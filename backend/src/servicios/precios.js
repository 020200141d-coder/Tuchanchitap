// ============================================================================
//  src/servicios/precios.js — cálculo del precio de una reserva (regla 3)
//
//  Regla 3: el precio SIEMPRE sale de las tarifas de la cancha. El navegador
//  solo manda cancha, fecha, hora de inicio y cuántas horas; jamás el monto
//  (el validador de reservas rechaza cualquier campo extra como "total").
//
//  Cómo se calcula: hora por hora. Si alguien reserva de 17 a 19 un martes y
//  la tarifa diurna (8–18) es S/ 50 y la nocturna (18–23) S/ 70, paga
//  50 + 70 = S/ 120. Si alguna de esas horas no está cubierta por ninguna
//  tarifa, la cancha está cerrada en ese horario → 422 (regla 8).
//
//  Son funciones puras (sin base de datos): fáciles de probar.
// ============================================================================

const { invalido } = require('../lib/errores');
const { NOMBRES_DIAS } = require('../lib/horario');

const tarifaDeLaHora = (tarifas, diaSemana, hora) =>
  tarifas.find(t => t.diaSemana === diaSemana && t.horaInicio <= hora && hora < t.horaFin);

/**
 * @param {Array} tarifas  tarifas de la cancha
 * @param {number} diaSemana 0–6
 * @param {number} horaInicio hora local entera
 * @param {number} horas  duración en horas
 * @returns {{ total: number, detalle: Array<{ hora: number, precio: number }> }}
 */
function calcularPrecio(tarifas, diaSemana, horaInicio, horas) {
  const detalle = [];
  for (let h = horaInicio; h < horaInicio + horas; h++) {
    const tarifa = tarifaDeLaHora(tarifas, diaSemana, h);
    if (!tarifa) {
      throw invalido(`La cancha no atiende el ${NOMBRES_DIAS[diaSemana]} a las ${String(h).padStart(2, '0')}:00`, { horaInicio: 'Fuera del horario de la cancha' });
    }
    detalle.push({ hora: h, precio: Number(tarifa.precioHora) });
  }
  const total = detalle.reduce((s, d) => s + d.precio, 0);
  return { total: Math.round(total * 100) / 100, detalle };
}

// Adelanto que se paga por Yape/Plin: un porcentaje del total, redondeado
// hacia arriba al sol entero (más fácil de yapear).
const calcularAdelanto = (total, porcentaje) => Math.min(total, Math.ceil((total * porcentaje) / 100));

// ¿Dos franjas del mismo día se pisan? (inicio < finOtro && fin > inicioOtro)
const seCruzan = (a, b) => a.diaSemana === b.diaSemana && a.horaInicio < b.horaFin && a.horaFin > b.horaInicio;

module.exports = { calcularPrecio, calcularAdelanto, tarifaDeLaHora, seCruzan };
