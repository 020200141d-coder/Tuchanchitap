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
//  Las canchas son reales (datos públicos, ver CANCHAS); usuarios, reservas
//  y anuncios son FICTICIOS.
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

// Canchitas REALES de Cusco, armadas con datos públicos de directorios y
// redes sociales (nov. 2026): nombre, dirección, zona y WhatsApp donde se
// encontró. Lo que NO está publicado (coordenadas exactas, precios, formato,
// horario) es APROXIMADO y está marcado "por confirmar": corrígelo cuando
// hables con cada dueño. Las cuentas de dueño de la semilla son de prueba;
// el dueño real todavía no administra estas fichas.
const NOTA = ' Datos públicos; precio, horario y ubicación exacta por confirmar con el dueño.';
const CANCHAS = [
  { dueno: 'dueno1', nombre: 'La Cancha de Cusco', zona: 'Wanchaq', direccion: 'Av. Las Américas E-24, Parque Industrial', lat: -13.5251, lng: -71.9585, tipo: 'SINTETICO', formato: 7, techada: false, conLuz: true, base: 50, telefono: null, descripcion: 'Complejo de fulbito con canchas sintéticas, servicios higiénicos, duchas y cafetería.' + NOTA },
  { dueno: 'dueno1', nombre: 'El Monumental de San Antonio', zona: 'San Sebastián', direccion: 'Urb. San Antonio E-12, Vía de Evitamiento', lat: -13.5362, lng: -71.9288, tipo: 'SINTETICO', formato: 7, techada: true, conLuz: true, base: 50, telefono: '51958192165', descripcion: 'Cancha sintética techada: se juega aunque llueva.' + NOTA },
  { dueno: 'dueno1', nombre: 'Cancha Sintética Agua Buena', zona: 'San Sebastián', direccion: 'Urb. Agua Buena, cerca de la Vía de Evitamiento', lat: -13.5395, lng: -71.9238, tipo: 'SINTETICO', formato: 7, techada: false, conLuz: true, base: 45, telefono: null, descripcion: 'Estacionamiento amplio, tribunas y parque para niños; también tiene losa de fulbito.' + NOTA },
  { dueno: 'dueno2', nombre: 'El Retador de San Miguel', zona: 'San Sebastián', direccion: 'Pasaje San Sebastián 051', lat: -13.5318, lng: -71.9372, tipo: 'SINTETICO', formato: 5, techada: false, conLuz: true, base: 40, telefono: null, descripcion: 'Cancha sintética de barrio. Paraderos cercanos: RTU-04, RTU-18 y RTU-25.' + NOTA },
  { dueno: 'dueno2', nombre: 'Cancha Los Waykis', zona: 'San Sebastián', direccion: 'San Sebastián (dirección por confirmar)', lat: -13.5335, lng: -71.9305, tipo: 'SINTETICO', formato: 5, techada: false, conLuz: true, base: 40, telefono: '51969700745', descripcion: 'Cancha sintética con reservas por WhatsApp.' + NOTA },
  { dueno: 'dueno2', nombre: 'Cancha de ejemplo (borrador, ficticia)', zona: 'San Jerónimo', direccion: 'Av. Manco Cápac (referencial)', lat: -13.5452, lng: -71.8873, tipo: 'LOSA', formato: 5, techada: false, conLuz: true, base: 30, telefono: null, descripcion: 'Aún no publicada: solo la ve su dueño. Sirve para probar el modo borrador.', publicada: false }
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
        telefono: c.telefono, // solo el WhatsApp público real; si no hay, el botón no aparece
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

  // Anuncios de ejemplo (negocios FICTICIOS), vigentes 60 días.
  const desde = aUtc(hoy, 0);
  const hasta = aUtc(sumarDias(hoy, 60), 24);
  const anuncios = [
    { anunciante: 'Deportes El Crack (ficticio)', titulo: 'Chimpunes con 10 % de descuento', texto: 'Cerca de Parque Industrial. Muestra tu reserva de tukanchitape.', zona: 'Wanchaq', enlace: 'https://wa.me/51984000099' },
    { anunciante: 'Juguería La Pichanga (ficticia)', titulo: 'Jugo + agua después del partido', texto: 'Combo a S/ 6 para el equipo que acaba de jugar.', zona: 'San Sebastián', enlace: null },
    { anunciante: 'Fisio Cusco Sport (ficticio)', titulo: '¿Te torciste el tobillo?', texto: 'Evaluación de lesiones deportivas. Primera consulta con descuento.', zona: null, enlace: null }
  ];
  for (const a of anuncios) await db.anuncio.create({ data: { ...a, desde, hasta } });

  return { usuarios, canchas };
}

module.exports = { cargarSemilla, USUARIOS, PASSWORD_DEMO };
