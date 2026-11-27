// ============================================================================
//  src/servicios/anuncios.js — anuncios discretos de negocios del barrio
//
//  Modelo de ingresos con costo cero: el administrador vende el espacio a
//  negocios cercanos a las canchas (cobro mensual directo, sin AdSense) y el
//  panel le muestra cuántas veces se vio y se tocó cada anuncio para cobrar.
//
//  Reglas para NO saturar (las aplica el frontend con lo que devuelve esto):
//   • Se piden como máximo 2 anuncios por pantalla (validador: cantidad ≤ 2).
//   • Solo vigentes: activo y con la fecha de hoy entre desde y hasta.
//   • Prioridad a los de la misma zona de la cancha; luego los de toda la
//     ciudad (zona null).
//   • Rotación justa: primero el que menos impresiones tiene.
//   El frontend pone como máximo 1 cada 6 canchas, 1 en la ficha, y ninguno
//   al reservar o pagar.
// ============================================================================

const db = require('../db');
const { noEncontrado } = require('../lib/errores');
const { aUtc } = require('../lib/horario');

// Lo que ve el público (sin estadísticas internas).
const publico = a => ({ id: a.id, anunciante: a.anunciante, titulo: a.titulo, texto: a.texto, enlace: a.enlace, imagenUrl: a.imagenUrl, zona: a.zona });

const vigentes = ahora => ({ activo: true, desde: { lte: ahora }, hasta: { gte: ahora } });

async function paraMostrar({ zona, cantidad = 1 } = {}, ahora = new Date()) {
  const candidatos = await db.anuncio.findMany({ where: vigentes(ahora), orderBy: [{ impresiones: 'asc' }, { id: 'asc' }] });
  const mismaZona = a => zona && a.zona && a.zona.toLowerCase() === zona.toLowerCase();
  const elegidos = [...candidatos.filter(mismaZona), ...candidatos.filter(a => !a.zona)].slice(0, cantidad);
  if (elegidos.length > 0) {
    await db.anuncio.updateMany({ where: { id: { in: elegidos.map(a => a.id) } }, data: { impresiones: { increment: 1 } } });
  }
  return elegidos.map(publico);
}

// Cuenta el clic y devuelve el enlace al que debe ir el navegador.
async function registrarClic(id, ahora = new Date()) {
  const anuncio = await db.anuncio.findFirst({ where: { id, ...vigentes(ahora) } });
  if (!anuncio) throw noEncontrado('El anuncio');
  await db.anuncio.update({ where: { id }, data: { clics: { increment: 1 } } });
  return { enlace: anuncio.enlace };
}

// --- Panel de administración ---

const conTasa = a => ({ ...a, tasaClics: a.impresiones ? Math.round((a.clics / a.impresiones) * 1000) / 10 : 0 });

function fechas(datos) {
  const salida = { ...datos };
  if (datos.desde) salida.desde = aUtc(datos.desde, 0);
  if (datos.hasta) salida.hasta = aUtc(datos.hasta, 24);
  return salida;
}

async function listar() {
  const anuncios = await db.anuncio.findMany({ orderBy: { creadoEn: 'desc' } });
  return anuncios.map(conTasa);
}

const crear = async datos => conTasa(await db.anuncio.create({ data: fechas(datos) }));

async function actualizar(id, datos) {
  const anuncio = await db.anuncio.findUnique({ where: { id } });
  if (!anuncio) throw noEncontrado('El anuncio');
  return conTasa(await db.anuncio.update({ where: { id }, data: fechas(datos) }));
}

async function eliminar(id) {
  const anuncio = await db.anuncio.findUnique({ where: { id } });
  if (!anuncio) throw noEncontrado('El anuncio');
  await db.anuncio.delete({ where: { id } });
}

module.exports = { paraMostrar, registrarClic, listar, crear, actualizar, eliminar };
