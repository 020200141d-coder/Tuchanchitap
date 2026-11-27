// ============================================================================
//  src/servicios/canchas.js — reglas de las canchas
//
//  Regla 4: solo el dueño de la cancha (o un ADMIN) puede editarla, subirle
//  fotos, borrar, ver sus reservas y aprobar sus pagos. asegurarDueno() es la
//  única puerta: la usan este servicio y los de tarifas, bloqueos, reservas y
//  pagos. Responde 404 si la cancha no existe y 403 si no es tuya.
//
//  Listado público (GET /api/canchas):
//   1. La base filtra lo sencillo: publicada, tipo, formato, techada, luz, texto.
//   2. En JS se calcula lo derivado: precio desde (tarifa más barata),
//      distancia al jugador (Haversine) y promedio de estrellas.
//   3. Se filtra por precio máximo y radio, se ordena (por cercanía si hay
//      ubicación) y se pagina.
//   Para el círculo local (decenas de canchas) esto es rápido; si algún día
//   fueran miles, se movería a SQL con PostGIS.
// ============================================================================

const db = require('../db');
const { ErrorNegocio, noEncontrado, prohibido, conflicto, invalido } = require('../lib/errores');
const { guardarImagen } = require('../lib/almacen');
const { distanciaKm } = require('../lib/geo');
const { hoyLocal } = require('../lib/horario');

const MAX_FOTOS = 6;

const esAdmin = usuario => usuario?.rol === 'ADMIN';

async function asegurarDueno(usuario, canchaId) {
  const cancha = await db.cancha.findUnique({ where: { id: canchaId } });
  if (!cancha) throw noEncontrado('La cancha');
  if (!esAdmin(usuario) && cancha.duenoId !== usuario?.id) throw prohibido('Solo el dueño de esta cancha puede hacer esto');
  return cancha;
}

// Promedio de estrellas por cancha, en una sola consulta.
async function estrellasPorCancha(ids) {
  if (ids.length === 0) return {};
  const resenas = await db.resena.findMany({ where: { reserva: { canchaId: { in: ids } } }, include: { reserva: true } });
  const acumulado = {};
  for (const r of resenas) {
    const a = (acumulado[r.reserva.canchaId] ||= { suma: 0, total: 0 });
    a.suma += r.estrellas;
    a.total += 1;
  }
  const salida = {};
  for (const [canchaId, a] of Object.entries(acumulado)) {
    salida[canchaId] = { promedioEstrellas: Math.round((a.suma / a.total) * 10) / 10, totalResenas: a.total };
  }
  return salida;
}

const precios = tarifas => tarifas.map(t => Number(t.precioHora));

// Forma pública de una cancha: sin datos privados del dueño (correo, etc.).
function aPublica(cancha, extra = {}) {
  const { tarifas = [], dueno, ...resto } = cancha;
  const lista = precios(tarifas);
  return {
    ...resto,
    dueno: dueno ? { id: dueno.id, nombre: dueno.nombre } : undefined,
    precioDesde: lista.length ? Math.min(...lista) : null,
    precioHasta: lista.length ? Math.max(...lista) : null,
    promedioEstrellas: null,
    totalResenas: 0,
    ...extra
  };
}

async function listarPublicas(filtros) {
  const { q, tipo, formato, techada, conLuz, precioMax, lat, lng, radioKm, pagina, porPagina } = filtros;
  const where = { publicada: true, tipo, formato, techada, conLuz };
  if (q) where.OR = [{ nombre: { contains: q, mode: 'insensitive' } }, { zona: { contains: q, mode: 'insensitive' } }, { direccion: { contains: q, mode: 'insensitive' } }];

  const canchas = await db.cancha.findMany({ where, include: { tarifas: true }, orderBy: { nombre: 'asc' } });
  const estrellas = await estrellasPorCancha(canchas.map(c => c.id));
  const hayUbicacion = lat !== undefined && lng !== undefined;

  let lista = canchas.map(c =>
    aPublica(c, {
      ...estrellas[c.id],
      distanciaKm: hayUbicacion ? Math.round(distanciaKm({ lat, lng }, c) * 100) / 100 : null
    })
  );

  if (precioMax !== undefined) lista = lista.filter(c => c.precioDesde !== null && c.precioDesde <= precioMax);
  if (hayUbicacion && radioKm !== undefined) lista = lista.filter(c => c.distanciaKm <= radioKm);
  if (hayUbicacion) lista.sort((a, b) => a.distanciaKm - b.distanciaKm);

  const total = lista.length;
  const inicio = (pagina - 1) * porPagina;
  const items = lista.slice(inicio, inicio + porPagina);

  // Las próximas horas libres de HOY (máx. 4) en cada tarjeta, para reservar
  // en dos toques sin entrar a la ficha. Solo para la página actual.
  const { horasDelDia } = require('./disponibilidad');
  const hoy = hoyLocal();
  for (const c of items) {
    const dia = await horasDelDia(c.id, hoy);
    c.horasLibresHoy = dia.horas.filter(h => h.estado === 'libre').slice(0, 4).map(h => ({ hora: h.hora, etiqueta: h.etiqueta.slice(0, 5), precio: h.precio }));
  }

  return {
    items,
    total,
    pagina,
    porPagina,
    paginas: Math.max(1, Math.ceil(total / porPagina))
  };
}

// Ficha de una cancha. Las no publicadas solo las ve su dueño o un ADMIN.
async function obtener(id, usuario = null) {
  const cancha = await db.cancha.findUnique({
    where: { id },
    include: { tarifas: { orderBy: [{ diaSemana: 'asc' }, { horaInicio: 'asc' }] }, dueno: true }
  });
  if (!cancha) throw noEncontrado('La cancha');
  const puedeVerBorrador = esAdmin(usuario) || cancha.duenoId === usuario?.id;
  if (!cancha.publicada && !puedeVerBorrador) throw noEncontrado('La cancha');
  const estrellas = await estrellasPorCancha([cancha.id]);
  return { ...aPublica(cancha, estrellas[cancha.id]), tarifas: cancha.tarifas };
}

// Panel: el dueño ve las suyas (publicadas o no); el ADMIN ve todas.
async function listarMias(usuario) {
  const where = esAdmin(usuario) ? {} : { duenoId: usuario.id };
  const canchas = await db.cancha.findMany({ where, include: { tarifas: true, dueno: true }, orderBy: { creadoEn: 'desc' } });
  const estrellas = await estrellasPorCancha(canchas.map(c => c.id));
  return canchas.map(c => aPublica(c, estrellas[c.id]));
}

// El ADMIN crea canchas a nombre de un dueño (duenoId); el DUENO, a su nombre.
async function resolverDueno(usuario, duenoId) {
  if (!esAdmin(usuario)) return usuario;
  if (!duenoId) throw invalido('Indica el dueño de la cancha', { duenoId: 'Obligatorio para el administrador' });
  const dueno = await db.usuario.findUnique({ where: { id: duenoId } });
  if (!dueno || dueno.rol !== 'DUENO') throw invalido('El dueño indicado no existe o no tiene rol DUENO', { duenoId: 'No es un dueño' });
  return dueno;
}

async function crear(usuario, datos) {
  const { duenoId, ...campos } = datos;
  const dueno = await resolverDueno(usuario, duenoId);
  return db.cancha.create({
    data: { ...campos, duenoId: dueno.id, telefono: campos.telefono ?? dueno.telefono ?? null, fotos: [] }
  });
}

async function actualizar(usuario, id, datos) {
  await asegurarDueno(usuario, id);
  const { duenoId, ...campos } = datos;
  if (duenoId !== undefined) {
    if (!esAdmin(usuario)) throw prohibido('Solo la administración puede cambiar el dueño');
    campos.duenoId = (await resolverDueno(usuario, duenoId)).id;
  }
  return db.cancha.update({ where: { id }, data: campos });
}

// No se borra una cancha con historial de reservas: se despublica. Así no se
// pierden pagos ni reseñas (y la base lo impide igual con onDelete: Restrict).
async function eliminar(usuario, id) {
  await asegurarDueno(usuario, id);
  const reservas = await db.reserva.count({ where: { canchaId: id } });
  if (reservas > 0) throw conflicto('La cancha tiene reservas registradas. Despublícala en lugar de borrarla.');
  await db.cancha.delete({ where: { id } });
}

async function agregarImagen(usuario, id, archivo, tipo) {
  const cancha = await asegurarDueno(usuario, id);
  if (!archivo) throw new ErrorNegocio('Adjunta una imagen en el campo "imagen"', 400);
  if (tipo === 'foto' && cancha.fotos.length >= MAX_FOTOS) throw conflicto(`Máximo ${MAX_FOTOS} fotos por cancha`);
  const url = await guardarImagen(archivo, tipo === 'qr' ? 'qr' : 'canchas');
  const data = tipo === 'qr' ? { qrPagoUrl: url } : { fotos: [...cancha.fotos, url] };
  return db.cancha.update({ where: { id }, data });
}

async function quitarFoto(usuario, id, url) {
  const cancha = await asegurarDueno(usuario, id);
  if (!cancha.fotos.includes(url)) throw noEncontrado('La foto');
  return db.cancha.update({ where: { id }, data: { fotos: cancha.fotos.filter(f => f !== url) } });
}

module.exports = { asegurarDueno, listarPublicas, obtener, listarMias, crear, actualizar, eliminar, agregarImagen, quitarFoto, esAdmin };
