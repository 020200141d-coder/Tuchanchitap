// Permite el paso solo a los roles indicados. Uso: router.post('/', auth, roles('VENDEDOR'), ...)
module.exports = (...permitidos) => (req, res, next) => {
  if (!permitidos.includes(req.usuario?.rol)) return res.status(403).json({ mensaje: 'No tienes permiso' });
  next();
};
