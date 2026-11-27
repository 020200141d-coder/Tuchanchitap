// ============================================================================
//  src/util/useCarga.js — hook para pedir datos con sus 4 estados
//
//  La guía pide manejar loading / success / error / empty. Este hook da los
//  tres primeros y la pantalla decide cuándo está "vacío":
//    const { datos, cargando, error, recargar } = useCarga(() => api.get('/x'), [dep]);
//  Si cambian las dependencias se vuelve a pedir; si una respuesta vieja llega
//  tarde, se descarta (evita mostrar datos de un filtro anterior).
// ============================================================================

import { useCallback, useEffect, useRef, useState } from 'react';

export function useCarga(pedir, dependencias = []) {
  const [estado, setEstado] = useState({ datos: null, cargando: true, error: null });
  const turno = useRef(0);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const cargar = useCallback(pedir, dependencias);

  const recargar = useCallback(() => {
    const mio = ++turno.current;
    setEstado(e => ({ ...e, cargando: true, error: null }));
    return cargar()
      .then(datos => mio === turno.current && setEstado({ datos, cargando: false, error: null }))
      .catch(error => mio === turno.current && setEstado({ datos: null, cargando: false, error }));
  }, [cargar]);

  useEffect(() => {
    recargar();
  }, [recargar]);

  return { ...estado, recargar };
}
