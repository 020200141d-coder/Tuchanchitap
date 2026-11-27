// ============================================================================
//  src/paginas/PanelAdmin.jsx — panel de administración (rol ADMIN)
//
//  Reutiliza el panel del dueño (canchas de TODOS los dueños, calendario,
//  pagos, tarifas, bloqueos) y agrega:
//   • Resumen: números de la plataforma.
//   • Usuarios: CRUD en diálogos (crear dueños, cambiar rol, desactivar).
//   • Reservas: listado global con filtro y paginación.
//   • Reseñas: moderación.
//   • Anuncios: CRUD con impresiones, clics y tasa, para cobrar al anunciante.
// ============================================================================

import { useState } from 'react';
import api from '../api/cliente';
import { useCarga } from '../util/useCarga';
import { useSesion } from '../contexto/Sesion';
import { PanelCanchas } from './PanelDueno';
import Dialogo, { Confirmar } from '../componentes/Dialogo';
import Campo, { Casilla } from '../componentes/Campo';
import { Aviso, Cargando, Etiqueta, MensajeError, Vacio } from '../componentes/Estado';
import { ESTADOS_RESERVA, fechaCorta, fechaLarga, fechaLocal, hoyCusco, rangoHoras, soles } from '../util/formato';

const PESTANAS = [
  { id: 'resumen', texto: 'Resumen' },
  { id: 'usuarios', texto: 'Usuarios' },
  { id: 'canchas', texto: 'Canchas' },
  { id: 'reservas', texto: 'Reservas' },
  { id: 'pagos', texto: 'Pagos' },
  { id: 'anuncios', texto: 'Anuncios' },
  { id: 'resenas', texto: 'Reseñas' },
  { id: 'calendario', texto: 'Calendario' },
  { id: 'tarifas', texto: 'Tarifas' },
  { id: 'bloqueos', texto: 'Bloqueos' }
];

export default function PanelAdmin() {
  const canchas = useCarga(() => api.get('/canchas/mias'), []);
  const duenos = useCarga(() => api.get('/admin/usuarios', { params: { rol: 'DUENO', porPagina: 50 } }), []);
  return (
    <PanelCanchas
      titulo="Administración"
      pestanas={PESTANAS}
      canchas={canchas}
      esAdmin
      duenos={duenos.datos?.items || []}
      extras={{
        resumen: <Resumen />,
        usuarios: <Usuarios alCambiar={duenos.recargar} />,
        reservas: <Reservas />,
        anuncios: <Anuncios />,
        resenas: <Resenas />
      }}
    />
  );
}

function Resumen() {
  const { datos, cargando, error, recargar } = useCarga(() => api.get('/admin/resumen'), []);
  if (cargando && !datos) return <Cargando />;
  if (error) return <MensajeError error={error} alReintentar={recargar} />;
  const tarjetas = [
    ['Jugadores', datos.usuarios.jugadores],
    ['Dueños', datos.usuarios.duenos],
    ['Canchas publicadas', `${datos.canchas.publicadas} / ${datos.canchas.total}`],
    ['Pagos por revisar', datos.pagosPorRevisar],
    ['Reservas confirmadas', datos.reservas.confirmadas],
    ['Esperando pago', datos.reservas.pendientesPago],
    ['Jugadas', datos.reservas.jugadas],
    ['Monto reservado', soles(datos.montoReservado)]
  ];
  return (
    <div className="metricas">
      {tarjetas.map(([t, v]) => (
        <div key={t} className="metrica">
          <span className="texto-suave">{t}</span>
          <strong>{v}</strong>
        </div>
      ))}
    </div>
  );
}

const ROLES = { JUGADOR: 'Jugador', DUENO: 'Dueño', ADMIN: 'Admin' };

function Usuarios({ alCambiar }) {
  const { usuario: yo } = useSesion();
  const [q, setQ] = useState('');
  const [rol, setRol] = useState('');
  const [pagina, setPagina] = useState(1);
  const lista = useCarga(() => api.get('/admin/usuarios', { params: { q: q || undefined, rol: rol || undefined, pagina, porPagina: 15 } }), [q, rol, pagina]);
  const [editar, setEditar] = useState(null);
  const [borrar, setBorrar] = useState(null);
  const [aviso, setAviso] = useState(null);

  const listo = texto => {
    setAviso({ tono: 'exito', texto });
    lista.recargar();
    alCambiar();
  };

  return (
    <section>
      <div className="fila-titulo">
        <h2>Usuarios</h2>
        <button type="button" className="boton boton-principal" onClick={() => setEditar('nuevo')}>
          + Nuevo usuario
        </button>
      </div>
      <div className="filtros">
        <input type="search" placeholder="Buscar por nombre o correo" value={q} onChange={e => { setQ(e.target.value); setPagina(1); }} aria-label="Buscar usuarios" />
        <select value={rol} onChange={e => { setRol(e.target.value); setPagina(1); }} aria-label="Rol">
          <option value="">Todos los roles</option>
          {Object.entries(ROLES).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
      </div>
      {aviso && (
        <Aviso tono={aviso.tono} alCerrar={() => setAviso(null)}>
          {aviso.texto}
        </Aviso>
      )}
      {lista.cargando && !lista.datos && <Cargando />}
      <MensajeError error={lista.error} alReintentar={lista.recargar} />
      {lista.datos?.items.length === 0 && <Vacio titulo="Nadie coincide con la búsqueda" />}
      {lista.datos?.items.length > 0 && (
        <div className="tabla-envoltura">
          <table className="tabla">
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Correo</th>
                <th>Rol</th>
                <th>Estado</th>
                <th>
                  <span className="sr-only">Acciones</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {lista.datos.items.map(u => (
                <tr key={u.id}>
                  <td>
                    {u.nombre}
                    {u.telefono && <div className="texto-suave">{u.telefono}</div>}
                  </td>
                  <td>{u.email}</td>
                  <td>{ROLES[u.rol]}</td>
                  <td>
                    <Etiqueta tono={u.activo ? 'exito' : 'neutro'}>{u.activo ? 'Activo' : 'Desactivado'}</Etiqueta>
                  </td>
                  <td className="acciones">
                    <button type="button" className="boton boton-chico" onClick={() => setEditar(u)}>
                      Editar
                    </button>
                    {u.id !== yo.id && (
                      <button type="button" className="boton boton-chico boton-peligro-suave" onClick={() => setBorrar(u)}>
                        Borrar
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {lista.datos?.paginas > 1 && (
        <nav className="paginacion" aria-label="Páginas de usuarios">
          <button type="button" className="boton" disabled={pagina <= 1} onClick={() => setPagina(p => p - 1)}>
            Anterior
          </button>
          <span>
            {lista.datos.pagina} / {lista.datos.paginas}
          </span>
          <button type="button" className="boton" disabled={pagina >= lista.datos.paginas} onClick={() => setPagina(p => p + 1)}>
            Siguiente
          </button>
        </nav>
      )}
      <Dialogo abierto={Boolean(editar)} titulo={editar === 'nuevo' ? 'Nuevo usuario' : `Editar ${editar?.nombre || ''}`} alCerrar={() => setEditar(null)} ancho={480}>
        {editar && (
          <FormUsuario
            key={editar === 'nuevo' ? 'nuevo' : editar.id}
            usuario={editar === 'nuevo' ? null : editar}
            alGuardar={t => {
              setEditar(null);
              listo(t);
            }}
          />
        )}
      </Dialogo>
      <BorrarUsuario usuario={borrar} alCerrar={() => setBorrar(null)} alTerminar={() => { setBorrar(null); listo('Usuario borrado.'); }} />
    </section>
  );
}

function BorrarUsuario({ usuario, alCerrar, alTerminar }) {
  const [error, setError] = useState(null);
  return (
    <Confirmar
      abierto={Boolean(usuario)}
      titulo="¿Borrar usuario?"
      texto={
        <>
          {usuario?.nombre} se borrará para siempre. Si tiene canchas o reservas, mejor desactívalo.
          {error && <MensajeError error={error} />}
        </>
      }
      textoBoton="Borrar"
      alCerrar={() => { setError(null); alCerrar(); }}
      alConfirmar={async () => {
        try {
          await api.delete(`/admin/usuarios/${usuario.id}`);
          setError(null);
          alTerminar();
        } catch (e) {
          setError(e);
        }
      }}
    />
  );
}

function FormUsuario({ usuario, alGuardar }) {
  const [d, setD] = useState({ nombre: usuario?.nombre || '', email: usuario?.email || '', telefono: usuario?.telefono || '', rol: usuario?.rol || 'DUENO', activo: usuario?.activo ?? true, password: '' });
  const [error, setError] = useState(null);
  const c = error?.campos || {};

  const guardar = async e => {
    e.preventDefault();
    setError(null);
    const cuerpo = { nombre: d.nombre, email: d.email, rol: d.rol };
    if (d.telefono) cuerpo.telefono = d.telefono;
    else if (usuario) cuerpo.telefono = null;
    if (d.password) cuerpo.password = d.password;
    try {
      if (usuario) {
        await api.patch(`/admin/usuarios/${usuario.id}`, { ...cuerpo, activo: d.activo });
        alGuardar('Usuario actualizado.');
      } else {
        await api.post('/admin/usuarios', cuerpo);
        alGuardar('Usuario creado. Pásale su contraseña en persona, no por chat.');
      }
    } catch (err) {
      setError(err);
    }
  };

  return (
    <form className="formulario" onSubmit={guardar} noValidate>
      <Campo etiqueta="Nombre" error={c.nombre}>
        <input value={d.nombre} onChange={e => setD({ ...d, nombre: e.target.value })} />
      </Campo>
      <Campo etiqueta="Correo" error={c.email}>
        <input type="email" value={d.email} onChange={e => setD({ ...d, email: e.target.value })} />
      </Campo>
      <Campo etiqueta="Celular" error={c.telefono}>
        <input type="tel" value={d.telefono} onChange={e => setD({ ...d, telefono: e.target.value })} placeholder="984123456" />
      </Campo>
      <Campo etiqueta="Rol" error={c.rol}>
        <select value={d.rol} onChange={e => setD({ ...d, rol: e.target.value })}>
          {Object.entries(ROLES).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
      </Campo>
      <Campo etiqueta={usuario ? 'Nueva contraseña (opcional)' : 'Contraseña'} error={c.password} ayuda="Mínimo 8 caracteres.">
        <input type="password" autoComplete="new-password" value={d.password} onChange={e => setD({ ...d, password: e.target.value })} />
      </Campo>
      {usuario && <Casilla etiqueta="Cuenta activa" checked={d.activo} onChange={v => setD({ ...d, activo: v })} />}
      {error && !Object.keys(c).length && <MensajeError error={error} />}
      <button className="boton boton-principal boton-bloque">Guardar</button>
    </form>
  );
}

function Reservas() {
  const [estado, setEstado] = useState('');
  const [pagina, setPagina] = useState(1);
  const lista = useCarga(() => api.get('/admin/reservas', { params: { estado: estado || undefined, pagina, porPagina: 20 } }), [estado, pagina]);
  return (
    <section>
      <div className="fila-titulo">
        <h2>Reservas</h2>
        <select value={estado} onChange={e => { setEstado(e.target.value); setPagina(1); }} aria-label="Estado">
          <option value="">Todos los estados</option>
          {Object.entries(ESTADOS_RESERVA).map(([k, v]) => (
            <option key={k} value={k}>
              {v.texto}
            </option>
          ))}
        </select>
      </div>
      {lista.cargando && !lista.datos && <Cargando />}
      <MensajeError error={lista.error} alReintentar={lista.recargar} />
      {lista.datos?.items.length === 0 && <Vacio titulo="No hay reservas en este estado" />}
      {lista.datos?.items.length > 0 && (
        <div className="tabla-envoltura">
          <table className="tabla">
            <thead>
              <tr>
                <th>#</th>
                <th>Cancha</th>
                <th>Jugador</th>
                <th>Cuándo</th>
                <th>Total</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {lista.datos.items.map(r => (
                <tr key={r.id}>
                  <td>{r.id}</td>
                  <td>{r.cancha.nombre}</td>
                  <td>{r.jugador.nombre}</td>
                  <td>
                    {fechaCorta(r.inicio)} {rangoHoras(r.inicio, r.fin)}
                  </td>
                  <td>{soles(r.total)}</td>
                  <td>
                    <Etiqueta tono={ESTADOS_RESERVA[r.estado].tono}>{ESTADOS_RESERVA[r.estado].texto}</Etiqueta>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {lista.datos?.paginas > 1 && (
        <nav className="paginacion" aria-label="Páginas de reservas">
          <button type="button" className="boton" disabled={pagina <= 1} onClick={() => setPagina(p => p - 1)}>
            Anterior
          </button>
          <span>
            {lista.datos.pagina} / {lista.datos.paginas}
          </span>
          <button type="button" className="boton" disabled={pagina >= lista.datos.paginas} onClick={() => setPagina(p => p + 1)}>
            Siguiente
          </button>
        </nav>
      )}
    </section>
  );
}

function Resenas() {
  const lista = useCarga(() => api.get('/admin/resenas'), []);
  const [borrar, setBorrar] = useState(null);
  return (
    <section>
      <h2>Reseñas</h2>
      {lista.cargando && !lista.datos && <Cargando />}
      <MensajeError error={lista.error} alReintentar={lista.recargar} />
      {lista.datos?.length === 0 && <Vacio titulo="Aún no hay reseñas" />}
      <ul className="lista-simple">
        {lista.datos?.map(r => (
          <li key={r.id}>
            <span>{'★'.repeat(r.estrellas)}</span> <strong>{r.cancha}</strong> · {r.jugador} · {fechaLarga(r.creadoEn)}
            {r.texto && <div className="texto-suave">{r.texto}</div>}
            <button type="button" className="boton boton-chico boton-peligro-suave" onClick={() => setBorrar(r)}>
              Borrar
            </button>
          </li>
        ))}
      </ul>
      <Confirmar
        abierto={Boolean(borrar)}
        titulo="¿Borrar reseña?"
        texto="Úsalo solo si es ofensiva o falsa."
        textoBoton="Borrar"
        alCerrar={() => setBorrar(null)}
        alConfirmar={async () => {
          await api.delete(`/admin/resenas/${borrar.id}`).catch(() => {});
          setBorrar(null);
          lista.recargar();
        }}
      />
    </section>
  );
}

function Anuncios() {
  const lista = useCarga(() => api.get('/admin/anuncios'), []);
  const [editar, setEditar] = useState(null);
  const [borrar, setBorrar] = useState(null);
  const [aviso, setAviso] = useState(null);
  const listo = t => {
    setAviso({ tono: 'exito', texto: t });
    lista.recargar();
  };
  const hoy = new Date();
  return (
    <section>
      <div className="fila-titulo">
        <h2>Anuncios</h2>
        <button type="button" className="boton boton-principal" onClick={() => setEditar('nuevo')}>
          + Nuevo anuncio
        </button>
      </div>
      <p className="texto-suave">Se muestran como máximo uno cada 6 canchas y uno en cada ficha; nunca al reservar o pagar. Cobra por mes y usa las impresiones y clics como reporte.</p>
      {aviso && (
        <Aviso tono={aviso.tono} alCerrar={() => setAviso(null)}>
          {aviso.texto}
        </Aviso>
      )}
      {lista.cargando && !lista.datos && <Cargando />}
      <MensajeError error={lista.error} alReintentar={lista.recargar} />
      {lista.datos?.length === 0 && <Vacio titulo="Sin anunciantes todavía" texto="Ofrece el espacio a tiendas deportivas o juguerías cerca de las canchas." />}
      {lista.datos?.length > 0 && (
        <div className="tabla-envoltura">
          <table className="tabla">
            <thead>
              <tr>
                <th>Anunciante</th>
                <th>Zona</th>
                <th>Vigencia</th>
                <th>Vistas</th>
                <th>Clics</th>
                <th>Estado</th>
                <th>
                  <span className="sr-only">Acciones</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {lista.datos.map(a => {
                const vigente = a.activo && new Date(a.desde) <= hoy && new Date(a.hasta) >= hoy;
                return (
                  <tr key={a.id}>
                    <td>
                      <strong>{a.anunciante}</strong>
                      <div className="texto-suave">{a.titulo}</div>
                    </td>
                    <td>{a.zona || 'Toda la ciudad'}</td>
                    <td>
                      {fechaCorta(a.desde)} – {fechaCorta(a.hasta)}
                    </td>
                    <td>{a.impresiones}</td>
                    <td>
                      {a.clics} <span className="texto-suave">({a.tasaClics} %)</span>
                    </td>
                    <td>
                      <Etiqueta tono={vigente ? 'exito' : 'neutro'}>{vigente ? 'Al aire' : a.activo ? 'Fuera de fecha' : 'Pausado'}</Etiqueta>
                    </td>
                    <td className="acciones">
                      <button type="button" className="boton boton-chico" onClick={() => setEditar(a)}>
                        Editar
                      </button>
                      <button type="button" className="boton boton-chico boton-peligro-suave" onClick={() => setBorrar(a)}>
                        Borrar
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      <Dialogo abierto={Boolean(editar)} titulo={editar === 'nuevo' ? 'Nuevo anuncio' : 'Editar anuncio'} alCerrar={() => setEditar(null)} ancho={500}>
        {editar && (
          <FormAnuncio
            key={editar === 'nuevo' ? 'nuevo' : editar.id}
            anuncio={editar === 'nuevo' ? null : editar}
            alGuardar={t => {
              setEditar(null);
              listo(t);
            }}
          />
        )}
      </Dialogo>
      <Confirmar
        abierto={Boolean(borrar)}
        titulo="¿Borrar anuncio?"
        texto={`Se perderán sus estadísticas. Si solo terminó el contrato, mejor páusalo.`}
        textoBoton="Borrar"
        alCerrar={() => setBorrar(null)}
        alConfirmar={async () => {
          await api.delete(`/admin/anuncios/${borrar.id}`).catch(() => {});
          setBorrar(null);
          listo('Anuncio borrado.');
        }}
      />
    </section>
  );
}

function FormAnuncio({ anuncio, alGuardar }) {
  const [d, setD] = useState({
    anunciante: anuncio?.anunciante || '',
    titulo: anuncio?.titulo || '',
    texto: anuncio?.texto || '',
    enlace: anuncio?.enlace || '',
    zona: anuncio?.zona || '',
    activo: anuncio?.activo ?? true,
    desde: anuncio ? fechaLocal(anuncio.desde) : hoyCusco(),
    hasta: anuncio ? fechaLocal(anuncio.hasta) : hoyCusco(30)
  });
  const [error, setError] = useState(null);
  const c = error?.campos || {};
  const guardar = async e => {
    e.preventDefault();
    setError(null);
    const cuerpo = { ...d, enlace: d.enlace || null, zona: d.zona || null };
    try {
      if (anuncio) await api.patch(`/admin/anuncios/${anuncio.id}`, cuerpo);
      else await api.post('/admin/anuncios', cuerpo);
      alGuardar(anuncio ? 'Anuncio actualizado.' : 'Anuncio creado.');
    } catch (err) {
      setError(err);
    }
  };
  const campo = (k, etiqueta, props = {}) => (
    <Campo etiqueta={etiqueta} error={c[k]}>
      <input value={d[k]} onChange={e => setD({ ...d, [k]: e.target.value })} {...props} />
    </Campo>
  );
  return (
    <form className="formulario" onSubmit={guardar} noValidate>
      {campo('anunciante', 'Anunciante', { placeholder: 'Deportes El Crack' })}
      {campo('titulo', 'Título (máx. 60)', { maxLength: 60 })}
      <Campo etiqueta={`Texto (${d.texto.length}/140)`} error={c.texto}>
        <textarea rows="2" maxLength="140" value={d.texto} onChange={e => setD({ ...d, texto: e.target.value })} />
      </Campo>
      {campo('enlace', 'Enlace (web o wa.me)', { type: 'url', placeholder: 'https://wa.me/51984000000' })}
      {campo('zona', 'Zona (vacío = toda la ciudad)', { placeholder: 'Wanchaq' })}
      <div className="dos-columnas">
        {campo('desde', 'Desde', { type: 'date' })}
        {campo('hasta', 'Hasta', { type: 'date' })}
      </div>
      <Casilla etiqueta="Activo" checked={d.activo} onChange={v => setD({ ...d, activo: v })} />
      {error && !Object.keys(c).length && <MensajeError error={error} />}
      <button className="boton boton-principal boton-bloque">Guardar</button>
    </form>
  );
}
