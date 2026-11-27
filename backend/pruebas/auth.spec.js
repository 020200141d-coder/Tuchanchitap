// ============================================================================
//  pruebas/auth.spec.js — etapa 2: registro, login, JWT y roles
// ============================================================================

const express = require('express');
const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../src/app');
const { autenticar, autenticarOpcional, permitir } = require('../src/middleware/auth');
const { manejarErrores } = require('../src/middleware/errores');
const { reiniciar, crearUsuario, db, PASSWORD } = require('./apoyo/ayudas');

beforeEach(reiniciar);

describe('POST /api/auth/registro', () => {
  test('crea un jugador, guarda el hash y devuelve token sin passwordHash', async () => {
    const res = await request(app).post('/api/auth/registro').send({ nombre: 'Carlos', email: 'CARLOS@correo.com', password: 'clave-segura', telefono: '984111222' });
    expect(res.status).toBe(201);
    expect(res.body.data.token).toEqual(expect.any(String));
    expect(res.body.data.usuario).toMatchObject({ email: 'carlos@correo.com', rol: 'JUGADOR', telefono: '51984111222' });
    expect(res.body.data.usuario.passwordHash).toBeUndefined();
    const guardado = await db.usuario.findUnique({ where: { email: 'carlos@correo.com' } });
    expect(guardado.passwordHash).not.toBe('clave-segura');
  });

  test('puede registrarse como DUENO pero no como ADMIN', async () => {
    const dueno = await request(app).post('/api/auth/registro').send({ nombre: 'Rosa', email: 'rosa@correo.com', password: 'clave-segura', rol: 'DUENO' });
    expect(dueno.body.data.usuario.rol).toBe('DUENO');
    const admin = await request(app).post('/api/auth/registro').send({ nombre: 'Hacker', email: 'h@correo.com', password: 'clave-segura', rol: 'ADMIN' });
    expect(admin.status).toBe(422);
    expect(admin.body.campos.rol).toBeDefined();
  });

  test('correo repetido → 409', async () => {
    const datos = { nombre: 'Ana', email: 'ana@correo.com', password: 'clave-segura' };
    await request(app).post('/api/auth/registro').send(datos);
    const res = await request(app).post('/api/auth/registro').send(datos);
    expect(res.status).toBe(409);
    expect(res.body.campos.email).toBeDefined();
  });

  test('datos inválidos → 422 con detalle por campo', async () => {
    const res = await request(app).post('/api/auth/registro').send({ nombre: 'A', email: 'no-es-correo', password: '123' });
    expect(res.status).toBe(422);
    expect(Object.keys(res.body.campos)).toEqual(expect.arrayContaining(['nombre', 'email', 'password']));
  });
});

describe('POST /api/auth/login', () => {
  test('con la clave correcta devuelve un JWT con el rol', async () => {
    const { usuario } = await crearUsuario('DUENO');
    const res = await request(app).post('/api/auth/login').send({ email: usuario.email, password: PASSWORD });
    expect(res.status).toBe(200);
    const datos = jwt.decode(res.body.data.token);
    expect(datos).toMatchObject({ sub: usuario.id, rol: 'DUENO' });
  });

  test('clave incorrecta o correo inexistente → 401 con el mismo mensaje', async () => {
    const { usuario } = await crearUsuario();
    const a = await request(app).post('/api/auth/login').send({ email: usuario.email, password: 'otra-clave' });
    const b = await request(app).post('/api/auth/login').send({ email: 'nadie@correo.com', password: 'otra-clave' });
    expect(a.status).toBe(401);
    expect(b.status).toBe(401);
    expect(a.body.error).toBe(b.body.error);
  });

  test('cuenta desactivada → 403', async () => {
    const { usuario } = await crearUsuario('JUGADOR', { activo: false });
    const res = await request(app).post('/api/auth/login').send({ email: usuario.email, password: PASSWORD });
    expect(res.status).toBe(403);
  });
});

describe('GET/PATCH /api/auth/yo', () => {
  test('sin token → 401; token falso → 401; token válido → 200', async () => {
    expect((await request(app).get('/api/auth/yo')).status).toBe(401);
    expect((await request(app).get('/api/auth/yo').set('Authorization', 'Bearer abc')).status).toBe(401);
    const { usuario, auth } = await crearUsuario();
    const res = await request(app).get('/api/auth/yo').set(auth);
    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe(usuario.id);
  });

  test('si desactivan la cuenta, el token deja de servir (403)', async () => {
    const { usuario, auth } = await crearUsuario();
    await db.usuario.update({ where: { id: usuario.id }, data: { activo: false } });
    expect((await request(app).get('/api/auth/yo').set(auth)).status).toBe(403);
  });

  test('actualiza nombre y contraseña', async () => {
    const { usuario, auth } = await crearUsuario();
    const res = await request(app).patch('/api/auth/yo').set(auth).send({ nombre: 'Nuevo Nombre', password: 'clave-nueva-123' });
    expect(res.status).toBe(200);
    expect(res.body.data.nombre).toBe('Nuevo Nombre');
    const login = await request(app).post('/api/auth/login').send({ email: usuario.email, password: 'clave-nueva-123' });
    expect(login.status).toBe(200);
  });
});

describe('middleware de permisos', () => {
  // Mini app solo para probar los middlewares aislados.
  const mini = express();
  mini.get('/solo-dueno', autenticar, permitir('DUENO', 'ADMIN'), (req, res) => res.json({ ok: true }));
  mini.get('/opcional', autenticarOpcional, (req, res) => res.json({ ok: true, rol: req.usuario?.rol ?? null }));
  mini.get('/sin-auth', permitir('ADMIN'), (req, res) => res.json({ ok: true }));
  mini.use(manejarErrores);

  test('permitir deja pasar al rol correcto y responde 403 al resto', async () => {
    const jugador = await crearUsuario('JUGADOR');
    const dueno = await crearUsuario('DUENO');
    const admin = await crearUsuario('ADMIN');
    expect((await request(mini).get('/solo-dueno').set(jugador.auth)).status).toBe(403);
    expect((await request(mini).get('/solo-dueno').set(dueno.auth)).status).toBe(200);
    expect((await request(mini).get('/solo-dueno').set(admin.auth)).status).toBe(200);
    expect((await request(mini).get('/sin-auth')).status).toBe(401);
  });

  test('autenticarOpcional trata un token roto como visitante', async () => {
    const res = await request(mini).get('/opcional').set('Authorization', 'Bearer roto');
    expect(res.body.rol).toBeNull();
    const { auth } = await crearUsuario('DUENO');
    expect((await request(mini).get('/opcional').set(auth)).body.rol).toBe('DUENO');
  });
});
