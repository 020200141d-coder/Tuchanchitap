// ============================================================================
//  src/contexto/Imagenes.jsx — imágenes del sitio (fondos administrables)
//
//  Pide una sola vez GET /api/imagenes y las comparte con toda la app:
//   portada → carrusel del inicio · ingreso → fondo de login/registro ·
//   canchaSinFoto → imagen de las canchas que aún no subieron fotos.
//  Si la API no responde, hay un respaldo (degradado de estadio en CSS), así
//  que nunca queda un hueco en blanco. El panel admin llama a recargar()
//  después de cambiarlas para verlas al instante.
// ============================================================================

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import api from '../api/cliente';

const Contexto = createContext({ portada: [], ingreso: [], canchaSinFoto: null, recargar: () => {} });

export function ProveedorImagenes({ children }) {
  const [datos, setDatos] = useState({ PORTADA: [], INGRESO: [], CANCHA_SIN_FOTO: [] });

  const recargar = useCallback(() => {
    api
      .get('/imagenes')
      .then(setDatos)
      .catch(() => {});
  }, []);

  useEffect(recargar, [recargar]);

  const valor = useMemo(
    () => ({ portada: datos.PORTADA, ingreso: datos.INGRESO, canchaSinFoto: datos.CANCHA_SIN_FOTO[0]?.url || null, recargar }),
    [datos, recargar]
  );
  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
}

export const useImagenes = () => useContext(Contexto);
