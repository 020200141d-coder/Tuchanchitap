// ============================================================================
//  src/componentes/RutaProtegida.jsx — pantallas que exigen sesión o rol
//
//  Sin sesión → manda a /ingresar y recuerda a dónde quería ir.
//  Con un rol no permitido → mensaje claro en vez de una pantalla rota.
//  (La seguridad real está en la API; esto solo mejora la experiencia.)
// ============================================================================

import { Navigate, useLocation } from 'react-router-dom';
import { useSesion } from '../contexto/Sesion';
import { Cargando, Vacio } from './Estado';

export default function RutaProtegida({ roles, children }) {
  const { usuario, revisando } = useSesion();
  const ubicacion = useLocation();

  if (revisando) return <Cargando texto="Revisando tu sesión…" />;
  if (!usuario) return <Navigate to="/ingresar" replace state={{ desde: ubicacion.pathname }} />;
  if (roles && !roles.includes(usuario.rol)) {
    return <Vacio titulo="Esta sección no es para tu tipo de cuenta" texto="Si eres dueño de una cancha, pide a la administración que active tu cuenta de dueño." />;
  }
  return children;
}
