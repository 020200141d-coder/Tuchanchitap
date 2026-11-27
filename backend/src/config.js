// ============================================================================
//  src/config.js — configuración leída de variables de entorno (.env)
//
//  ¿Por qué centralizarla?
//   Ningún secreto vive en el código: todo sale de .env (que está en
//   .gitignore). El resto del proyecto importa este objeto y así las reglas
//   configurables (minutos de separación, horas para cancelar…) se cambian sin
//   tocar código. .env.example lista todas las variables sin valores.
// ============================================================================

const crypto = require('node:crypto');
require('dotenv').config({ quiet: true });

const entero = (valor, defecto) => {
  const n = Number.parseInt(valor, 10);
  return Number.isFinite(n) ? n : defecto;
};

const entorno = process.env.NODE_ENV || 'development';
const esPrueba = entorno === 'test';
const esProduccion = entorno === 'production';

// En producción la clave del JWT es obligatoria. En desarrollo, si falta, se
// genera una al azar (los tokens dejan de valer al reiniciar, lo cual es
// aceptable mientras programas) y se avisa por consola.
let jwtSecreto = process.env.JWT_SECRETO?.trim();
if (!jwtSecreto) {
  if (esProduccion) throw new Error('Falta JWT_SECRETO en las variables de entorno');
  jwtSecreto = crypto.randomBytes(32).toString('hex');
  if (!esPrueba) console.warn('[config] JWT_SECRETO vacío: se generó uno temporal para esta ejecución.');
}

// En producción no se permite el modo demo en memoria: perdería todo al
// reiniciar. Si falta la base, mejor que el despliegue falle y se note.
if (esProduccion && !process.env.DATABASE_URL?.trim()) throw new Error('Falta DATABASE_URL en las variables de entorno');

const config = {
  entorno,
  esPrueba,
  esProduccion,
  puerto: entero(process.env.PORT, 3000),
  // En pruebas siempre memoria, aunque exista DATABASE_URL en tu .env.
  usarMemoria: esPrueba || !process.env.DATABASE_URL?.trim(),
  jwtSecreto,
  jwtExpira: process.env.JWT_EXPIRA || '7d',
  // Orígenes permitidos por CORS, separados por coma.
  origenesFrontend: (process.env.FRONTEND_URL || 'http://localhost:5173').split(',').map(s => s.trim()).filter(Boolean),
  // URL pública de esta API (para armar los enlaces de las fotos subidas).
  urlPublica: (process.env.URL_PUBLICA || `http://localhost:${entero(process.env.PORT, 3000)}`).replace(/\/$/, ''),
  reglas: {
    minutosSeparacion: entero(process.env.MINUTOS_SEPARACION, 15), // regla 2
    horasCancelacion: entero(process.env.HORAS_CANCELACION, 6), // regla 5
    porcentajeAdelanto: entero(process.env.PORCENTAJE_ADELANTO, 30),
    horasMaximasReserva: entero(process.env.HORAS_MAXIMAS_RESERVA, 3),
    diasAnticipacion: entero(process.env.DIAS_ANTICIPACION, 30)
  },
  // Almacenamiento de fotos: disco local en desarrollo, Supabase Storage si
  // están estas dos variables.
  supabase: {
    url: process.env.SUPABASE_URL?.trim() || '',
    claveServicio: process.env.SUPABASE_SERVICE_KEY?.trim() || '',
    bucket: process.env.SUPABASE_BUCKET?.trim() || 'canchitas'
  }
};

module.exports = config;
