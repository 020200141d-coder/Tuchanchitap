// ============================================================================
//  pruebas/imagenes.spec.js — imágenes del sitio administrables por el ADMIN
//  y horas libres de hoy en el listado de canchas
// ============================================================================

const request = require('supertest');
const app = require('../src/app');
const { reiniciar, crearUsuario, crearCancha, db } = require('./apoyo/ayudas');

beforeEach(reiniciar);

const PNG = Buffer.from('89504e470d0a1a0a', 'hex');
const imagen = extra => db.imagenSitio.create({ data: { lugar: 'PORTADA', url: 'https://ejemplo.test/a.jpg', ...extra } });

describe('Imágenes públicas', () => {
  test('agrupa por lugar, solo activas y en orden', async () => {
    await imagen({ titulo: 'Segunda', orden: 2 });
    await imagen({ titulo: 'Primera', orden: 1 });
    await imagen({ titulo: 'Pausada', activa: false });
    await imagen({ lugar: 'INGRESO', titulo: 'Login' });
    const res = await request(app).get('/api/imagenes');
    expect(res.body.data.PORTADA.map(i => i.titulo)).toEqual(['Primera', 'Segunda']);
    expect(res.body.data.INGRESO).toHaveLength(1);
    expect(res.body.data.CANCHA_SIN_FOTO).toEqual([]);
    const solo = await request(app).get('/api/imagenes').query({ lugar: 'INGRESO' });
    expect(solo.body.data.map(i => i.titulo)).toEqual(['Login']);
  });
});

describe('CRUD del admin', () => {
  test('crea por URL o subiendo archivo; sin ninguno → 422; dueño → 403', async () => {
    const admin = await crearUsuario('ADMIN');
    const dueno = await crearUsuario('DUENO');
    expect((await request(app).post('/api/admin/imagenes').set(dueno.auth).send({ lugar: 'PORTADA', url: 'https://x.test/a.jpg' })).status).toBe(403);
    expect((await request(app).post('/api/admin/imagenes').set(admin.auth).field('lugar', 'PORTADA')).status).toBe(422);
    const porUrl = await request(app).post('/api/admin/imagenes').set(admin.auth).field('lugar', 'PORTADA').field('url', 'https://x.test/a.jpg').field('credito', 'Foto de Ana');
    expect(porUrl.status).toBe(201);
    expect(porUrl.body.data).toMatchObject({ orden: 0, activa: true, credito: 'Foto de Ana' });
    const subida = await request(app).post('/api/admin/imagenes').set(admin.auth).field('lugar', 'PORTADA').field('activa', 'true').attach('imagen', PNG, { filename: 'f.png', contentType: 'image/png' });
    expect(subida.status).toBe(201);
    expect(subida.body.data.url).toMatch(/\/uploads\/sitio\//);
    expect(subida.body.data.orden).toBe(1); // va al final
    expect((await request(app).get('/api/admin/imagenes').set(admin.auth)).body.data).toHaveLength(2);
  });

  test('editar, pausar y borrar; nunca deja un lugar sin imágenes activas (409)', async () => {
    const admin = await crearUsuario('ADMIN');
    const unica = await imagen({ lugar: 'INGRESO' });
    expect((await request(app).patch(`/api/admin/imagenes/${unica.id}`).set(admin.auth).send({ activa: false })).status).toBe(409);
    expect((await request(app).patch(`/api/admin/imagenes/${unica.id}`).set(admin.auth).send({ lugar: 'PORTADA' })).status).toBe(409);
    expect((await request(app).delete(`/api/admin/imagenes/${unica.id}`).set(admin.auth)).status).toBe(409);
    const otra = await imagen({ lugar: 'INGRESO' });
    const editada = await request(app).patch(`/api/admin/imagenes/${unica.id}`).set(admin.auth).send({ titulo: 'Nuevo', orden: 5, activa: false });
    expect(editada.body.data).toMatchObject({ titulo: 'Nuevo', orden: 5, activa: false });
    expect((await request(app).delete(`/api/admin/imagenes/${unica.id}`).set(admin.auth)).status).toBe(204); // ya estaba pausada
    expect((await request(app).delete(`/api/admin/imagenes/${unica.id}`).set(admin.auth)).status).toBe(404);
    expect((await request(app).patch('/api/admin/imagenes/999').set(admin.auth).send({ orden: 1 })).status).toBe(404);
    expect((await db.imagenSitio.findUnique({ where: { id: otra.id } })).activa).toBe(true);
  });
});

describe('Listado con horas libres de hoy', () => {
  test('cada tarjeta trae hasta 4 horas libres de hoy', async () => {
    const dueno = await crearUsuario('DUENO');
    await crearCancha(dueno.usuario.id);
    const res = await request(app).get('/api/canchas');
    const horas = res.body.data.items[0].horasLibresHoy;
    expect(Array.isArray(horas)).toBe(true);
    expect(horas.length).toBeLessThanOrEqual(4);
    for (const h of horas) expect(h).toEqual({ hora: expect.any(Number), etiqueta: expect.stringMatching(/^\d\d:00$/), precio: expect.any(Number) });
  });
});
