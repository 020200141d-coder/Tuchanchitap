// ============================================================================
//  pruebas/admin.spec.js — panel de administración (CRUD de usuarios, listados)
// ============================================================================

import request from 'supertest';
import app from '../src/app.js';
import { aUtc } from '../src/utils/horario.js';
import { reiniciar, crearUsuario, crearCancha, proximoDia, db } from './apoyo/ayudas.js';

beforeEach(reiniciar);

describe('Acceso', () => {
  test('todo /api/admin exige ADMIN', async () => {
    const dueno = await crearUsuario('DUENO');
    expect((await request(app).get('/api/admin/resumen')).status).toBe(401);
    expect((await request(app).get('/api/admin/resumen').set(dueno.auth)).status).toBe(403);
    expect((await request(app).get('/api/admin/usuarios').set(dueno.auth)).status).toBe(403);
  });
});

describe('Resumen y listados', () => {
  test('resumen cuenta usuarios, canchas, reservas y pagos por revisar', async () => {
    const admin = await crearUsuario('ADMIN');
    const dueno = await crearUsuario('DUENO');
    const jugador = await crearUsuario('JUGADOR');
    const cancha = await crearCancha(dueno.usuario.id);
    await crearCancha(dueno.usuario.id, { publicada: false });
    const f = proximoDia(2);
    const r = await db.reserva.create({ data: { canchaId: cancha.id, jugadorId: jugador.usuario.id, inicio: aUtc(f, 20), fin: aUtc(f, 21), total: 70, adelanto: 21, estado: 'CONFIRMADA' } });
    await db.reserva.create({ data: { canchaId: cancha.id, jugadorId: jugador.usuario.id, inicio: aUtc(f, 21), fin: aUtc(f, 22), total: 70, adelanto: 21 } });
    await db.pago.create({ data: { reservaId: r.id, metodo: 'YAPE', numeroOperacion: '1', fotoUrl: 'x', monto: 21 } });
    const res = await request(app).get('/api/admin/resumen').set(admin.auth);
    expect(res.body.data).toMatchObject({
      usuarios: { jugadores: 1, duenos: 1, admins: 1, total: 3 },
      canchas: { total: 2, publicadas: 1 },
      reservas: { confirmadas: 1, pendientesPago: 1 },
      pagosPorRevisar: 1,
      montoReservado: 70
    });
    const reservas = await request(app).get('/api/admin/reservas').query({ estado: 'CONFIRMADA' }).set(admin.auth);
    expect(reservas.body.data.total).toBe(1);
    expect(reservas.body.data.items[0].jugador.nombre).toBe(jugador.usuario.nombre);
  });

  test('usuarios: busca por texto, filtra por rol y pagina', async () => {
    const admin = await crearUsuario('ADMIN');
    for (let i = 0; i < 3; i++) await crearUsuario('JUGADOR');
    await crearUsuario('DUENO');
    const jugadores = await request(app).get('/api/admin/usuarios').query({ rol: 'JUGADOR', porPagina: 2 }).set(admin.auth);
    expect(jugadores.body.data).toMatchObject({ total: 3, paginas: 2 });
    expect(jugadores.body.data.items).toHaveLength(2);
    expect(jugadores.body.data.items[0].passwordHash).toBeUndefined();
    const busqueda = await request(app).get('/api/admin/usuarios').query({ q: 'dueno' }).set(admin.auth);
    expect(busqueda.body.data.total).toBe(1);
  });
});

describe('CRUD de usuarios', () => {
  test('crea un dueño, lo edita, lo desactiva y no puede ingresar', async () => {
    const admin = await crearUsuario('ADMIN');
    const creado = await request(app).post('/api/admin/usuarios').set(admin.auth).send({ nombre: 'Dueño Nuevo', email: 'nuevo@canchas.test', password: 'clave-segura', rol: 'DUENO' });
    expect(creado.status).toBe(201);
    const id = creado.body.data.id;
    expect((await request(app).post('/api/admin/usuarios').set(admin.auth).send({ nombre: 'Otro', email: 'nuevo@canchas.test', password: 'clave-segura', rol: 'JUGADOR' })).status).toBe(409);
    const editado = await request(app).patch(`/api/admin/usuarios/${id}`).set(admin.auth).send({ nombre: 'Dueño Editado', activo: false, password: 'otra-clave-123' });
    expect(editado.body.data).toMatchObject({ nombre: 'Dueño Editado', activo: false });
    expect((await request(app).post('/api/auth/login').send({ email: 'nuevo@canchas.test', password: 'otra-clave-123' })).status).toBe(403);
    expect((await request(app).patch('/api/admin/usuarios/999').set(admin.auth).send({ nombre: 'X Y' })).status).toBe(404);
  });

  test('el admin no se quita su rol ni se desactiva ni se borra (409)', async () => {
    const admin = await crearUsuario('ADMIN');
    expect((await request(app).patch(`/api/admin/usuarios/${admin.usuario.id}`).set(admin.auth).send({ rol: 'JUGADOR' })).status).toBe(409);
    expect((await request(app).patch(`/api/admin/usuarios/${admin.usuario.id}`).set(admin.auth).send({ activo: false })).status).toBe(409);
    expect((await request(app).delete(`/api/admin/usuarios/${admin.usuario.id}`).set(admin.auth)).status).toBe(409);
  });

  test('no cambia de rol a un dueño con canchas; correo repetido al editar (409)', async () => {
    const admin = await crearUsuario('ADMIN');
    const dueno = await crearUsuario('DUENO');
    const jugador = await crearUsuario('JUGADOR');
    await crearCancha(dueno.usuario.id);
    expect((await request(app).patch(`/api/admin/usuarios/${dueno.usuario.id}`).set(admin.auth).send({ rol: 'JUGADOR' })).status).toBe(409);
    expect((await request(app).patch(`/api/admin/usuarios/${jugador.usuario.id}`).set(admin.auth).send({ email: dueno.usuario.email })).status).toBe(409);
    expect((await request(app).patch(`/api/admin/usuarios/${jugador.usuario.id}`).set(admin.auth).send({ rol: 'DUENO' })).body.data.rol).toBe('DUENO');
  });

  test('borra usuarios sin historial (204) y protege a los que tienen (409)', async () => {
    const admin = await crearUsuario('ADMIN');
    const libre = await crearUsuario('JUGADOR');
    const dueno = await crearUsuario('DUENO');
    await crearCancha(dueno.usuario.id);
    expect((await request(app).delete(`/api/admin/usuarios/${libre.usuario.id}`).set(admin.auth)).status).toBe(204);
    expect((await request(app).delete(`/api/admin/usuarios/${libre.usuario.id}`).set(admin.auth)).status).toBe(404);
    expect((await request(app).delete(`/api/admin/usuarios/${dueno.usuario.id}`).set(admin.auth)).status).toBe(409);
  });
});

describe('Moderación de reseñas y canchas', () => {
  test('lista y borra reseñas', async () => {
    const admin = await crearUsuario('ADMIN');
    const dueno = await crearUsuario('DUENO');
    const jugador = await crearUsuario('JUGADOR');
    const cancha = await crearCancha(dueno.usuario.id);
    const r = await db.reserva.create({ data: { canchaId: cancha.id, jugadorId: jugador.usuario.id, inicio: new Date(), fin: new Date(), total: 50, adelanto: 15, estado: 'JUGADA' } });
    const resena = await db.resena.create({ data: { reservaId: r.id, estrellas: 1, texto: 'texto ofensivo' } });
    const lista = await request(app).get('/api/admin/resenas').set(admin.auth);
    expect(lista.body.data[0]).toMatchObject({ cancha: 'Cancha de prueba', estrellas: 1 });
    expect((await request(app).delete(`/api/admin/resenas/${resena.id}`).set(admin.auth)).status).toBe(204);
    expect((await request(app).delete(`/api/admin/resenas/${resena.id}`).set(admin.auth)).status).toBe(404);
  });

  test('el ADMIN edita, sube tarifas y bloquea canchas de cualquier dueño', async () => {
    const admin = await crearUsuario('ADMIN');
    const dueno = await crearUsuario('DUENO');
    const cancha = await crearCancha(dueno.usuario.id);
    expect((await request(app).patch(`/api/canchas/${cancha.id}`).set(admin.auth).send({ publicada: false })).body.data.publicada).toBe(false);
    expect((await request(app).post(`/api/canchas/${cancha.id}/bloqueos`).set(admin.auth).send({ fecha: proximoDia(1), motivo: 'EVENTO' })).status).toBe(201);
  });
});
