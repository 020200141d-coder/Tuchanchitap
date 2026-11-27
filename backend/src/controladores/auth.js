// ============================================================================
//  src/controladores/auth.js — traduce HTTP ↔ servicio de autenticación
//
//  Los controladores son delgados: toman los datos ya validados
//  (req.datos.body), llaman al servicio y responden. Los errores suben solos
//  al manejador central (Express 5 atrapa los errores de funciones async).
// ============================================================================

const servicio = require('../servicios/auth');
const { ok, creado } = require('../lib/respuesta');

const registrar = async (req, res) => creado(res, await servicio.registrar(req.datos.body));
const ingresar = async (req, res) => ok(res, await servicio.ingresar(req.datos.body));
const yo = async (req, res) => ok(res, req.usuario);
const actualizarPerfil = async (req, res) => ok(res, await servicio.actualizarPerfil(req.usuario, req.datos.body));

module.exports = { registrar, ingresar, yo, actualizarPerfil };
