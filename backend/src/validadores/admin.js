// ============================================================================
//  src/validadores/admin.js — esquemas Zod del panel de administración
//  (CRUD de usuarios y filtros de los listados)
// ============================================================================

const { z } = require('zod');
const { email, password, telefono } = require('./auth');
const { paginacion, id } = require('./comunes');

const ROLES = ['JUGADOR', 'DUENO', 'ADMIN'];

const crearUsuario = z.object({
  nombre: z.string().trim().min(2, 'Mínimo 2 letras').max(80),
  email,
  password,
  telefono: telefono.optional(),
  rol: z.enum(ROLES, { message: 'Rol no válido' })
});

const actualizarUsuario = z
  .object({
    nombre: z.string().trim().min(2).max(80).optional(),
    email: email.optional(),
    telefono: telefono.nullable().optional(),
    rol: z.enum(ROLES).optional(),
    activo: z.boolean().optional(),
    password: password.optional()
  })
  .refine(d => Object.keys(d).length > 0, 'Envía al menos un campo');

const filtroUsuarios = z.object({ q: z.string().trim().max(60).optional(), rol: z.enum(ROLES).optional(), ...paginacion });

const filtroReservas = z.object({
  estado: z.enum(['PENDIENTE_PAGO', 'CONFIRMADA', 'CANCELADA', 'EXPIRADA', 'JUGADA']).optional(),
  canchaId: id.optional(),
  ...paginacion
});

module.exports = { crearUsuario, actualizarUsuario, filtroUsuarios, filtroReservas };
