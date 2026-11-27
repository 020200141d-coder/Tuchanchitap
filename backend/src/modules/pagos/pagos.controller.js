// ============================================================================
//  src/modules/pagos/pagos.controller.js — HTTP ↔ pagos Yape/Plin y reseñas
// ============================================================================

import pagos from './pagos.service.js';
import resenas from './resenas.service.js';
import { ok, creado } from '../../utils/respuesta.js';

const id = req => req.datos.params.id;

export default {
  enviar: async (req, res) => creado(res, await pagos.enviar(req.usuario, id(req), req.datos.body, req.file)),
  listar: async (req, res) => ok(res, await pagos.listar(req.usuario, req.datos.query)),
  aprobar: async (req, res) => ok(res, await pagos.aprobar(req.usuario, id(req))),
  rechazar: async (req, res) => ok(res, await pagos.rechazar(req.usuario, id(req), req.datos.body.nota)),
  crearResena: async (req, res) => creado(res, await resenas.crear(req.usuario, id(req), req.datos.body)),
  resenasDeCancha: async (req, res) => ok(res, await resenas.listarDeCancha(id(req)))
};
