// ============================================================================
//  src/contexto/Sesion.jsx — quién está conectado (contexto de React)
//
//  Flujo:
//   1. Al abrir la app, si hay token guardado, pide /auth/yo para saber quién
//      es (y si el token sigue valiendo).
//   2. ingresar()/registrar() guardan el token y el usuario.
//   3. salir() o un 401 de la API limpian todo.
//  Cualquier componente lee la sesión con useSesion().
// ============================================================================

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import api, { cuandoVenzaLaSesion, tokenGuardado } from '../api/cliente';

const ContextoSesion = createContext(null);

export function ProveedorSesion({ children }) {
  const [usuario, setUsuario] = useState(null);
  const [revisando, setRevisando] = useState(Boolean(tokenGuardado.leer()));

  const salir = useCallback(() => {
    tokenGuardado.guardar(null);
    setUsuario(null);
  }, []);

  useEffect(() => {
    cuandoVenzaLaSesion(salir);
    if (!tokenGuardado.leer()) return;
    api
      .get('/auth/yo')
      .then(setUsuario)
      .catch(salir)
      .finally(() => setRevisando(false));
  }, [salir]);

  const abrirSesion = useCallback(({ token, usuario: u }) => {
    tokenGuardado.guardar(token);
    setUsuario(u);
    return u;
  }, []);

  const valor = useMemo(
    () => ({
      usuario,
      revisando,
      ingresar: datos => api.post('/auth/login', datos).then(abrirSesion),
      registrar: datos => api.post('/auth/registro', datos).then(abrirSesion),
      actualizarUsuario: setUsuario,
      salir
    }),
    [usuario, revisando, abrirSesion, salir]
  );

  return <ContextoSesion.Provider value={valor}>{children}</ContextoSesion.Provider>;
}

export const useSesion = () => useContext(ContextoSesion);
