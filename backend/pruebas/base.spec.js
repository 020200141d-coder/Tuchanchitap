// ============================================================================
//  pruebas/base.spec.js — etapa 1: app, manejador de errores y utilidades
//
//  Comprueba que /salud responde, que las rutas inexistentes dan 404 con el
//  formato { ok:false, error }, que un JSON roto da 400, que Swagger está en
//  /docs y que la conversión de horas de Cusco ↔ UTC es correcta.
// ============================================================================

const request = require('supertest');
const app = require('../src/app');
const horario = require('../src/lib/horario');
const { limpiar } = require('../src/lib/respuesta');
const { manejarErrores } = require('../src/middleware/errores');

describe('Etapa 1 · base de la API', () => {
  test('GET /salud responde ok con el motor en memoria', async () => {
    const res = await request(app).get('/salud');
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ ok: true, data: { estado: 'ok', motor: 'memoria' } });
  });

  test('ruta inexistente → 404 con formato de error', async () => {
    const res = await request(app).get('/no-existe');
    expect(res.status).toBe(404);
    expect(res.body.ok).toBe(false);
    expect(res.body.error).toMatch(/No existe la ruta/);
  });

  test('JSON mal formado → 400', async () => {
    const res = await request(app).post('/salud').set('Content-Type', 'application/json').send('{"roto":');
    expect(res.status).toBe(400);
  });

  test('Swagger publica la especificación', async () => {
    const res = await request(app).get('/docs.json');
    expect(res.status).toBe(200);
    expect(res.body.openapi).toBe('3.0.3');
    expect(res.body.paths['/salud']).toBeDefined();
  });

  test('errores de Prisma se traducen a códigos HTTP', () => {
    const casos = [['P2002', 409], ['P2003', 409], ['P2025', 404], ['P2034', 409]];
    for (const [code, status] of casos) {
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
      manejarErrores(Object.assign(new Error('x'), { code }), {}, res, () => {});
      expect(res.status).toHaveBeenCalledWith(status);
    }
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    manejarErrores(new Error('desconocido'), {}, res, () => {});
    expect(res.status).toHaveBeenCalledWith(500);
  });
});

describe('lib/horario · Cusco es UTC-5', () => {
  test('aUtc suma 5 horas', () => {
    expect(horario.aUtc('2026-11-28', 20).toISOString()).toBe('2026-11-29T01:00:00.000Z');
  });
  test('local resta 5 horas y da el día de la semana', () => {
    expect(horario.local(new Date('2026-11-29T01:30:00Z'))).toEqual({ fecha: '2026-11-28', hora: 20, minuto: 30, diaSemana: 6 });
  });
  test('valida fechas reales del calendario', () => {
    expect(horario.esFechaValida('2026-02-28')).toBe(true);
    expect(horario.esFechaValida('2026-02-30')).toBe(false);
    expect(horario.esFechaValida('28/11/2026')).toBe(false);
  });
  test('sumarDias cruza meses', () => {
    expect(horario.sumarDias('2026-11-30', 1)).toBe('2026-12-01');
    expect(horario.diaSemana('2026-11-29')).toBe(0);
  });
});

describe('lib/respuesta · limpiar', () => {
  test('quita passwordHash y convierte Decimal a número', () => {
    const decimal = { toNumber: () => 35.5, toFixed: () => '35.50' };
    expect(limpiar({ id: 1, passwordHash: 'x', precio: decimal, lista: [{ passwordHash: 'y', a: 1 }] })).toEqual({ id: 1, precio: 35.5, lista: [{ a: 1 }] });
  });
});
