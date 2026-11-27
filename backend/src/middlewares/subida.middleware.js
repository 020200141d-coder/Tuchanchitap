// ============================================================================
//  src/middlewares/subida.middleware.js — recibe UNA imagen en multipart/form-data (multer)
//
//  La imagen queda en memoria (req.file.buffer) y el servicio decide dónde
//  guardarla (src/utils/almacen.js). Límite: 3 MB y solo JPG, PNG o WEBP; una
//  foto de comprobante tomada con el celular pesa menos de eso.
//
//  Uso: router.post('/x', subirImagen('imagen'), controlador)
// ============================================================================

import multer from 'multer';
import { ErrorNegocio } from '../utils/errores.js';
import { EXTENSIONES } from '../utils/almacen.js';

const multerImagen = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 3 * 1024 * 1024, files: 1 },
  fileFilter(req, file, cb) {
    if (EXTENSIONES[file.mimetype]) return cb(null, true);
    return cb(new ErrorNegocio('Solo se aceptan imágenes JPG, PNG o WEBP', 400));
  }
});

const subirImagen = campo => multerImagen.single(campo);

export { subirImagen };
export default { subirImagen };
