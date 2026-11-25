// Lee las variables del archivo .env y las deja en un solo objeto.
// Así el resto del código no usa process.env directamente.
require('dotenv').config();

module.exports = {
  port: process.env.PORT || 3000,
  jwtSecret: process.env.JWT_SECRET,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '1d',
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
  mpAccessToken: process.env.MP_ACCESS_TOKEN,
};
