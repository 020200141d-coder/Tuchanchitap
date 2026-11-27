// Documentación OpenAPI del panel de administración (ver src/docs/index.js).
const json = schema => ({ content: { 'application/json': { schema } } });
const ref = n => ({ $ref: `#/components/schemas/${n}` });
const exito = schema => json({ type: 'object', properties: { ok: { type: 'boolean', example: true }, data: schema } });
const error = d => ({ description: d, ...json(ref('Error')) });
const seguro = [{ bearer: [] }];
const idPath = { name: 'id', in: 'path', required: true, schema: { type: 'integer' } };
const q = (name, schema) => ({ name, in: 'query', schema });
const comunes = { 401: error('Sin sesión'), 403: error('No eres ADMIN') };
const cuerpoUsuario = { type: 'object', properties: { nombre: { type: 'string' }, email: { type: 'string' }, password: { type: 'string' }, telefono: { type: 'string' }, rol: { type: 'string', enum: ['JUGADOR', 'DUENO', 'ADMIN'] }, activo: { type: 'boolean' } } };

module.exports = {
  '/api/admin/resumen': { get: { tags: ['Admin'], summary: 'Números de la plataforma', security: seguro, responses: { 200: { description: 'Resumen', ...exito({ type: 'object' }) }, ...comunes } } },
  '/api/admin/usuarios': {
    get: { tags: ['Admin'], summary: 'Lista paginada de usuarios', security: seguro, parameters: [q('q', { type: 'string' }), q('rol', { type: 'string', enum: ['JUGADOR', 'DUENO', 'ADMIN'] }), q('pagina', { type: 'integer' }), q('porPagina', { type: 'integer' })], responses: { 200: { description: 'Página', ...exito({ type: 'object', properties: { items: { type: 'array', items: ref('Usuario') }, total: { type: 'integer' } } }) }, ...comunes } },
    post: { tags: ['Admin'], summary: 'Crea un usuario con cualquier rol', security: seguro, requestBody: json({ ...cuerpoUsuario, required: ['nombre', 'email', 'password', 'rol'] }), responses: { 201: { description: 'Creado', ...exito(ref('Usuario')) }, 409: error('Correo repetido'), 422: error('Datos inválidos'), ...comunes } }
  },
  '/api/admin/usuarios/{id}': {
    patch: { tags: ['Admin'], summary: 'Edita, cambia rol o desactiva', security: seguro, parameters: [idPath], requestBody: json(cuerpoUsuario), responses: { 200: { description: 'Actualizado', ...exito(ref('Usuario')) }, 404: error('No existe'), 409: error('Te quitarías el acceso o tiene canchas'), ...comunes } },
    delete: { tags: ['Admin'], summary: 'Borra un usuario sin historial', security: seguro, parameters: [idPath], responses: { 204: { description: 'Borrado' }, 409: error('Tiene canchas o reservas: desactívalo'), ...comunes } }
  },
  '/api/admin/reservas': {
    get: { tags: ['Admin'], summary: 'Todas las reservas', security: seguro, parameters: [q('estado', { type: 'string' }), q('canchaId', { type: 'integer' }), q('pagina', { type: 'integer' }), q('porPagina', { type: 'integer' })], responses: { 200: { description: 'Página de reservas' }, ...comunes } }
  },
  '/api/admin/resenas': { get: { tags: ['Admin'], summary: 'Todas las reseñas (moderación)', security: seguro, responses: { 200: { description: 'Lista' }, ...comunes } } },
  '/api/admin/resenas/{id}': { delete: { tags: ['Admin'], summary: 'Borra una reseña', security: seguro, parameters: [idPath], responses: { 204: { description: 'Borrada' }, 404: error('No existe'), ...comunes } } }
};
