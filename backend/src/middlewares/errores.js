// Manejo central de errores: cualquier error lanzado en un servicio termina aquí.
// Los servicios lanzan { status, mensaje } para errores conocidos (409, 422, etc.).
module.exports = (err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({ mensaje: err.mensaje || 'Error interno del servidor' });
};
