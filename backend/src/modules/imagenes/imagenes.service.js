// ============================================================================
//  src/modules/imagenes/imagenes.service.js — imágenes del sitio administrables
//
//  ¿Para qué?  Los fondos de la portada (carrusel), del ingreso y la imagen de
//  "cancha sin foto" no están fijos en el código: el ADMIN los cambia desde su
//  panel (subiendo una foto recortada o pegando una URL), los ordena y los
//  activa o pausa. La semilla trae fotos libres de Unsplash con su crédito.
//
//  Reglas:
//   • Para crear hace falta un archivo O una URL (422 si no hay ninguno).
//   • El público solo ve las activas, en el orden elegido.
//   • No se puede dejar un lugar sin ninguna imagen activa (409): la portada
//     nunca debe quedar en blanco.
// ============================================================================

import db from '../../config/database.js';
import { invalido, noEncontrado, conflicto } from '../../utils/errores.js';
import { guardarImagen } from '../../utils/almacen.js';
import { LUGARES } from './imagenes.schema.js';

const ORDEN = [{ orden: 'asc' }, { id: 'asc' }];

// Público: { PORTADA: [...], INGRESO: [...], CANCHA_SIN_FOTO: [...] } o un lugar.
async function publicas({ lugar } = {}) {
  const lista = await db.imagenSitio.findMany({ where: { activa: true, lugar }, orderBy: ORDEN });
  const visibles = lista.map(({ id, lugar: l, url, titulo, credito, enlaceCredito }) => ({ id, lugar: l, url, titulo, credito, enlaceCredito }));
  if (lugar) return visibles;
  return Object.fromEntries(LUGARES.map(l => [l, visibles.filter(i => i.lugar === l)]));
}

const listar = () => db.imagenSitio.findMany({ orderBy: [{ lugar: 'asc' }, ...ORDEN] });

async function crear(datos, archivo) {
  const { url, ...resto } = datos;
  if (!archivo && !url) throw invalido('Sube una imagen o pega su URL', { url: 'Falta la imagen' });
  const final = archivo ? await guardarImagen(archivo, 'sitio') : url;
  if (resto.orden === undefined) resto.orden = await db.imagenSitio.count({ where: { lugar: resto.lugar } });
  return db.imagenSitio.create({ data: { ...resto, url: final } });
}

async function quedariaSinActivas(imagen, cambios) {
  const dejaDeContar = cambios.activa === false || (cambios.lugar && cambios.lugar !== imagen.lugar) || cambios.borrar;
  if (!imagen.activa || !dejaDeContar) return false;
  const otras = await db.imagenSitio.count({ where: { lugar: imagen.lugar, activa: true, id: { not: imagen.id } } });
  return otras === 0;
}

async function actualizar(id, cambios) {
  const imagen = await db.imagenSitio.findUnique({ where: { id } });
  if (!imagen) throw noEncontrado('La imagen');
  if (await quedariaSinActivas(imagen, cambios)) throw conflicto('Es la única imagen activa de ese lugar: agrega otra antes de pausarla o moverla');
  return db.imagenSitio.update({ where: { id }, data: cambios });
}

async function eliminar(id) {
  const imagen = await db.imagenSitio.findUnique({ where: { id } });
  if (!imagen) throw noEncontrado('La imagen');
  if (await quedariaSinActivas(imagen, { borrar: true })) throw conflicto('Es la única imagen activa de ese lugar: agrega otra antes de borrarla');
  await db.imagenSitio.delete({ where: { id } });
}

export { publicas, listar, crear, actualizar, eliminar };
export default { publicas, listar, crear, actualizar, eliminar };
