// ============================================================================
//  pruebas/pagos.spec.js — etapa 6: pagos Yape/Plin (reglas 4 y 6) y reseñas (regla 7)
// ============================================================================

import request from 'supertest';
import app from '../src/app.js';
import pagos from '../src/modules/pagos/pagos.service.js';
import { aUtc } from '../src/utils/horario.js';
import { reiniciar, crearUsuario, crearCancha, proximoDia, db } from './apoyo/ayudas.js';

beforeEach(reiniciar);

const PNG = Buffer.from('89504e470d0a1a0a', 'hex');

async function escenario() {
  const dueno = await crearUsuario('DUENO');
  const otroDueno = await crearUsuario('DUENO');
  const jugador = await crearUsuario('JUGADOR');
  const otroJugador = await crearUsuario('JUGADOR');
  const cancha = await crearCancha(dueno.usuario.id);
  const fecha = proximoDia(3);
  const res = await request(app).post('/api/reservas').set(jugador.auth).send({ canchaId: cancha.id, fecha, horaInicio: 20 });
  return { dueno, otroDueno, jugador, otroJugador, cancha, fecha, reserva: res.body.data };
}

const subir = (auth, reservaId, campos = {}) => {
  const r = request(app).post(`/api/reservas/${reservaId}/pagos`).set(auth);
  for (const [k, v] of Object.entries({ metodo: 'YAPE', numeroOperacion: '12345678', ...campos })) r.field(k, v);
  return r.attach('foto', PNG, { filename: 'comprobante.png', contentType: 'image/png' });
};

describe('Enviar comprobante', () => {
  test('el jugador sube la foto: queda PENDIENTE con el monto del adelanto y la reserva deja de expirar', async () => {
    const { jugador, reserva } = await escenario();
    const res = await subir(jugador.auth, reserva.id, { numeroOperacion: '12 345-678' });
    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({ estado: 'PENDIENTE', metodo: 'YAPE', numeroOperacion: '12345678', monto: 21 });
    expect(res.body.data.fotoUrl).toMatch(/\/uploads\/comprobantes\/.+\.png$/);
    expect((await db.reserva.findUnique({ where: { id: reserva.id } })).expiraEn).toBeNull();
  });

  test('regla 6: el mismo n.º de operación no se acepta dos veces (409)', async () => {
    const { jugador, otroJugador, cancha, fecha, reserva } = await escenario();
    expect((await subir(jugador.auth, reserva.id)).status).toBe(201);
    const otra = await request(app).post('/api/reservas').set(otroJugador.auth).send({ canchaId: cancha.id, fecha, horaInicio: 21 });
    const repetido = await subir(otroJugador.auth, otra.body.data.id, { numeroOperacion: '1234-5678' });
    expect(repetido.status).toBe(409);
    expect(repetido.body.campos.numeroOperacion).toBeDefined();
    // Mismo número pero por Plin es otra operación distinta
    expect((await subir(otroJugador.auth, otra.body.data.id, { metodo: 'PLIN' })).status).toBe(201);
  });

  test('solo el jugador de la reserva (403), un comprobante a la vez (409), con foto (400) y datos válidos (422)', async () => {
    const { jugador, otroJugador, reserva } = await escenario();
    expect((await subir(otroJugador.auth, reserva.id)).status).toBe(403);
    const sinFoto = await request(app).post(`/api/reservas/${reserva.id}/pagos`).set(jugador.auth).field('metodo', 'YAPE').field('numeroOperacion', '999999');
    expect(sinFoto.status).toBe(400);
    expect((await subir(jugador.auth, reserva.id, { numeroOperacion: 'abc' })).status).toBe(422);
    expect((await subir(jugador.auth, reserva.id, { metodo: 'TARJETA' })).status).toBe(422);
    expect((await subir(jugador.auth, reserva.id)).status).toBe(201);
    expect((await subir(jugador.auth, reserva.id, { numeroOperacion: '87654321' })).status).toBe(409);
    expect((await subir(jugador.auth, 999)).status).toBe(404);
  });

  test('regla 2: si la reserva ya expiró, no se acepta el comprobante (409)', async () => {
    const { jugador, reserva } = await escenario();
    const tarde = new Date(new Date(reserva.expiraEn).getTime() + 60 * 1000);
    await expect(pagos.enviar(jugador.usuario, reserva.id, { metodo: 'YAPE', numeroOperacion: '555555' }, { buffer: PNG, mimetype: 'image/png' }, tarde)).rejects.toMatchObject({ status: 409, message: expect.stringMatching(/expiró/) });
  });
});

describe('Revisión del dueño', () => {
  test('regla 4: aprobar confirma la reserva; otro dueño o un jugador reciben 403', async () => {
    const { dueno, otroDueno, jugador, reserva } = await escenario();
    const pago = (await subir(jugador.auth, reserva.id)).body.data;
    expect((await request(app).post(`/api/pagos/${pago.id}/aprobar`).set(otroDueno.auth)).status).toBe(403);
    expect((await request(app).post(`/api/pagos/${pago.id}/aprobar`).set(jugador.auth)).status).toBe(403);
    const res = await request(app).post(`/api/pagos/${pago.id}/aprobar`).set(dueno.auth);
    expect(res.status).toBe(200);
    expect(res.body.data.pago.estado).toBe('APROBADO');
    expect(res.body.data.reserva.estado).toBe('CONFIRMADA');
    expect((await request(app).post(`/api/pagos/${pago.id}/aprobar`).set(dueno.auth)).status).toBe(409);
    expect((await request(app).post('/api/pagos/999/aprobar').set(dueno.auth)).status).toBe(404);
  });

  test('rechazar pide motivo y le da al jugador otros 15 minutos para reenviar', async () => {
    const { dueno, jugador, reserva } = await escenario();
    const pago = (await subir(jugador.auth, reserva.id)).body.data;
    expect((await request(app).post(`/api/pagos/${pago.id}/rechazar`).set(dueno.auth).send({})).status).toBe(422);
    const ahora = new Date();
    const res = await pagos.rechazar(dueno.usuario, pago.id, 'El monto no coincide', ahora);
    expect(res.pago).toMatchObject({ estado: 'RECHAZADO', nota: 'El monto no coincide' });
    expect(res.reserva.expiraEn.getTime() - ahora.getTime()).toBe(15 * 60 * 1000);
    expect((await subir(jugador.auth, reserva.id, { numeroOperacion: '99887766' })).status).toBe(201);
    expect((await request(app).post(`/api/pagos/${pago.id}/rechazar`).set(dueno.auth).send({ nota: 'otra vez' })).status).toBe(409);
  });

  test('no se aprueba el pago de una reserva cancelada (409)', async () => {
    const { dueno, jugador, reserva } = await escenario();
    const pago = (await subir(jugador.auth, reserva.id)).body.data;
    await db.reserva.update({ where: { id: reserva.id }, data: { estado: 'CANCELADA' } });
    expect((await request(app).post(`/api/pagos/${pago.id}/aprobar`).set(dueno.auth)).status).toBe(409);
  });

  test('bandeja: el dueño ve solo los de sus canchas, el ADMIN todos, el jugador 403', async () => {
    const { dueno, otroDueno, jugador, otroJugador, reserva } = await escenario();
    const admin = await crearUsuario('ADMIN');
    await subir(jugador.auth, reserva.id);
    const canchaAjena = await crearCancha(otroDueno.usuario.id);
    const r2 = await request(app).post('/api/reservas').set(otroJugador.auth).send({ canchaId: canchaAjena.id, fecha: proximoDia(3), horaInicio: 20 });
    await subir(otroJugador.auth, r2.body.data.id, { numeroOperacion: '11112222' });

    const mia = await request(app).get('/api/pagos?estado=PENDIENTE').set(dueno.auth);
    expect(mia.body.data).toHaveLength(1);
    expect(mia.body.data[0].reserva.jugador.email).toBeUndefined();
    expect(mia.body.data[0].reserva.cancha.nombre).toBe('Cancha de prueba');
    expect((await request(app).get('/api/pagos').set(admin.auth)).body.data).toHaveLength(2);
    expect((await request(app).get('/api/pagos').set(jugador.auth)).status).toBe(403);
  });
});

describe('Regla 7 · reseñas', () => {
  async function jugada(cancha, jugador) {
    const f = proximoDia(1);
    return db.reserva.create({ data: { canchaId: cancha.id, jugadorId: jugador.usuario.id, inicio: aUtc(f, 8), fin: aUtc(f, 9), total: 50, adelanto: 15, estado: 'JUGADA' } });
  }

  test('quien jugó reseña una vez; la segunda es 409 y aparece en la ficha', async () => {
    const { cancha, jugador } = await escenario();
    const r = await jugada(cancha, jugador);
    const res = await request(app).post(`/api/reservas/${r.id}/resena`).set(jugador.auth).send({ estrellas: 4, texto: 'Buena luz' });
    expect(res.status).toBe(201);
    expect((await request(app).post(`/api/reservas/${r.id}/resena`).set(jugador.auth).send({ estrellas: 5 })).status).toBe(409);
    const lista = await request(app).get(`/api/canchas/${cancha.id}/resenas`);
    expect(lista.body.data).toEqual([expect.objectContaining({ estrellas: 4, texto: 'Buena luz', jugador: jugador.usuario.nombre })]);
    const ficha = await request(app).get(`/api/canchas/${cancha.id}`);
    expect(ficha.body.data.promedioEstrellas).toBe(4);
  });

  test('otro jugador no reseña (403); una reserva no jugada tampoco (422); estrellas fuera de 1–5 (422)', async () => {
    const { cancha, jugador, otroJugador, reserva } = await escenario();
    const r = await jugada(cancha, jugador);
    expect((await request(app).post(`/api/reservas/${r.id}/resena`).set(otroJugador.auth).send({ estrellas: 1 })).status).toBe(403);
    expect((await request(app).post(`/api/reservas/${reserva.id}/resena`).set(jugador.auth).send({ estrellas: 5 })).status).toBe(422);
    expect((await request(app).post(`/api/reservas/${r.id}/resena`).set(jugador.auth).send({ estrellas: 6 })).status).toBe(422);
    expect((await request(app).post('/api/reservas/999/resena').set(jugador.auth).send({ estrellas: 3 })).status).toBe(404);
  });
});
