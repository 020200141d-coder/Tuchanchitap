// ============================================================================
//  src/modules/auth/auth.schema.js — esquemas Zod de registro y login
//
//  Validadores "puros": solo describen la forma de los datos. No tocan la base
//  ni lanzan ErrorNegocio. Si algo no cumple, Zod lanza ZodError y el
//  manejador central responde 422 con el mensaje de cada campo.
// ============================================================================

import { z } from 'zod';

const email = z.string({ required_error: 'El correo es obligatorio' }).trim().toLowerCase().email('Correo no válido');
const password = z.string({ required_error: 'La contraseña es obligatoria' }).min(8, 'Mínimo 8 caracteres').max(72, 'Máximo 72 caracteres');
// Celular peruano con o sin 51 delante (9 dígitos que empiezan en 9).
const telefono = z
  .string()
  .trim()
  .regex(/^(51)?9\d{8}$/, 'Celular de 9 dígitos (puede empezar con 51)')
  .transform(t => (t.startsWith('51') ? t : `51${t}`));

const registro = z.object({
  nombre: z.string({ required_error: 'El nombre es obligatorio' }).trim().min(2, 'Mínimo 2 letras').max(80),
  email,
  password,
  telefono: telefono.optional(),
  // Al registrarse solo se puede elegir JUGADOR o DUENO; ADMIN lo da el panel.
  rol: z.enum(['JUGADOR', 'DUENO'], { message: 'Rol no válido' }).default('JUGADOR')
});

const login = z.object({
  email,
  password: z.string({ required_error: 'La contraseña es obligatoria' }).min(1, 'La contraseña es obligatoria')
});

const actualizarPerfil = z
  .object({
    nombre: z.string().trim().min(2).max(80).optional(),
    telefono: telefono.nullable().optional(),
    password: password.optional()
  })
  .refine(d => Object.keys(d).length > 0, 'Envía al menos un campo');

export { registro, login, actualizarPerfil, email, password, telefono };
export default { registro, login, actualizarPerfil, email, password, telefono };
