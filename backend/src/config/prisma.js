// Una sola instancia de Prisma para toda la aplicación (evita abrir muchas conexiones).
const { PrismaClient } = require('@prisma/client');

module.exports = new PrismaClient();
