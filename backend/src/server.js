// Punto de arranque: levanta el servidor en el puerto del .env.
// Se separa de app.js para que las pruebas con Supertest usen app sin abrir el puerto.
const app = require('./app');
const { port } = require('./config/env');

app.listen(port, () => console.log(`API escuchando en http://localhost:${port}`));
