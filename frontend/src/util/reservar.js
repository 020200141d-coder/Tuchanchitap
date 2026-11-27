// ============================================================================
//  src/util/reservar.js — flujo de reserva con alertas (SweetAlert2 + confeti)
//
//  Lo usan la tarjeta del listado (tocar una hora libre) y la ficha de la
//  cancha. Pasos:
//   1. Sin sesión → invita a ingresar y vuelve a la cancha después.
//   2. Confirmación con el resumen (hora, total aproximado, adelanto y
//      minutos para pagar). El precio final lo calcula la API (regla 3).
//   3. Al aceptar → POST /reservas con cargando en el botón. Si la hora se
//      ocupó (409) o está fuera de horario (422), el error sale en la misma
//      ventana.
//   4. Éxito → confeti y opciones: "Pagar ahora" (lleva a Mis reservas con
//      el pago abierto) o "Avisar al equipo" por WhatsApp.
// ============================================================================

import api from '../api/cliente';
import { celebrar, confirmar, seguro } from './alertas';
import { fechaLarga, soles } from './formato';

let reglas = null;
const leerReglas = async () => (reglas ||= await api.get('/reglas').catch(() => ({ porcentajeAdelanto: 30, minutosSeparacion: 15 })));

const dos = n => String(n).padStart(2, '0');

export async function reservarConAlerta({ cancha, fecha, hora, horas = 1, precioEstimado, usuario, navegar }) {
  if (!usuario) {
    const ir = await confirmar({ titulo: 'Ingresa para reservar', html: 'Crea tu cuenta gratis o ingresa: toma menos de un minuto.', boton: 'Ingresar', icono: 'info' });
    if (ir) navegar('/ingresar', { state: { desde: `/canchas/${cancha.id}` } });
    return null;
  }
  const r = await leerReglas();
  const adelanto = precioEstimado ? Math.ceil((precioEstimado * r.porcentajeAdelanto) / 100) : null;
  const html = `
    <b>${seguro(cancha.nombre)}</b>
    <div class="alerta-reserva">
      <div><span>Día</span><b>${seguro(fechaLarga(`${fecha}T12:00:00-05:00`))}</b></div>
      <div><span>Hora</span><b>${dos(hora)}:00 – ${dos(hora + horas)}:00</b></div>
      ${precioEstimado ? `<div><span>Total aprox.</span><b>${soles(precioEstimado)}</b></div><div><span>Adelanto Yape/Plin</span><b>${soles(adelanto)}</b></div>` : ''}
    </div>
    <p style="margin:.7rem 0 0">Te separamos la hora <b>${r.minutosSeparacion} minutos</b> para que pagues el adelanto.</p>`;

  const reserva = await confirmar({
    titulo: '¿Separamos tu hora?',
    html,
    boton: '¡Sí, separar! ⚽',
    cancelar: 'Mejor no',
    accion: () => api.post('/reservas', { canchaId: cancha.id, fecha, horaInicio: hora, horas })
  });
  if (!reserva) return null;

  const texto = `¡Pichanga! Reservé ${cancha.nombre} el ${fechaLarga(reserva.inicio)} de ${dos(hora)}:00 a ${dos(hora + horas)}:00 por tukanchitape. ¿Quién se apunta? ⚽`;
  const eleccion = await celebrar({
    titulo: reserva.presencial ? '¡Reserva registrada!' : '¡Hora separada!',
    html: reserva.presencial
      ? 'Quedó confirmada en tu calendario.'
      : `Total <b>${soles(reserva.total)}</b> · adelanto <b>${soles(reserva.adelanto)}</b><br>Paga ahora para confirmarla.`,
    boton: reserva.presencial ? 'Listo' : 'Pagar ahora',
    otroBoton: 'Avisar al equipo',
    otroBotonEsWhatsApp: true
  });
  if (eleccion === 'otro') window.open(`https://wa.me/?text=${encodeURIComponent(texto)}`, '_blank', 'noopener');
  navegar('/mis-reservas', { state: { nueva: reserva.id, pagar: eleccion === 'principal' && !reserva.presencial } });
  return reserva;
}
