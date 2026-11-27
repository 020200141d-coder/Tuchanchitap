// ============================================================================
//  pruebas/horarios.spec.js — etapa 4: tarifas, bloqueos y horas libres
//  (incluye la regla 3: el precio sale de la tarifa por franja)
// ============================================================================

import request from 'supertest';
import app from '../src/app.js';
import { calcularPrecio, calcularAdelanto } from '../src/modules/horarios/precios.service.js';
import { horasDelDia } from '../src/modules/horarios/disponibilidad.service.js';
import { aUtc } from '../src/utils/horario.js';
import { reiniciar, crearUsuario, crearCancha, proximoDia, db } from './apoyo/ayudas.js';

beforeEach(reiniciar);

describe('Regla 3 · precio por franja (funciones puras)', () => {
  const tarifas = [
    { diaSemana: 2, horaInicio: 8, horaFin: 18, precioHora: 50 },
    { diaSemana: 2, horaInicio: 18, horaFin: 23, precioHora: 70 },
    { diaSemana: 6, horaInicio: 7, horaFin: 23, precioHora: 80 }
  ];
  test('suma hora por hora cruzando de día a noche', () => {
    expect(calcularPrecio(tarifas, 2, 17, 2)).toEqual({ total: 120, detalle: [{ hora: 17, precio: 50 }, { hora: 18, precio: 70 }] });
  });
  test('fin de semana usa su propia tarifa', () => {
    expect(calcularPrecio(tarifas, 6, 20, 1).total).toBe(80);
  });
  test('fuera de toda franja → 422 (regla 8)', () => {
    expect(() => calcularPrecio(tarifas, 2, 22, 2)).toThrow(expect.objectContaining({ status: 422 }));
    expect(() => calcularPrecio(tarifas, 3, 20, 1)).toThrow(/no atiende el miércoles/);
  });
  test('el adelanto redondea al sol hacia arriba y nunca supera el total', () => {
    expect(calcularAdelanto(70, 30)).toBe(21);
    expect(calcularAdelanto(55, 30)).toBe(17);
    expect(calcularAdelanto(10, 150)).toBe(10);
  });
});

describe('Tarifas (CRUD del dueño)', () => {
  test('crea una franja para varios días y rechaza cruces (409)', async () => {
    const dueno = await crearUsuario('DUENO');
    const cancha = await db.cancha.create({ data: { duenoId: dueno.usuario.id, nombre: 'Sin tarifas', tipo: 'LOSA', formato: 5, lat: -13.5, lng: -71.9, direccion: 'Calle 1 de prueba' } });
    const res = await request(app).post(`/api/canchas/${cancha.id}/tarifas`).set(dueno.auth).send({ dias: [1, 2, 3, 3], horaInicio: 18, horaFin: 23, precioHora: 70 });
    expect(res.status).toBe(201);
    expect(res.body.data).toHaveLength(3); // el 3 repetido se cuenta una vez
    const cruce = await request(app).post(`/api/canchas/${cancha.id}/tarifas`).set(dueno.auth).send({ dias: [2], horaInicio: 20, horaFin: 24, precioHora: 90 });
    expect(cruce.status).toBe(409);
    expect(cruce.body.error).toMatch(/se cruza/);
    const lista = await request(app).get(`/api/canchas/${cancha.id}/tarifas`);
    expect(lista.body.data.map(t => t.diaSemana)).toEqual([1, 2, 3]);
  });

  test('valida el rango de horas (422) y solo el dueño edita (403)', async () => {
    const dueno = await crearUsuario('DUENO');
    const otro = await crearUsuario('DUENO');
    const cancha = await crearCancha(dueno.usuario.id);
    expect((await request(app).post(`/api/canchas/${cancha.id}/tarifas`).set(dueno.auth).send({ dias: [1], horaInicio: 20, horaFin: 18, precioHora: 10 })).status).toBe(422);
    const tarifa = await db.tarifa.findFirst({ where: { canchaId: cancha.id, diaSemana: 1, horaInicio: 18 } });
    expect((await request(app).patch(`/api/tarifas/${tarifa.id}`).set(otro.auth).send({ precioHora: 1 })).status).toBe(403);
    const editada = await request(app).patch(`/api/tarifas/${tarifa.id}`).set(dueno.auth).send({ precioHora: 75 });
    expect(editada.body.data.precioHora).toBe(75);
    expect((await request(app).patch(`/api/tarifas/${tarifa.id}`).set(dueno.auth).send({ horaInicio: 10 })).status).toBe(409); // pisa la diurna
    expect((await request(app).patch(`/api/tarifas/${tarifa.id}`).set(dueno.auth).send({ horaInicio: 23, horaFin: 23 })).status).toBe(422);
    expect((await request(app).delete(`/api/tarifas/${tarifa.id}`).set(dueno.auth)).status).toBe(204);
    expect((await request(app).delete(`/api/tarifas/${tarifa.id}`).set(dueno.auth)).status).toBe(404);
    expect((await request(app).get('/api/canchas/999/tarifas')).status).toBe(404);
  });
});

describe('Bloqueos', () => {
  test('el dueño bloquea por lluvia; se listan y se quitan', async () => {
    const dueno = await crearUsuario('DUENO');
    const cancha = await crearCancha(dueno.usuario.id);
    const fecha = proximoDia(3);
    const res = await request(app).post(`/api/canchas/${cancha.id}/bloqueos`).set(dueno.auth).send({ fecha, horaInicio: 15, horaFin: 18, motivo: 'LLUVIA' });
    expect(res.status).toBe(201);
    expect(new Date(res.body.data.inicio).toISOString()).toBe(aUtc(fecha, 15).toISOString());
    expect((await request(app).post(`/api/canchas/${cancha.id}/bloqueos`).set(dueno.auth).send({ fecha, horaInicio: 17, horaFin: 19 })).status).toBe(409);
    const lista = await request(app).get(`/api/canchas/${cancha.id}/bloqueos`).set(dueno.auth);
    expect(lista.body.data).toHaveLength(1);
    const rango = await request(app).get(`/api/canchas/${cancha.id}/bloqueos`).query({ desde: fecha, hasta: fecha }).set(dueno.auth);
    expect(rango.body.data).toHaveLength(1);
    expect((await request(app).delete(`/api/bloqueos/${res.body.data.id}`).set(dueno.auth)).status).toBe(204);
    expect((await request(app).delete(`/api/bloqueos/${res.body.data.id}`).set(dueno.auth)).status).toBe(404);
  });

  test('no se bloquea el pasado (422) ni encima de reservas activas (409); otro dueño 403', async () => {
    const dueno = await crearUsuario('DUENO');
    const otro = await crearUsuario('DUENO');
    const jugador = await crearUsuario('JUGADOR');
    const cancha = await crearCancha(dueno.usuario.id);
    expect((await request(app).post(`/api/canchas/${cancha.id}/bloqueos`).set(dueno.auth).send({ fecha: '2020-01-01' })).status).toBe(422);
    const fecha = proximoDia(4);
    await db.reserva.create({ data: { canchaId: cancha.id, jugadorId: jugador.usuario.id, inicio: aUtc(fecha, 20), fin: aUtc(fecha, 21), total: 70, adelanto: 21, estado: 'CONFIRMADA' } });
    const res = await request(app).post(`/api/canchas/${cancha.id}/bloqueos`).set(dueno.auth).send({ fecha, motivo: 'MANTENIMIENTO' });
    expect(res.status).toBe(409);
    expect(res.body.error).toMatch(/1 reserva/);
    expect((await request(app).post(`/api/canchas/${cancha.id}/bloqueos`).set(otro.auth).send({ fecha })).status).toBe(403);
  });
});

describe('Horas libres por día', () => {
  test('marca libre, ocupada, bloqueada con el precio de cada franja', async () => {
    const dueno = await crearUsuario('DUENO');
    const jugador = await crearUsuario('JUGADOR');
    const cancha = await crearCancha(dueno.usuario.id);
    const martes = proximoDia(2);
    await db.reserva.create({ data: { canchaId: cancha.id, jugadorId: jugador.usuario.id, inicio: aUtc(martes, 19), fin: aUtc(martes, 21), total: 140, adelanto: 42, estado: 'CONFIRMADA' } });
    await db.bloqueo.create({ data: { canchaId: cancha.id, inicio: aUtc(martes, 8), fin: aUtc(martes, 10), motivo: 'LLUVIA' } });
    // Una cancelada no ocupa.
    await db.reserva.create({ data: { canchaId: cancha.id, jugadorId: jugador.usuario.id, inicio: aUtc(martes, 22), fin: aUtc(martes, 23), total: 70, adelanto: 21, estado: 'CANCELADA' } });

    const res = await request(app).get(`/api/canchas/${cancha.id}/disponibilidad`).query({ fecha: martes });
    expect(res.status).toBe(200);
    const porHora = Object.fromEntries(res.body.data.horas.map(h => [h.hora, h]));
    expect(res.body.data.horas).toHaveLength(15); // 8–23
    expect(porHora[8]).toMatchObject({ estado: 'bloqueada', motivo: 'LLUVIA', precio: 50 });
    expect(porHora[10].estado).toBe('libre');
    expect(porHora[19].estado).toBe('ocupada');
    expect(porHora[20]).toMatchObject({ estado: 'ocupada', precio: 70 });
    expect(porHora[22].estado).toBe('libre');
  });

  test('las horas pasadas salen como "pasada" y una reserva sin comprobante vencida se libera', async () => {
    const dueno = await crearUsuario('DUENO');
    const jugador = await crearUsuario('JUGADOR');
    const cancha = await crearCancha(dueno.usuario.id);
    const martes = proximoDia(2);
    await db.reserva.create({ data: { canchaId: cancha.id, jugadorId: jugador.usuario.id, inicio: aUtc(martes, 20), fin: aUtc(martes, 21), total: 70, adelanto: 21, estado: 'PENDIENTE_PAGO', expiraEn: aUtc(martes, 9, 15) } });
    // Simulamos que "ahora" es el martes a las 9:30 (la reserva venció a las 9:15).
    const ahora = aUtc(martes, 9, 30);
    const dia = await horasDelDia(cancha.id, martes, { ahora });
    const porHora = Object.fromEntries(dia.horas.map(h => [h.hora, h.estado]));
    expect(porHora[8]).toBe('pasada');
    expect(porHora[9]).toBe('pasada');
    expect(porHora[20]).toBe('libre');
    expect((await db.reserva.findFirst({ where: { canchaId: cancha.id } })).estado).toBe('EXPIRADA');
  });

  test('día sin tarifas → cerrada; cancha borrador → 404 para visitantes', async () => {
    const dueno = await crearUsuario('DUENO');
    const cancha = await crearCancha(dueno.usuario.id);
    await db.tarifa.deleteMany({ where: { canchaId: cancha.id, diaSemana: 0 } });
    const domingo = await request(app).get(`/api/canchas/${cancha.id}/disponibilidad`).query({ fecha: proximoDia(0) });
    expect(domingo.body.data).toMatchObject({ abierta: false, horas: [] });
    const borrador = await crearCancha(dueno.usuario.id, { publicada: false });
    expect((await request(app).get(`/api/canchas/${borrador.id}/disponibilidad`).query({ fecha: proximoDia(1) })).status).toBe(404);
    expect((await request(app).get(`/api/canchas/${borrador.id}/disponibilidad`).query({ fecha: proximoDia(1) }).set(dueno.auth)).status).toBe(200);
    expect((await request(app).get(`/api/canchas/${cancha.id}/disponibilidad`).query({ fecha: '2026-02-30' })).status).toBe(422);
  });
});
