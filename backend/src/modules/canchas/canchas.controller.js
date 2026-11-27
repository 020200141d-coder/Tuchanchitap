// ============================================================================
//  src/modules/canchas/canchas.controller.js — HTTP ↔ servicio de canchas
//  (delgado: datos validados en req.datos, el servicio aplica las reglas)
// ============================================================================

import servicio from './canchas.service.js';
import { ok, creado, sinContenido } from '../../utils/respuesta.js';

const listar = async (req, res) => ok(res, await servicio.listarPublicas(req.datos.query));
const mias = async (req, res) => ok(res, await servicio.listarMias(req.usuario));
const obtener = async (req, res) => ok(res, await servicio.obtener(req.datos.params.id, req.usuario));
const crear = async (req, res) => creado(res, await servicio.crear(req.usuario, req.datos.body));
const actualizar = async (req, res) => ok(res, await servicio.actualizar(req.usuario, req.datos.params.id, req.datos.body));
const eliminar = async (req, res) => {
  await servicio.eliminar(req.usuario, req.datos.params.id);
  sinContenido(res);
};
const subirImagen = async (req, res) => creado(res, await servicio.agregarImagen(req.usuario, req.datos.params.id, req.file, req.datos.query.tipo));
const quitarFoto = async (req, res) => ok(res, await servicio.quitarFoto(req.usuario, req.datos.params.id, req.datos.body.url));

export { listar, mias, obtener, crear, actualizar, eliminar, subirImagen, quitarFoto };
export default { listar, mias, obtener, crear, actualizar, eliminar, subirImagen, quitarFoto };
