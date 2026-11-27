// ============================================================================
//  prisma/datos-semilla.js — datos de ejemplo (usuarios, canchas, tarifas…)
//
//  ¿Por qué una función que recibe `db`?
//   La misma semilla sirve para:
//    • PostgreSQL / Supabase: `npm run semilla` (prisma/semilla.js le pasa el
//      PrismaClient real).
//    • Modo demo en memoria: server.js la carga al arrancar sin DATABASE_URL.
//   Solo usa create() sencillos, que ambos clientes entienden igual.
//
//  ⚠ Las canchas son FICTICIAS (nombres inventados, ubicaciones aproximadas en
//  Cusco). Reemplázalas por las reales de tu círculo cuando las tengas.
//
//  Contraseña de los usuarios de prueba: variable SEMILLA_PASSWORD de .env o,
//  si falta, la de desarrollo indicada en el README. Son cuentas de prueba, no
//  personas reales.
// ============================================================================

const bcrypt = require('bcryptjs');
const { aUtc, hoyLocal, sumarDias, diaSemana } = require('../src/lib/horario');

const PASSWORD_DEMO = process.env.SEMILLA_PASSWORD || 'canchitas123';

const USUARIOS = [
  { clave: 'admin', nombre: 'Administración Canchitas', email: 'admin@canchitas.test', rol: 'ADMIN', telefono: null },
  { clave: 'dueno1', nombre: 'Rosa Quispe (ficticia)', email: 'dueno1@canchitas.test', rol: 'DUENO', telefono: '51984000001' },
  { clave: 'dueno2', nombre: 'Julio Huamán (ficticio)', email: 'dueno2@canchitas.test', rol: 'DUENO', telefono: '51984000002' },
  { clave: 'jugador1', nombre: 'Carlos Mamani (ficticio)', email: 'jugador1@canchitas.test', rol: 'JUGADOR', telefono: '51984000011' },
  { clave: 'jugador2', nombre: 'Lucía Condori (ficticia)', email: 'jugador2@canchitas.test', rol: 'JUGADOR', telefono: '51984000012' }
];

// Tarifas tipo: día de semana (lun–vie) más barato de día, más caro de noche;
// fin de semana precio único. `base` es el precio diurno de lunes a viernes.
function tarifasTipo(base, { abre = 8, cierra = 23, nocheDesde = 18 } = {}) {
  const lista = [];
  for (let dia = 1; dia <= 5; dia++) {
    lista.push({ diaSemana: dia, horaInicio: abre, horaFin: nocheDesde, precioHora: base });
    lista.push({ diaSemana: dia, horaInicio: nocheDesde, horaFin: cierra, precioHora: base + 20 });
  }
  for (const dia of [0, 6]) lista.push({ diaSemana: dia, horaInicio: 7, horaFin: cierra, precioHora: base + 30 });
  return lista;
}

const CANCHAS = [
  { dueno: 'dueno1', nombre: 'La Bombonera de Wanchaq (ficticia)', zona: 'Wanchaq', direccion: 'Av. Garcilaso (referencial)', lat: -13.5262, lng: -71.9662, tipo: 'SINTETICO', formato: 7, techada: false, conLuz: true, base: 50, descripcion: 'Grass sintético, vestuarios y estacionamiento.' },
  { dueno: 'dueno1', nombre: 'Techito Marcavalle (ficticia)', zona: 'Marcavalle', direccion: 'Av. Los Incas (referencial)', lat: -13.5312, lng: -71.9529, tipo: 'SINTETICO', formato: 5, techada: true, conLuz: true, base: 40, descripcion: 'Techada: se juega aunque llueva.' },
  { dueno: 'dueno1', nombre: 'Losa Ttio (ficticia)', zona: 'Ttio', direccion: 'Calle principal de Ttio (referencial)', lat: -13.5338, lng: -71.9605, tipo: 'LOSA', formato: 5, techada: false, conLuz: false, base: 25, descripcion: 'Losa de cemento, ideal para pichangas de la mañana.', abre: 7, cierra: 18 },
  { dueno: 'dueno2', nombre: 'Estadio Chico San Sebastián (ficticia)', zona: 'San Sebastián', direccion: 'Av. de la Cultura (referencial)', lat: -13.5297, lng: -71.9361, tipo: 'GRASS', formato: 11, techada: false, conLuz: true, base: 120, descripcion: 'Grass natural, medidas reglamentarias.' },
  { dueno: 'dueno2', nombre: 'La Cancha de Larapa (ficticia)', zona: 'Larapa', direccion: 'Urb. Larapa (referencial)', lat: -13.5391, lng: -71.9152, tipo: 'SINTETICO', formato: 7, techada: false, conLuz: true, base: 45, descripcion: 'Amplia, con tribuna pequeña.' },
  { dueno: 'dueno2', nombre: 'Fulbito Santiago Techado (ficticia)', zona: 'Santiago', direccion: 'Av. Antonio Lorena (referencial)', lat: -13.5318, lng: -71.9853, tipo: 'SINTETICO', formato: 5, techada: true, conLuz: true, base: 40, descripcion: 'Techada y con cafetín.' },
  { dueno: 'dueno2', nombre: 'Cancha San Jerónimo (borrador, ficticia)', zona: 'San Jerónimo', direccion: 'Av. Manco Cápac (referencial)', lat: -13.5452, lng: -71.8873, tipo: 'LOSA', formato: 5, techada: false, conLuz: true, base: 30, descripcion: 'Aún no publicada: solo la ve su dueño.', publicada: false }
];

async function cargarSemilla(db, { ahora = new Date() } = {}) {
  const hash = await bcrypt.hash(PASSWORD_DEMO, 10);
  const usuarios = {};
  for (const u of USUARIOS) {
    usuarios[u.clave] = await db.usuario.create({
      data: { nombre: u.nombre, email: u.email, rol: u.rol, telefono: u.telefono, passwordHash: hash }
    });
  }

  const canchas = [];
  for (const c of CANCHAS) {
    const dueno = usuarios[c.dueno];
    const cancha = await db.cancha.create({
      data: {
        duenoId: dueno.id,
        nombre: c.nombre,
        descripcion: c.descripcion,
        tipo: c.tipo,
        formato: c.formato,
        techada: c.techada,
        conLuz: c.conLuz,
        lat: c.lat,
        lng: c.lng,
        direccion: c.direccion,
        zona: c.zona,
        telefono: dueno.telefono,
        fotos: [],
        publicada: c.publicada !== false
      }
    });
    for (const t of tarifasTipo(c.base, { abre: c.abre, cierra: c.cierra })) {
      await db.tarifa.create({ data: { canchaId: cancha.id, ...t } });
    }
    canchas.push(cancha);
  }

  // Una reserva ya jugada (con reseña) y una confirmada para mañana, para que
  // el panel del dueño y "Mis reservas" no aparezcan vacíos al probar.
  const hoy = hoyLocal(ahora);
  const ayer = sumarDias(hoy, -1);
  const manana = sumarDias(hoy, 1);
  const precioNoche = (diaSemana(ayer) % 6 === 0 ? 80 : 70);
  const jugada = await db.reserva.create({
    data: { canchaId: canchas[0].id, jugadorId: usuarios.jugador1.id, inicio: aUtc(ayer, 19), fin: aUtc(ayer, 20), total: precioNoche, adelanto: Math.ceil(precioNoche * 0.3), estado: 'JUGADA' }
  });
  await db.resena.create({ data: { reservaId: jugada.id, estrellas: 5, texto: 'Buen grass y buena luz. (reseña de ejemplo)' } });

  const precioManana = diaSemana(manana) % 6 === 0 ? 80 : 70;
  await db.reserva.create({
    data: { canchaId: canchas[0].id, jugadorId: usuarios.jugador2.id, inicio: aUtc(manana, 20), fin: aUtc(manana, 21), total: precioManana, adelanto: Math.ceil(precioManana * 0.3), estado: 'CONFIRMADA' }
  });

  // Un bloqueo de mantenimiento pasado mañana por la mañana.
  const pasado = sumarDias(hoy, 2);
  await db.bloqueo.create({ data: { canchaId: canchas[1].id, inicio: aUtc(pasado, 8), fin: aUtc(pasado, 11), motivo: 'MANTENIMIENTO', nota: 'Cambio de redes (ejemplo)' } });

  return { usuarios, canchas };
}

module.exports = { cargarSemilla, USUARIOS, PASSWORD_DEMO };
