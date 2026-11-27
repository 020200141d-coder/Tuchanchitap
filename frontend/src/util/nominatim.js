// ============================================================================
//  src/util/nominatim.js — buscar una dirección en el mapa (gratis)
//
//  Nominatim es el buscador de OpenStreetMap. Sus reglas de uso piden como
//  máximo 1 consulta por segundo y no usarlo para autocompletar mientras se
//  escribe. Por eso:
//   • solo se usa en el formulario del dueño, al apretar "Buscar";
//   • una pausa interna asegura ≥ 1 s entre consultas;
//   • se limita a Perú y se agrega "Cusco" para mejores resultados.
// ============================================================================

let ultima = 0;

export async function buscarDireccion(texto) {
  const espera = 1100 - (Date.now() - ultima);
  if (espera > 0) await new Promise(r => setTimeout(r, espera));
  ultima = Date.now();

  const consulta = /cusco/i.test(texto) ? texto : `${texto}, Cusco`;
  const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=5&countrycodes=pe&accept-language=es&q=${encodeURIComponent(consulta)}`;
  const respuesta = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!respuesta.ok) throw new Error('El buscador de direcciones no respondió. Toca el mapa para ubicar la cancha.');
  const lista = await respuesta.json();
  return lista.map(r => ({ nombre: r.display_name, lat: Number(r.lat), lng: Number(r.lon) }));
}
