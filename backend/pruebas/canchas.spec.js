// ============================================================================
//  pruebas/canchas.spec.js — etapa 3: CRUD del dueño, listado público y regla 4
// ============================================================================

const request = require('supertest');
const app = require('../src/app');
const { reiniciar, crearUsuario, crearCancha, db } = require('./apoyo/ayudas');

beforeEach(reiniciar);

const nueva = {
  nombre: 'Canchita Nueva',
  tipo: 'SINTETICO',
  formato: 7,
  techada: true,
  conLuz: true,
  lat: -13.53,
  lng: -71.95,
  direccion: 'Av. de la Cultura 1000',
  zona: 'Wanchaq',
  publicada: true
};

describe('CRUD de canchas del dueño', () => {
  test('el dueño crea una cancha a su nombre (201) y hereda su teléfono', async () => {
    const dueno = await crearUsuario('DUENO');
    const res = await request(app).post('/api/canchas').set(dueno.auth).send(nueva);
    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({ nombre: 'Canchita Nueva', duenoId: dueno.usuario.id, telefono: '51984000000' });
  });

  test('un jugador no puede crear canchas (403) y sin token es 401', async () => {
    const jugador = await crearUsuario('JUGADOR');
    expect((await request(app).post('/api/canchas').set(jugador.auth).send(nueva)).status).toBe(403);
    expect((await request(app).post('/api/canchas').send(nueva)).status).toBe(401);
  });

  test('coordenadas fuera de Cusco o formato raro → 422', async () => {
    const dueno = await crearUsuario('DUENO');
    const res = await request(app).post('/api/canchas').set(dueno.auth).send({ ...nueva, lat: 13.53, formato: 6 });
    expect(res.status).toBe(422);
    expect(res.body.campos).toHaveProperty('lat');
    expect(res.body.campos).toHaveProperty('formato');
  });

  test('regla 4: solo el dueño (o ADMIN) edita; otro dueño recibe 403', async () => {
    const dueno = await crearUsuario('DUENO');
    const otro = await crearUsuario('DUENO');
    const admin = await crearUsuario('ADMIN');
    const cancha = await crearCancha(dueno.usuario.id);
    expect((await request(app).patch(`/api/canchas/${cancha.id}`).set(otro.auth).send({ nombre: 'Robada' })).status).toBe(403);
    const propio = await request(app).patch(`/api/canchas/${cancha.id}`).set(dueno.auth).send({ nombre: 'Renombrada' });
    expect(propio.status).toBe(200);
    expect(propio.body.data.nombre).toBe('Renombrada');
    expect(propio.body.data.publicada).toBe(true); // el PATCH no apaga lo que no se envió
    expect((await request(app).patch(`/api/canchas/${cancha.id}`).set(admin.auth).send({ conLuz: false })).status).toBe(200);
    expect((await request(app).patch('/api/canchas/999').set(admin.auth).send({ conLuz: false })).status).toBe(404);
  });

  test('solo ADMIN puede reasignar el dueño, y debe ser un DUENO', async () => {
    const dueno = await crearUsuario('DUENO');
    const otro = await crearUsuario('DUENO');
    const jugador = await crearUsuario('JUGADOR');
    const admin = await crearUsuario('ADMIN');
    const cancha = await crearCancha(dueno.usuario.id);
    expect((await request(app).patch(`/api/canchas/${cancha.id}`).set(dueno.auth).send({ duenoId: otro.usuario.id })).status).toBe(403);
    expect((await request(app).patch(`/api/canchas/${cancha.id}`).set(admin.auth).send({ duenoId: jugador.usuario.id })).status).toBe(422);
    const ok = await request(app).patch(`/api/canchas/${cancha.id}`).set(admin.auth).send({ duenoId: otro.usuario.id });
    expect(ok.body.data.duenoId).toBe(otro.usuario.id);
  });

  test('ADMIN crea canchas indicando el dueño', async () => {
    const admin = await crearUsuario('ADMIN');
    const dueno = await crearUsuario('DUENO');
    expect((await request(app).post('/api/canchas').set(admin.auth).send(nueva)).status).toBe(422);
    const res = await request(app).post('/api/canchas').set(admin.auth).send({ ...nueva, duenoId: dueno.usuario.id });
    expect(res.status).toBe(201);
    expect(res.body.data.duenoId).toBe(dueno.usuario.id);
  });

  test('borrar: 204 sin reservas, 409 con reservas, 403 si no es tuya', async () => {
    const dueno = await crearUsuario('DUENO');
    const otro = await crearUsuario('DUENO');
    const jugador = await crearUsuario('JUGADOR');
    const libre = await crearCancha(dueno.usuario.id);
    const usada = await crearCancha(dueno.usuario.id);
    await db.reserva.create({ data: { canchaId: usada.id, jugadorId: jugador.usuario.id, inicio: new Date(), fin: new Date(), total: 50, adelanto: 15 } });
    expect((await request(app).delete(`/api/canchas/${libre.id}`).set(otro.auth)).status).toBe(403);
    expect((await request(app).delete(`/api/canchas/${libre.id}`).set(dueno.auth)).status).toBe(204);
    expect(await db.tarifa.count({ where: { canchaId: libre.id } })).toBe(0); // cascada
    expect((await request(app).delete(`/api/canchas/${usada.id}`).set(dueno.auth)).status).toBe(409);
  });

  test('/mias: el dueño ve las suyas (incluso borradores) y el ADMIN todas', async () => {
    const d1 = await crearUsuario('DUENO');
    const d2 = await crearUsuario('DUENO');
    const admin = await crearUsuario('ADMIN');
    await crearCancha(d1.usuario.id, { publicada: false });
    await crearCancha(d2.usuario.id);
    expect((await request(app).get('/api/canchas/mias').set(d1.auth)).body.data).toHaveLength(1);
    expect((await request(app).get('/api/canchas/mias').set(admin.auth)).body.data).toHaveLength(2);
  });

  test('subir foto y QR, y quitar foto', async () => {
    const dueno = await crearUsuario('DUENO');
    const cancha = await crearCancha(dueno.usuario.id);
    const png = Buffer.from('89504e470d0a1a0a', 'hex');
    const foto = await request(app).post(`/api/canchas/${cancha.id}/imagenes`).set(dueno.auth).attach('imagen', png, { filename: 'a.png', contentType: 'image/png' });
    expect(foto.status).toBe(201);
    expect(foto.body.data.fotos).toHaveLength(1);
    const qr = await request(app).post(`/api/canchas/${cancha.id}/imagenes?tipo=qr`).set(dueno.auth).attach('imagen', png, { filename: 'qr.png', contentType: 'image/png' });
    expect(qr.body.data.qrPagoUrl).toMatch(/\/uploads\/qr\//);
    const sinArchivo = await request(app).post(`/api/canchas/${cancha.id}/imagenes`).set(dueno.auth);
    expect(sinArchivo.status).toBe(400);
    const pdf = await request(app).post(`/api/canchas/${cancha.id}/imagenes`).set(dueno.auth).attach('imagen', Buffer.from('x'), { filename: 'a.pdf', contentType: 'application/pdf' });
    expect(pdf.status).toBe(400);
    const quitar = await request(app).delete(`/api/canchas/${cancha.id}/fotos`).set(dueno.auth).send({ url: foto.body.data.fotos[0] });
    expect(quitar.body.data.fotos).toHaveLength(0);
    expect((await request(app).delete(`/api/canchas/${cancha.id}/fotos`).set(dueno.auth).send({ url: 'http://x.test/no.png' })).status).toBe(404);
  });
});

describe('Listado público', () => {
  async function preparar() {
    const dueno = await crearUsuario('DUENO');
    const jugador = await crearUsuario('JUGADOR');
    const wanchaq = await crearCancha(dueno.usuario.id, { nombre: 'Wanchaq 7', lat: -13.5262, lng: -71.9662, formato: 7 });
    const sanjeronimo = await crearCancha(dueno.usuario.id, { nombre: 'San Jerónimo 5', zona: 'San Jerónimo', lat: -13.5452, lng: -71.8873, formato: 5, techada: true, tipo: 'LOSA' });
    await crearCancha(dueno.usuario.id, { nombre: 'Borrador', publicada: false });
    // Una cancha barata (tarifa de 20) para probar precioMax.
    const barata = await crearCancha(dueno.usuario.id, { nombre: 'Barata Santiago', lat: -13.5318, lng: -71.9853 });
    await db.tarifa.updateMany({ where: { canchaId: barata.id, horaInicio: 8 }, data: { precioHora: 20 } });
    const r = await db.reserva.create({ data: { canchaId: wanchaq.id, jugadorId: jugador.usuario.id, inicio: new Date(), fin: new Date(), total: 50, adelanto: 15, estado: 'JUGADA' } });
    await db.resena.create({ data: { reservaId: r.id, estrellas: 4 } });
    return { wanchaq, sanjeronimo, barata, dueno };
  }

  test('solo muestra publicadas, con precio desde y estrellas', async () => {
    await preparar();
    const res = await request(app).get('/api/canchas');
    expect(res.status).toBe(200);
    expect(res.body.data.total).toBe(3);
    const w = res.body.data.items.find(c => c.nombre === 'Wanchaq 7');
    expect(w).toMatchObject({ precioDesde: 50, precioHasta: 80, promedioEstrellas: 4, totalResenas: 1 });
    expect(w.dueno?.email).toBeUndefined(); // nunca datos privados del dueño
  });

  test('filtra por formato, tipo, techada, texto y precio máximo', async () => {
    await preparar();
    const nombres = async query => (await request(app).get('/api/canchas').query(query)).body.data.items.map(c => c.nombre);
    expect(await nombres({ formato: 5 })).toEqual(['San Jerónimo 5']);
    expect(await nombres({ tipo: 'LOSA' })).toEqual(['San Jerónimo 5']);
    expect(await nombres({ techada: 'true' })).toEqual(['San Jerónimo 5']);
    expect(await nombres({ q: 'jeróni' })).toEqual(['San Jerónimo 5']);
    expect(await nombres({ precioMax: 30 })).toEqual(['Barata Santiago']);
  });

  test('ordena por cercanía y filtra por radio', async () => {
    await preparar();
    // Desde la Plaza de Armas: Santiago y Wanchaq quedan cerca; San Jerónimo, a ~10 km.
    const res = await request(app).get('/api/canchas').query({ lat: -13.5167, lng: -71.9781 });
    const items = res.body.data.items;
    expect(items[items.length - 1].nombre).toBe('San Jerónimo 5');
    expect(items[0].distanciaKm).toBeLessThan(items[1].distanciaKm);
    const cerca = await request(app).get('/api/canchas').query({ lat: -13.5167, lng: -71.9781, radioKm: 3 });
    expect(cerca.body.data.items.map(c => c.nombre)).not.toContain('San Jerónimo 5');
    expect((await request(app).get('/api/canchas').query({ lat: -13.5 })).status).toBe(422);
  });

  test('pagina los resultados', async () => {
    await preparar();
    const res = await request(app).get('/api/canchas').query({ porPagina: 2, pagina: 2 });
    expect(res.body.data).toMatchObject({ total: 3, pagina: 2, porPagina: 2, paginas: 2 });
    expect(res.body.data.items).toHaveLength(1);
  });

  test('ficha: el borrador es 404 para visitantes pero visible para su dueño', async () => {
    const { dueno } = await preparar();
    const borrador = await db.cancha.findFirst({ where: { nombre: 'Borrador' } });
    expect((await request(app).get(`/api/canchas/${borrador.id}`)).status).toBe(404);
    const propia = await request(app).get(`/api/canchas/${borrador.id}`).set(dueno.auth);
    expect(propia.status).toBe(200);
    expect(propia.body.data.tarifas.length).toBeGreaterThan(0);
    expect((await request(app).get('/api/canchas/abc')).status).toBe(422);
  });
});
