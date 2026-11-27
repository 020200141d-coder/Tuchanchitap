// ============================================================================
//  pruebas/reservas.spec.js — etapa 5: reglas 1, 2, 3, 5 y 8
// ============================================================================

import request from 'supertest';
import app from '../src/app.js';
import reservas from '../src/modules/reservas/reservas.service.js';
import { mantenimiento } from '../src/modules/reservas/mantenimiento.service.js';
import { aUtc, hoyLocal, sumarDias } from '../src/utils/horario.js';
import { reiniciar, crearUsuario, crearCancha, proximoDia, db } from './apoyo/ayudas.js';

beforeEach(reiniciar);

async function escenario() {
  const dueno = await crearUsuario('DUENO');
  const jugador = await crearUsuario('JUGADOR');
  const otroJugador = await crearUsuario('JUGADOR');
  const cancha = await crearCancha(dueno.usuario.id);
  return { dueno, jugador, otroJugador, cancha, martes: proximoDia(2), sabado: proximoDia(6) };
}

const reservar = (auth, cuerpo) => request(app).post('/api/reservas').set(auth).send(cuerpo);

describe('Crear reserva', () => {
  test('regla 3: el precio sale de las tarifas (17–19 un martes = 50 + 70)', async () => {
    const { jugador, cancha, martes } = await escenario();
    const res = await reservar(jugador.auth, { canchaId: cancha.id, fecha: martes, horaInicio: 17, horas: 2 });
    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({ total: 120, adelanto: 36, estado: 'PENDIENTE_PAGO', presencial: false });
    expect(res.body.data.detallePrecio).toEqual([{ hora: 17, precio: 50 }, { hora: 18, precio: 70 }]);
    expect(new Date(res.body.data.inicio).toISOString()).toBe(aUtc(martes, 17).toISOString());
  });

  test('regla 3: si el navegador manda el precio, se rechaza (422)', async () => {
    const { jugador, cancha, martes } = await escenario();
    const res = await reservar(jugador.auth, { canchaId: cancha.id, fecha: martes, horaInicio: 20, total: 1 });
    expect(res.status).toBe(422);
  });

  test('regla 2: separa la hora 15 minutos', async () => {
    const { jugador, cancha, martes } = await escenario();
    const ahora = aUtc(sumarDias(martes, -1), 10);
    const r = await reservas.crear(jugador.usuario, { canchaId: cancha.id, fecha: martes, horaInicio: 20, horas: 1 }, ahora);
    expect(r.expiraEn.getTime() - ahora.getTime()).toBe(15 * 60 * 1000);
  });

  test('regla 1: no se cruza con otra reserva activa (409) aunque solo se pise una hora', async () => {
    const { jugador, otroJugador, cancha, martes } = await escenario();
    expect((await reservar(jugador.auth, { canchaId: cancha.id, fecha: martes, horaInicio: 19, horas: 2 })).status).toBe(201);
    const choque = await reservar(otroJugador.auth, { canchaId: cancha.id, fecha: martes, horaInicio: 20, horas: 2 });
    expect(choque.status).toBe(409);
    // Justo después sí se puede (21–22): los rangos son [inicio, fin)
    expect((await reservar(otroJugador.auth, { canchaId: cancha.id, fecha: martes, horaInicio: 21 })).status).toBe(201);
    expect((await reservar(otroJugador.auth, { canchaId: cancha.id, fecha: martes, horaInicio: 18 })).status).toBe(201);
  });

  test('regla 1: no se cruza con un bloqueo (409)', async () => {
    const { jugador, cancha, martes } = await escenario();
    await db.bloqueo.create({ data: { canchaId: cancha.id, inicio: aUtc(martes, 15), fin: aUtc(martes, 18), motivo: 'LLUVIA' } });
    const res = await reservar(jugador.auth, { canchaId: cancha.id, fecha: martes, horaInicio: 17 });
    expect(res.status).toBe(409);
    expect(res.body.error).toMatch(/bloqueo/);
  });

  test('regla 1 + 2: una reserva cancelada o expirada no ocupa la hora', async () => {
    const { jugador, otroJugador, cancha, martes } = await escenario();
    await db.reserva.create({ data: { canchaId: cancha.id, jugadorId: jugador.usuario.id, inicio: aUtc(martes, 20), fin: aUtc(martes, 21), total: 70, adelanto: 21, estado: 'CANCELADA' } });
    await db.reserva.create({ data: { canchaId: cancha.id, jugadorId: jugador.usuario.id, inicio: aUtc(martes, 21), fin: aUtc(martes, 22), total: 70, adelanto: 21, estado: 'PENDIENTE_PAGO', expiraEn: new Date(Date.now() - 1000) } });
    expect((await reservar(otroJugador.auth, { canchaId: cancha.id, fecha: martes, horaInicio: 20, horas: 2 })).status).toBe(201);
  });

  test('regla 8: no en el pasado, no fuera de horario, no tan lejos (422)', async () => {
    const { jugador, cancha, martes } = await escenario();
    const ayer = sumarDias(hoyLocal(), -1);
    expect((await reservar(jugador.auth, { canchaId: cancha.id, fecha: ayer, horaInicio: 20 })).status).toBe(422);
    const tarde = await reservar(jugador.auth, { canchaId: cancha.id, fecha: martes, horaInicio: 22, horas: 2 }); // cierra a las 23
    expect(tarde.status).toBe(422);
    expect(tarde.body.error).toMatch(/no atiende/);
    expect((await reservar(jugador.auth, { canchaId: cancha.id, fecha: martes, horaInicio: 6 })).status).toBe(422);
    expect((await reservar(jugador.auth, { canchaId: cancha.id, fecha: martes, horaInicio: 23, horas: 2 })).status).toBe(422);
    expect((await reservar(jugador.auth, { canchaId: cancha.id, fecha: sumarDias(hoyLocal(), 40), horaInicio: 20 })).status).toBe(422);
    expect((await reservar(jugador.auth, { canchaId: cancha.id, fecha: martes, horaInicio: 20, horas: 4 })).status).toBe(422);
  });

  test('cancha inexistente o borrador → 404; sin sesión → 401', async () => {
    const { jugador, dueno, martes } = await escenario();
    const borrador = await crearCancha(dueno.usuario.id, { publicada: false });
    expect((await reservar(jugador.auth, { canchaId: 999, fecha: martes, horaInicio: 20 })).status).toBe(404);
    expect((await reservar(jugador.auth, { canchaId: borrador.id, fecha: martes, horaInicio: 20 })).status).toBe(404);
    expect((await request(app).post('/api/reservas').send({ canchaId: borrador.id, fecha: martes, horaInicio: 20 })).status).toBe(401);
  });

  test('máximo 3 reservas esperando pago por jugador (409)', async () => {
    const { jugador, cancha, martes } = await escenario();
    for (const h of [8, 9, 10]) expect((await reservar(jugador.auth, { canchaId: cancha.id, fecha: martes, horaInicio: h })).status).toBe(201);
    const cuarta = await reservar(jugador.auth, { canchaId: cancha.id, fecha: martes, horaInicio: 11 });
    expect(cuarta.status).toBe(409);
    expect(cuarta.body.error).toMatch(/esperando pago/);
  });

  test('el dueño registra una reserva presencial: confirmada y sin adelanto', async () => {
    const { dueno, cancha, sabado } = await escenario();
    const res = await reservar(dueno.auth, { canchaId: cancha.id, fecha: sabado, horaInicio: 10 });
    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({ estado: 'CONFIRMADA', adelanto: 0, total: 80, presencial: true, expiraEn: null });
  });
});

describe('Regla 2 · expiración', () => {
  test('mantenimiento expira las vencidas y marca jugadas las confirmadas que ya pasaron', async () => {
    const { jugador, cancha, martes } = await escenario();
    const ahora = aUtc(sumarDias(martes, -1), 10);
    const r = await reservas.crear(jugador.usuario, { canchaId: cancha.id, fecha: martes, horaInicio: 20, horas: 1 }, ahora);
    expect(await mantenimiento(new Date(ahora.getTime() + 14 * 60 * 1000))).toEqual({ expiradas: 0, jugadas: 0 });
    expect(await mantenimiento(new Date(ahora.getTime() + 16 * 60 * 1000))).toEqual({ expiradas: 1, jugadas: 0 });
    expect((await db.reserva.findUnique({ where: { id: r.id } })).estado).toBe('EXPIRADA');

    await db.reserva.create({ data: { canchaId: cancha.id, jugadorId: jugador.usuario.id, inicio: aUtc(martes, 8), fin: aUtc(martes, 9), total: 50, adelanto: 15, estado: 'CONFIRMADA' } });
    expect((await mantenimiento(aUtc(martes, 9, 1))).jugadas).toBe(1);
  });

  test('una vez expirada, la hora se puede volver a reservar', async () => {
    const { jugador, otroJugador, cancha, martes } = await escenario();
    const ahora = aUtc(sumarDias(martes, -1), 10);
    await reservas.crear(jugador.usuario, { canchaId: cancha.id, fecha: martes, horaInicio: 20, horas: 1 }, ahora);
    const datos = { canchaId: cancha.id, fecha: martes, horaInicio: 20, horas: 1 };
    await expect(reservas.crear(otroJugador.usuario, datos, new Date(ahora.getTime() + 5 * 60 * 1000))).rejects.toMatchObject({ status: 409 });
    const nueva = await reservas.crear(otroJugador.usuario, datos, new Date(ahora.getTime() + 20 * 60 * 1000));
    expect(nueva.jugadorId).toBe(otroJugador.usuario.id);
  });
});

describe('Regla 5 · cancelación', () => {
  async function confirmada(cancha, jugador, fecha, hora) {
    return db.reserva.create({ data: { canchaId: cancha.id, jugadorId: jugador.usuario.id, inicio: aUtc(fecha, hora), fin: aUtc(fecha, hora + 1), total: 70, adelanto: 21, estado: 'CONFIRMADA' } });
  }

  test('el jugador cancela con tiempo: no pierde el adelanto', async () => {
    const { jugador, cancha, martes } = await escenario();
    const r = await confirmada(cancha, jugador, martes, 20);
    const res = await reservas.cancelar(jugador.usuario, r.id, aUtc(martes, 10)); // 10 h antes
    expect(res).toMatchObject({ adelantoPerdido: false });
    expect(res.reserva.estado).toBe('CANCELADA');
    expect(res.mensaje).toMatch(/devolverá/);
  });

  test('el jugador cancela con menos de 6 h: pierde el adelanto', async () => {
    const { jugador, cancha, martes } = await escenario();
    const r = await confirmada(cancha, jugador, martes, 20);
    const res = await reservas.cancelar(jugador.usuario, r.id, aUtc(martes, 15)); // 5 h antes
    expect(res.adelantoPerdido).toBe(true);
    expect(res.mensaje).toMatch(/no se devuelve/);
    expect((await db.reserva.findUnique({ where: { id: r.id } })).adelantoPerdido).toBe(true);
  });

  test('si cancela el dueño, el jugador nunca pierde el adelanto', async () => {
    const { jugador, dueno, cancha, martes } = await escenario();
    const r = await confirmada(cancha, jugador, martes, 20);
    const res = await reservas.cancelar(dueno.usuario, r.id, aUtc(martes, 19));
    expect(res.adelantoPerdido).toBe(false);
    expect(res.mensaje).toMatch(/devuelve el adelanto/);
  });

  test('cancelar una pendiente rechaza su comprobante en revisión', async () => {
    const { jugador, cancha, martes } = await escenario();
    const r = await db.reserva.create({ data: { canchaId: cancha.id, jugadorId: jugador.usuario.id, inicio: aUtc(martes, 20), fin: aUtc(martes, 21), total: 70, adelanto: 21, estado: 'PENDIENTE_PAGO' } });
    await db.pago.create({ data: { reservaId: r.id, metodo: 'YAPE', numeroOperacion: '123', fotoUrl: 'x', monto: 21 } });
    const res = await request(app).post(`/api/reservas/${r.id}/cancelar`).set(jugador.auth);
    expect(res.status).toBe(200);
    expect(res.body.data.mensaje).toBe('Reserva cancelada.');
    expect((await db.pago.findFirst({ where: { reservaId: r.id } })).estado).toBe('RECHAZADO');
  });

  test('otro jugador no puede cancelar (403); ya cancelada (409); ya empezó (422)', async () => {
    const { jugador, otroJugador, cancha, martes } = await escenario();
    const r = await confirmada(cancha, jugador, martes, 20);
    expect((await request(app).post(`/api/reservas/${r.id}/cancelar`).set(otroJugador.auth)).status).toBe(403);
    await expect(reservas.cancelar(jugador.usuario, r.id, aUtc(martes, 20, 30))).rejects.toMatchObject({ status: 422 });
    await reservas.cancelar(jugador.usuario, r.id, aUtc(martes, 8));
    await expect(reservas.cancelar(jugador.usuario, r.id, aUtc(martes, 8))).rejects.toMatchObject({ status: 409 });
    expect((await request(app).post('/api/reservas/999/cancelar').set(jugador.auth)).status).toBe(404);
  });
});

describe('Consultas', () => {
  test('mis reservas, detalle y calendario del dueño respetan permisos', async () => {
    const { jugador, otroJugador, dueno, cancha, martes } = await escenario();
    const otroDueno = await crearUsuario('DUENO');
    const creada = await reservar(jugador.auth, { canchaId: cancha.id, fecha: martes, horaInicio: 20 });
    const id = creada.body.data.id;

    const mias = await request(app).get('/api/reservas/mias').set(jugador.auth);
    expect(mias.body.data).toHaveLength(1);
    expect(mias.body.data[0].cancha).toMatchObject({ nombre: 'Cancha de prueba', telefono: '51984000001' });
    expect((await request(app).get('/api/reservas/mias?estado=CONFIRMADA').set(jugador.auth)).body.data).toHaveLength(0);

    expect((await request(app).get(`/api/reservas/${id}`).set(jugador.auth)).status).toBe(200);
    const vistaDueno = await request(app).get(`/api/reservas/${id}`).set(dueno.auth);
    expect(vistaDueno.body.data.jugador.email).toBeUndefined();
    expect((await request(app).get(`/api/reservas/${id}`).set(otroJugador.auth)).status).toBe(403);
    expect((await request(app).get('/api/reservas/999').set(jugador.auth)).status).toBe(404);

    const calendario = await request(app).get(`/api/canchas/${cancha.id}/reservas`).query({ desde: hoyLocal(), hasta: sumarDias(hoyLocal(), 8) }).set(dueno.auth);
    expect(calendario.status).toBe(200);
    expect(calendario.body.data).toHaveLength(1);
    expect((await request(app).get(`/api/canchas/${cancha.id}/reservas`).set(dueno.auth)).status).toBe(200);
    expect((await request(app).get(`/api/canchas/${cancha.id}/reservas`).set(otroDueno.auth)).status).toBe(403);
    expect((await request(app).get(`/api/canchas/${cancha.id}/reservas`).set(jugador.auth)).status).toBe(403);
  });

  test('GET /api/reglas expone los valores configurables', async () => {
    const res = await request(app).get('/api/reglas');
    expect(res.body.data).toMatchObject({ minutosSeparacion: 15, horasCancelacion: 6, porcentajeAdelanto: 30 });
  });
});
