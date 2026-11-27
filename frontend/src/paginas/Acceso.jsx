// ============================================================================
//  src/paginas/Acceso.jsx — Ingresar y Crear cuenta
//
//  Después de entrar, vuelve a la pantalla de donde vino la persona (por
//  ejemplo, la cancha que quería reservar) o a su panel según el rol.
//  Los errores de la API se muestran junto a cada campo. Fondo: la foto de
//  "ingreso" del panel admin; al entrar, un toast de bienvenida.
// ============================================================================

import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useSesion } from '../contexto/Sesion';
import Campo from '../componentes/Campo';
import { MensajeError } from '../componentes/Estado';
import { useImagenes } from '../contexto/Imagenes';
import { aviso } from '../util/alertas';

// Fondo con la foto de 'ingreso' que elige el admin (Imágenes del sitio).
function PantallaAcceso({ children }) {
  const { ingreso } = useImagenes();
  return (
    <div className="pantalla-acceso">
      {ingreso[0] && <div className="fondo" style={{ backgroundImage: `url("${ingreso[0].url}")` }} aria-hidden="true" />}
      {children}
    </div>
  );
}

const destinoPorRol = rol => ({ ADMIN: '/admin', DUENO: '/panel' })[rol] || '/';

function useFormulario(inicial) {
  const [datos, setDatos] = useState(inicial);
  const [error, setError] = useState(null);
  const [enviando, setEnviando] = useState(false);
  const cambiar = campo => e => setDatos(d => ({ ...d, [campo]: e.target.value }));
  return { datos, setDatos, error, setError, enviando, setEnviando, cambiar };
}

export function Ingresar() {
  const { ingresar } = useSesion();
  const navegar = useNavigate();
  const desde = useLocation().state?.desde;
  const f = useFormulario({ email: '', password: '' });

  const enviar = async e => {
    e.preventDefault();
    f.setEnviando(true);
    f.setError(null);
    try {
      const u = await ingresar(f.datos);
      aviso(`¡Hola, ${u.nombre.split(' ')[0]}! ⚽`);
      navegar(desde || destinoPorRol(u.rol), { replace: true });
    } catch (err) {
      f.setError(err);
    } finally {
      f.setEnviando(false);
    }
  };

  return (
    <PantallaAcceso>
      <form className="tarjeta formulario" onSubmit={enviar} noValidate>
        <h1>¡Vuelve a la cancha!</h1>
        <p className="texto-suave">Ingresa para separar tu hora.</p>
        <Campo etiqueta="Correo" error={f.error?.campos?.email}>
          <input type="email" autoComplete="email" placeholder="tucorreo@gmail.com" value={f.datos.email} onChange={f.cambiar('email')} required />
        </Campo>
        <Campo etiqueta="Contraseña" error={f.error?.campos?.password}>
          <input type="password" autoComplete="current-password" value={f.datos.password} onChange={f.cambiar('password')} required />
        </Campo>
        {f.error && !Object.keys(f.error.campos || {}).length && <MensajeError error={f.error} />}
        <button className="boton boton-principal boton-bloque" disabled={f.enviando}>
          {f.enviando ? 'Ingresando…' : 'Ingresar'}
        </button>
        <p className="texto-suave">
          ¿No tienes cuenta? <Link to="/registro" state={{ desde }}>Crea una gratis</Link>
        </p>
      </form>
    </PantallaAcceso>
  );
}

export function Registro() {
  const { registrar } = useSesion();
  const navegar = useNavigate();
  const desde = useLocation().state?.desde;
  const f = useFormulario({ nombre: '', email: '', telefono: '', password: '', rol: 'JUGADOR' });

  const enviar = async e => {
    e.preventDefault();
    f.setEnviando(true);
    f.setError(null);
    try {
      const { telefono, ...resto } = f.datos;
      const u = await registrar(telefono ? { ...resto, telefono } : resto);
      aviso(`¡Bienvenido al equipo, ${u.nombre.split(' ')[0]}!`);
      navegar(desde || destinoPorRol(u.rol), { replace: true });
    } catch (err) {
      f.setError(err);
    } finally {
      f.setEnviando(false);
    }
  };

  const c = f.error?.campos || {};
  return (
    <PantallaAcceso>
      <form className="tarjeta formulario" onSubmit={enviar} noValidate>
        <h1>Únete al equipo</h1>
        <p className="texto-suave">Gratis. Reserva en un minuto.</p>
        <fieldset className="selector-rol">
          <legend className="campo-etiqueta">¿Para qué la usarás?</legend>
          <label className="opcion-rol">
            <input type="radio" name="rol" checked={f.datos.rol === 'JUGADOR'} onChange={() => f.setDatos(d => ({ ...d, rol: 'JUGADOR' }))} />
            <span aria-hidden="true">⚽</span>Quiero jugar
          </label>
          <label className="opcion-rol">
            <input type="radio" name="rol" checked={f.datos.rol === 'DUENO'} onChange={() => f.setDatos(d => ({ ...d, rol: 'DUENO' }))} />
            <span aria-hidden="true">🏟️</span>Tengo una cancha
          </label>
        </fieldset>
        <Campo etiqueta="Nombre y apellido" error={c.nombre}>
          <input autoComplete="name" value={f.datos.nombre} onChange={f.cambiar('nombre')} required />
        </Campo>
        <Campo etiqueta="Correo" error={c.email}>
          <input type="email" autoComplete="email" placeholder="tucorreo@gmail.com" value={f.datos.email} onChange={f.cambiar('email')} required />
        </Campo>
        <Campo etiqueta="Celular (WhatsApp)" error={c.telefono} ayuda={f.datos.rol === 'DUENO' ? 'Los jugadores te escribirán aquí.' : 'Opcional: para que el dueño te ubique.'}>
          <input type="tel" inputMode="numeric" autoComplete="tel" placeholder="984123456" value={f.datos.telefono} onChange={f.cambiar('telefono')} />
        </Campo>
        <Campo etiqueta="Contraseña" error={c.password} ayuda="Mínimo 8 caracteres.">
          <input type="password" autoComplete="new-password" value={f.datos.password} onChange={f.cambiar('password')} required />
        </Campo>
        {f.error && !Object.keys(c).length && <MensajeError error={f.error} />}
        <button className="boton boton-principal boton-bloque" disabled={f.enviando}>
          {f.enviando ? 'Creando…' : 'Crear cuenta'}
        </button>
        <p className="texto-suave">
          ¿Ya tienes cuenta? <Link to="/ingresar">Ingresa</Link>
        </p>
      </form>
    </PantallaAcceso>
  );
}
