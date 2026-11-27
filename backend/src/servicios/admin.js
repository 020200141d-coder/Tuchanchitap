// ============================================================================
//  src/servicios/admin.js — panel de administración (solo rol ADMIN)
//
//  Qué administra:
//   • Resumen: números de la plataforma para la portada del panel.
//   • Usuarios: CRUD completo (crear dueños, cambiar rol, desactivar).
//   • Reservas: listado global con filtros.
//   • Reseñas: moderación (borrar una ofensiva).
//   Las canchas, tarifas, bloqueos y pagos usan las mismas rutas del dueño:
//   asegurarDueno() deja pasar al ADMIN, así no se duplica lógica.
//
//  Reglas de seguridad:
//   • El admin no puede quitarse su propio rol ni desactivarse (se quedaría
//     sin acceso y la plataforma sin administrador) → 409.
//   • No se borra un usuario con canchas o reservas: se desactiva (409).
// ============================================================================

const db = require('../db');
const { noEncontrado, conflicto } = require('../lib/errores');
const { hashear, asegurarCorreoLibre } = require('./auth');

const paginar = (pagina, porPagina) => ({ skip: (pagina - 1) * porPagina, take: porPagina });
const pagina_ = (items, total, pagina, porPagina) => ({ items, total, pagina, porPagina, paginas: Math.max(1, Math.ceil(total / porPagina)) });

async function resumen() {
  const contar = (modelo, where) => db[modelo].count({ where });
  const [jugadores, duenos, admins, canchas, publicadas, pendientesPago, confirmadas, jugadas, canceladas, pagosPorRevisar] = await Promise.all([
    contar('usuario', { rol: 'JUGADOR' }),
    contar('usuario', { rol: 'DUENO' }),
    contar('usuario', { rol: 'ADMIN' }),
    contar('cancha', {}),
    contar('cancha', { publicada: true }),
    contar('reserva', { estado: 'PENDIENTE_PAGO' }),
    contar('reserva', { estado: 'CONFIRMADA' }),
    contar('reserva', { estado: 'JUGADA' }),
    contar('reserva', { estado: 'CANCELADA' }),
    contar('pago', { estado: 'PENDIENTE' })
  ]);
  const vendidas = await db.reserva.findMany({ where: { estado: { in: ['CONFIRMADA', 'JUGADA'] } } });
  const montoReservado = vendidas.reduce((s, r) => s + Number(r.total), 0);
  return {
    usuarios: { jugadores, duenos, admins, total: jugadores + duenos + admins },
    canchas: { total: canchas, publicadas },
    reservas: { pendientesPago, confirmadas, jugadas, canceladas },
    pagosPorRevisar,
    montoReservado
  };
}

async function listarUsuarios({ q, rol, pagina, porPagina }) {
  const where = { rol };
  if (q) where.OR = [{ nombre: { contains: q, mode: 'insensitive' } }, { email: { contains: q, mode: 'insensitive' } }];
  const [items, total] = await Promise.all([db.usuario.findMany({ where, orderBy: { creadoEn: 'desc' }, ...paginar(pagina, porPagina) }), db.usuario.count({ where })]);
  return pagina_(items, total, pagina, porPagina);
}

async function crearUsuario({ password, ...datos }) {
  await asegurarCorreoLibre(datos.email);
  return db.usuario.create({ data: { ...datos, telefono: datos.telefono ?? null, passwordHash: await hashear(password) } });
}

async function actualizarUsuario(admin, id, { password, ...cambios }) {
  const usuario = await db.usuario.findUnique({ where: { id } });
  if (!usuario) throw noEncontrado('El usuario');
  if (id === admin.id && ((cambios.rol && cambios.rol !== 'ADMIN') || cambios.activo === false)) {
    throw conflicto('No puedes quitarte el rol de administrador ni desactivar tu propia cuenta');
  }
  if (cambios.email) await asegurarCorreoLibre(cambios.email, id);
  if (usuario.rol === 'DUENO' && cambios.rol && cambios.rol !== 'DUENO') {
    const canchas = await db.cancha.count({ where: { duenoId: id } });
    if (canchas > 0) throw conflicto(`Tiene ${canchas} cancha(s). Reasígnalas a otro dueño antes de cambiarle el rol.`);
  }
  const data = { ...cambios };
  if (password) data.passwordHash = await hashear(password);
  return db.usuario.update({ where: { id }, data });
}

async function eliminarUsuario(admin, id) {
  if (id === admin.id) throw conflicto('No puedes borrar tu propia cuenta');
  const usuario = await db.usuario.findUnique({ where: { id } });
  if (!usuario) throw noEncontrado('El usuario');
  const [canchas, reservas] = await Promise.all([db.cancha.count({ where: { duenoId: id } }), db.reserva.count({ where: { jugadorId: id } })]);
  if (canchas + reservas > 0) throw conflicto('Tiene canchas o reservas registradas: desactívalo en lugar de borrarlo');
  await db.usuario.delete({ where: { id } });
}

async function listarReservas({ estado, canchaId, pagina, porPagina }) {
  const where = { estado, canchaId };
  const [reservas, total] = await Promise.all([
    db.reserva.findMany({ where, include: { cancha: true, jugador: true }, orderBy: { inicio: 'desc' }, ...paginar(pagina, porPagina) }),
    db.reserva.count({ where })
  ]);
  const items = reservas.map(r => ({ ...r, cancha: { id: r.cancha.id, nombre: r.cancha.nombre }, jugador: { id: r.jugador.id, nombre: r.jugador.nombre, email: r.jugador.email, telefono: r.jugador.telefono } }));
  return pagina_(items, total, pagina, porPagina);
}

async function listarResenas() {
  const resenas = await db.resena.findMany({ include: { reserva: { include: { cancha: true, jugador: true } } }, orderBy: { creadoEn: 'desc' } });
  return resenas.map(r => ({ id: r.id, estrellas: r.estrellas, texto: r.texto, creadoEn: r.creadoEn, cancha: r.reserva.cancha.nombre, jugador: r.reserva.jugador.nombre }));
}

async function eliminarResena(id) {
  const resena = await db.resena.findUnique({ where: { id } });
  if (!resena) throw noEncontrado('La reseña');
  await db.resena.delete({ where: { id } });
}

module.exports = { resumen, listarUsuarios, crearUsuario, actualizarUsuario, eliminarUsuario, listarReservas, listarResenas, eliminarResena };
