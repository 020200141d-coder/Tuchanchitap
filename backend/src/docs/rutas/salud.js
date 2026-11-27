// Documentación OpenAPI de /salud (ver src/docs/index.js).
export default {
  '/salud': {
    get: {
      tags: ['Salud'],
      summary: 'Comprueba que la API y la base de datos respondan',
      responses: {
        200: { description: 'Todo bien', content: { 'application/json': { example: { ok: true, data: { estado: 'ok', motor: 'postgresql', baseDatos: 'ok', hora: '2026-11-27T15:00:00.000Z' } } } } },
        503: { description: 'La base de datos no responde' }
      }
    }
  }
};
