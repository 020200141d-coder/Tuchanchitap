// Documentación OpenAPI de /api/auth (ver src/docs/index.js).
const json = schema => ({ content: { 'application/json': { schema } } });
const ref = n => ({ $ref: `#/components/schemas/${n}` });
const exito = schema => json({ type: 'object', properties: { ok: { type: 'boolean', example: true }, data: schema } });
const error = d => ({ description: d, ...json(ref('Error')) });

export default {
  '/api/auth/registro': {
    post: {
      tags: ['Auth'],
      summary: 'Crea una cuenta de JUGADOR o DUENO',
      requestBody: json({
        type: 'object',
        required: ['nombre', 'email', 'password'],
        properties: {
          nombre: { type: 'string', example: 'Carlos Mamani' },
          email: { type: 'string', example: 'carlos@correo.com' },
          password: { type: 'string', example: 'una-clave-segura' },
          telefono: { type: 'string', example: '984123456' },
          rol: { type: 'string', enum: ['JUGADOR', 'DUENO'], default: 'JUGADOR' }
        }
      }),
      responses: { 201: { description: 'Cuenta creada con su token', ...exito(ref('Sesion')) }, 409: error('Correo ya registrado'), 422: error('Datos inválidos') }
    }
  },
  '/api/auth/login': {
    post: {
      tags: ['Auth'],
      summary: 'Inicia sesión y devuelve el JWT',
      requestBody: json({ type: 'object', required: ['email', 'password'], properties: { email: { type: 'string', example: 'jugador1@canchitas.test' }, password: { type: 'string' } } }),
      responses: { 200: { description: 'Sesión iniciada', ...exito(ref('Sesion')) }, 401: error('Correo o contraseña incorrectos'), 403: error('Cuenta desactivada'), 422: error('Datos inválidos') }
    }
  },
  '/api/auth/yo': {
    get: {
      tags: ['Auth'],
      summary: 'Datos del usuario del token',
      security: [{ bearer: [] }],
      responses: { 200: { description: 'Usuario', ...exito(ref('Usuario')) }, 401: error('Sin token o token vencido') }
    },
    patch: {
      tags: ['Auth'],
      summary: 'Actualiza nombre, teléfono o contraseña',
      security: [{ bearer: [] }],
      requestBody: json({ type: 'object', properties: { nombre: { type: 'string' }, telefono: { type: 'string', nullable: true }, password: { type: 'string' } } }),
      responses: { 200: { description: 'Perfil actualizado', ...exito(ref('Usuario')) }, 401: error('Sin sesión'), 422: error('Datos inválidos') }
    }
  }
};
