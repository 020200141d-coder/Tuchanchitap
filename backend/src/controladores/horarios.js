// ============================================================================
//  src/controladores/horarios.js — HTTP ↔ tarifas, bloqueos y horas libres
// ============================================================================

const tarifas = require('../servicios/tarifas');
const bloqueos = require('../servicios/bloqueos');
const disponibilidad = require('../servicios/disponibilidad');
const { ok, creado, sinContenido } = require('../lib/respuesta');

const id = req => req.datos.params.id;

module.exports = {
  listarTarifas: async (req, res) => ok(res, await tarifas.listar(id(req))),
  crearTarifa: async (req, res) => creado(res, await tarifas.crear(req.usuario, id(req), req.datos.body)),
  actualizarTarifa: async (req, res) => ok(res, await tarifas.actualizar(req.usuario, id(req), req.datos.body)),
  eliminarTarifa: async (req, res) => {
    await tarifas.eliminar(req.usuario, id(req));
    sinContenido(res);
  },

  listarBloqueos: async (req, res) => ok(res, await bloqueos.listar(req.usuario, id(req), req.datos.query)),
  crearBloqueo: async (req, res) => creado(res, await bloqueos.crear(req.usuario, id(req), req.datos.body)),
  eliminarBloqueo: async (req, res) => {
    await bloqueos.eliminar(req.usuario, id(req));
    sinContenido(res);
  },

  disponibilidad: async (req, res) => ok(res, await disponibilidad.horasDelDia(id(req), req.datos.query.fecha, { usuario: req.usuario }))
};
