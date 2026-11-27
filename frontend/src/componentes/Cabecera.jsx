// ============================================================================
//  src/componentes/Cabecera.jsx — barra superior con el nombre y la navegación
//
//  Muestra enlaces según el rol: todos ven "Canchas"; con sesión, "Mis
//  reservas"; DUENO ve "Mi panel"; ADMIN ve "Admin". Cambiar de pantalla no
//  recarga la página (React Router).
// ============================================================================

import { NavLink, useNavigate } from 'react-router-dom';
import { useSesion } from '../contexto/Sesion';

export default function Cabecera() {
  const { usuario, salir } = useSesion();
  const navegar = useNavigate();

  return (
    <header className="cabecera">
      <div className="contenedor cabecera-fila">
        <NavLink to="/" className="marca" aria-label="tukanchitape, inicio">
          <img src="/pelota.svg" alt="" width="28" height="28" />
          <span>tukanchita<b>pe</b></span>
        </NavLink>
        <nav className="navegacion" aria-label="Principal">
          <NavLink to="/" end>
            Canchas
          </NavLink>
          {usuario && <NavLink to="/mis-reservas">Mis reservas</NavLink>}
          {usuario?.rol === 'DUENO' && <NavLink to="/panel">Mi panel</NavLink>}
          {usuario?.rol === 'ADMIN' && <NavLink to="/admin">Admin</NavLink>}
          {usuario ? (
            <button
              type="button"
              className="boton boton-chico boton-claro"
              onClick={() => {
                salir();
                navegar('/');
              }}
            >
              Salir ({usuario.nombre.split(' ')[0]})
            </button>
          ) : (
            <NavLink to="/ingresar" className="boton boton-chico boton-claro">
              Ingresar
            </NavLink>
          )}
        </nav>
      </div>
    </header>
  );
}
