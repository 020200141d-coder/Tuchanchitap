// Verifica el token JWT que llega en la cabecera "Authorization: Bearer <token>".
// Si es válido, deja los datos del usuario en req.usuario para los siguientes pasos.
const jwt = require('jsonwebtoken');
const { jwtSecret } = require('../config/env');

module.exports = (req, res, next) => {
  const [tipo, token] = (req.headers.authorization || '').split(' ');
  if (tipo !== 'Bearer' || !token) return res.status(401).json({ mensaje: 'Falta el token' });
  try {
    req.usuario = jwt.verify(token, jwtSecret); // { id, rol }
    next();
  } catch {
    res.status(401).json({ mensaje: 'Token inválido o vencido' });
  }
};
