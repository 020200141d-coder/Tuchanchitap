// ============================================================================
//  src/middleware/subida.js — recibe UNA imagen en multipart/form-data (multer)
//
//  La imagen queda en memoria (req.file.buffer) y el servicio decide dónde
//  guardarla (src/lib/almacen.js). Límite: 3 MB y solo JPG, PNG o WEBP; una
//  foto de comprobante tomada con el celular pesa menos de eso.
//
//  Uso: router.post('/x', subirImagen('imagen'), controlador)
// ============================================================================

const multer = require('multer');
const { ErrorNegocio } = require('../lib/errores');
const { EXTENSIONES } = require('../lib/almacen');

const multerImagen = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 3 * 1024 * 1024, files: 1 },
  fileFilter(req, file, cb) {
    if (EXTENSIONES[file.mimetype]) return cb(null, true);
    return cb(new ErrorNegocio('Solo se aceptan imágenes JPG, PNG o WEBP', 400));
  }
});

const subirImagen = campo => multerImagen.single(campo);

module.exports = { subirImagen };
