// ============================================================================
//  src/servicios/auth.js — registro, login y tokens JWT
//
//  Flujo de login:
//   1. Busca al usuario por correo.
//   2. Compara la contraseña con el hash guardado (bcryptjs). Nunca se guarda
//      ni se devuelve la contraseña en texto.
//   3. Si coincide, firma un JWT con { sub: id, rol } que dura JWT_EXPIRA.
//   El mensaje de error es el mismo si falla el correo o la contraseña, para
//   no revelar qué correos están registrados.
//
//  verificarToken lo usa el middleware de auth en cada petición protegida:
//  además de validar la firma, relee el usuario de la base para respetar si
//  fue desactivado o cambió de rol después de recibir el token.
// ============================================================================

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db');
const config = require('../config');
const { ErrorNegocio, conflicto } = require('../lib/errores');

const RONDAS_BCRYPT = config.esPrueba ? 4 : 10; // en pruebas, más rápido

const hashear = password => bcrypt.hash(password, RONDAS_BCRYPT);

function firmarToken(usuario) {
  return jwt.sign({ sub: usuario.id, rol: usuario.rol }, config.jwtSecreto, { expiresIn: config.jwtExpira });
}

const sesion = usuario => ({ token: firmarToken(usuario), usuario });

async function registrar({ nombre, email, password, telefono, rol }) {
  const existe = await db.usuario.findUnique({ where: { email } });
  if (existe) throw new ErrorNegocio('Ese correo ya está registrado', 409, { email: 'Ya existe una cuenta con este correo' });
  const usuario = await db.usuario.create({
    data: { nombre, email, telefono: telefono ?? null, rol, passwordHash: await hashear(password) }
  });
  return sesion(usuario);
}

async function ingresar({ email, password }) {
  const usuario = await db.usuario.findUnique({ where: { email } });
  const valida = usuario ? await bcrypt.compare(password, usuario.passwordHash) : false;
  if (!valida) throw new ErrorNegocio('Correo o contraseña incorrectos', 401);
  if (!usuario.activo) throw new ErrorNegocio('Tu cuenta está desactivada. Escribe a la administración.', 403);
  return sesion(usuario);
}

async function verificarToken(token) {
  let datos;
  try {
    datos = jwt.verify(token, config.jwtSecreto);
  } catch {
    throw new ErrorNegocio('Tu sesión venció o no es válida. Vuelve a ingresar.', 401);
  }
  const usuario = await db.usuario.findUnique({ where: { id: Number(datos.sub) } });
  if (!usuario) throw new ErrorNegocio('La cuenta ya no existe', 401);
  if (!usuario.activo) throw new ErrorNegocio('Tu cuenta está desactivada', 403);
  return usuario;
}

async function actualizarPerfil(usuario, cambios) {
  const data = { nombre: cambios.nombre, telefono: cambios.telefono };
  if (cambios.password) data.passwordHash = await hashear(cambios.password);
  return db.usuario.update({ where: { id: usuario.id }, data });
}

// Por si alguien intenta usar un correo repetido desde el panel admin.
async function asegurarCorreoLibre(email, ignorarId = null) {
  const otro = await db.usuario.findUnique({ where: { email } });
  if (otro && otro.id !== ignorarId) throw conflicto('Ese correo ya está registrado');
}

module.exports = { registrar, ingresar, verificarToken, actualizarPerfil, firmarToken, hashear, asegurarCorreoLibre };
