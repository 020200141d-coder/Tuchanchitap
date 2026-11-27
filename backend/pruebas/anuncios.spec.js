// ============================================================================
//  pruebas/anuncios.spec.js — anuncios discretos: vigencia, zona, rotación,
//  tope por pantalla, clics y CRUD del admin
// ============================================================================

import request from 'supertest';
import app from '../src/app.js';
import anuncios from '../src/modules/anuncios/anuncios.service.js';
import { aUtc, hoyLocal, sumarDias } from '../src/utils/horario.js';
import { reiniciar, crearUsuario, db } from './apoyo/ayudas.js';

beforeEach(reiniciar);

const hoy = () => hoyLocal();
async function anuncio(extra = {}) {
  return db.anuncio.create({ data: { anunciante: 'Tienda', titulo: 'Oferta', texto: 'Texto corto', desde: aUtc(sumarDias(hoy(), -1), 0), hasta: aUtc(sumarDias(hoy(), 10), 24), ...extra } });
}

describe('Mostrar anuncios', () => {
  test('solo vigentes y activos; prioridad a la misma zona; cuenta impresiones', async () => {
    const general = await anuncio({ titulo: 'General' });
    const wanchaq = await anuncio({ titulo: 'Wanchaq', zona: 'Wanchaq' });
    await anuncio({ titulo: 'Otra zona', zona: 'Santiago' });
    await anuncio({ titulo: 'Pausado', activo: false });
    await anuncio({ titulo: 'Vencido', hasta: aUtc(sumarDias(hoy(), -2), 24) });
    const res = await request(app).get('/api/anuncios').query({ zona: 'wanchaq', cantidad: 2 });
    expect(res.body.data.map(a => a.titulo)).toEqual(['Wanchaq', 'General']);
    expect(res.body.data[0].impresiones).toBeUndefined(); // estadísticas solo para el admin
    expect((await db.anuncio.findUnique({ where: { id: wanchaq.id } })).impresiones).toBe(1);
    expect((await db.anuncio.findUnique({ where: { id: general.id } })).impresiones).toBe(1);
  });

  test('nunca más de 2 por pantalla (422) y rota al que menos se ha visto', async () => {
    await anuncio({ titulo: 'A' });
    await anuncio({ titulo: 'B' });
    expect((await request(app).get('/api/anuncios').query({ cantidad: 3 })).status).toBe(422);
    const primero = (await anuncios.paraMostrar({}))[0].titulo;
    const segundo = (await anuncios.paraMostrar({}))[0].titulo;
    expect(new Set([primero, segundo])).toEqual(new Set(['A', 'B']));
  });

  test('sin anuncios vigentes devuelve lista vacía', async () => {
    expect((await request(app).get('/api/anuncios')).body.data).toEqual([]);
  });

  test('el clic se cuenta y devuelve el enlace; uno pausado da 404', async () => {
    const a = await anuncio({ enlace: 'https://wa.me/51984000099' });
    const pausado = await anuncio({ activo: false });
    const res = await request(app).post(`/api/anuncios/${a.id}/clic`);
    expect(res.body.data).toEqual({ enlace: 'https://wa.me/51984000099' });
    expect((await db.anuncio.findUnique({ where: { id: a.id } })).clics).toBe(1);
    expect((await request(app).post(`/api/anuncios/${pausado.id}/clic`)).status).toBe(404);
  });
});

describe('CRUD del admin', () => {
  test('crea, lista con tasa de clics, edita y borra; textos largos → 422', async () => {
    const admin = await crearUsuario('ADMIN');
    const dueno = await crearUsuario('DUENO');
    const datos = { anunciante: 'Deportes X', titulo: 'Chimpunes', texto: 'A dos cuadras', zona: 'Wanchaq', desde: hoy(), hasta: sumarDias(hoy(), 30) };
    expect((await request(app).post('/api/admin/anuncios').set(dueno.auth).send(datos)).status).toBe(403);
    expect((await request(app).post('/api/admin/anuncios').set(admin.auth).send({ ...datos, texto: 'x'.repeat(141) })).status).toBe(422);
    expect((await request(app).post('/api/admin/anuncios').set(admin.auth).send({ ...datos, hasta: sumarDias(hoy(), -1) })).status).toBe(422);
    const creado = await request(app).post('/api/admin/anuncios').set(admin.auth).send(datos);
    expect(creado.status).toBe(201);
    const id = creado.body.data.id;
    await db.anuncio.update({ where: { id }, data: { impresiones: 40, clics: 3 } });
    const lista = await request(app).get('/api/admin/anuncios').set(admin.auth);
    expect(lista.body.data[0]).toMatchObject({ impresiones: 40, clics: 3, tasaClics: 7.5 });
    const pausado = await request(app).patch(`/api/admin/anuncios/${id}`).set(admin.auth).send({ activo: false, hasta: sumarDias(hoy(), 60) });
    expect(pausado.body.data.activo).toBe(false);
    expect((await request(app).patch('/api/admin/anuncios/999').set(admin.auth).send({ activo: true })).status).toBe(404);
    expect((await request(app).delete(`/api/admin/anuncios/${id}`).set(admin.auth)).status).toBe(204);
    expect((await request(app).delete(`/api/admin/anuncios/${id}`).set(admin.auth)).status).toBe(404);
  });
});
