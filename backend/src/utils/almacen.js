// ============================================================================
//  src/utils/almacen.js — dónde se guardan las imágenes subidas
//
//  Imágenes: fotos de la cancha, QR de Yape/Plin del dueño y fotos de los
//  comprobantes de pago.
//
//  Tres destinos, según el entorno:
//   • Pruebas (Jest): no escribe nada; devuelve una URL simulada.
//   • Desarrollo: disco local, carpeta backend/uploads/ (servida en /uploads).
//   • Producción con SUPABASE_URL + SUPABASE_SERVICE_KEY: Supabase Storage
//     (plan gratis), usando su API REST con fetch; no hace falta otra librería.
//     Render borra el disco en cada despliegue, por eso allí se usa Supabase.
//
//  El nombre del archivo es aleatorio (UUID) para que no se pueda adivinar la
//  URL de un comprobante ajeno.
// ============================================================================

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import crypto from 'node:crypto';
import config from '../config/env.js';

const EXTENSIONES = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };
const CARPETA_LOCAL = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..', 'uploads');

const usarSupabase = () => Boolean(config.supabase.url && config.supabase.claveServicio);

/**
 * Guarda una imagen y devuelve su URL pública.
 * @param {{ buffer: Buffer, mimetype: string }} archivo  (lo arma multer)
 * @param {string} carpeta  'canchas' | 'qr' | 'comprobantes'
 */
async function guardarImagen(archivo, carpeta) {
  const extension = EXTENSIONES[archivo.mimetype] || 'bin';
  const nombre = `${carpeta}/${crypto.randomUUID()}.${extension}`;

  if (config.esPrueba) return `${config.urlPublica}/uploads/${nombre}`;

  if (usarSupabase()) {
    const { url, claveServicio, bucket } = config.supabase;
    const respuesta = await fetch(`${url}/storage/v1/object/${bucket}/${nombre}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${claveServicio}`, apikey: claveServicio, 'Content-Type': archivo.mimetype },
      body: archivo.buffer
    });
    if (!respuesta.ok) throw new Error(`Supabase Storage respondió ${respuesta.status}: ${await respuesta.text()}`);
    return `${url}/storage/v1/object/public/${bucket}/${nombre}`;
  }

  const destino = path.join(CARPETA_LOCAL, nombre);
  await fs.mkdir(path.dirname(destino), { recursive: true });
  await fs.writeFile(destino, archivo.buffer);
  return `${config.urlPublica}/uploads/${nombre}`;
}

export { guardarImagen, EXTENSIONES };
export default { guardarImagen, EXTENSIONES };
