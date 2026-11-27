// ============================================================================
//  src/paginas/panel/GestionCanchas.jsx — CRUD de canchas en diálogos
//
//  Lo usan el panel del dueño (sus canchas) y el del admin (todas, y puede
//  elegir el dueño). Cada fila permite: editar (diálogo con FormCancha),
//  publicar/despublicar, subir fotos y el QR de Yape/Plin, y borrar (la API
//  responde 409 si tiene reservas: entonces se sugiere despublicar).
// ============================================================================

import { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/cliente';
import Dialogo, { Confirmar } from '../../componentes/Dialogo';
import FormCancha from '../../componentes/FormCancha';
import { Aviso, Cargando, Etiqueta, MensajeError, Vacio } from '../../componentes/Estado';
import { TIPOS, soles } from '../../util/formato';

export default function GestionCanchas({ canchas, esAdmin, duenos }) {
  const [editar, setEditar] = useState(null); // null | 'nueva' | cancha
  const [imagenes, setImagenes] = useState(null);
  const [borrar, setBorrar] = useState(null);
  const [aviso, setAviso] = useState(null);
  const [errorBorrar, setErrorBorrar] = useState(null);
  const [ocupado, setOcupado] = useState(false);

  const recargar = () => canchas.recargar();

  const alternarPublicada = async c => {
    try {
      await api.patch(`/canchas/${c.id}`, { publicada: !c.publicada });
      setAviso({ tono: 'exito', texto: c.publicada ? `${c.nombre} ya no se muestra a los jugadores.` : `${c.nombre} está publicada.` });
      recargar();
    } catch (e) {
      setAviso({ tono: 'peligro', texto: e.mensaje });
    }
  };

  return (
    <section>
      <div className="fila-titulo">
        <h2>{esAdmin ? 'Todas las canchas' : 'Mis canchas'}</h2>
        <button type="button" className="boton boton-principal" onClick={() => setEditar('nueva')}>
          + Nueva cancha
        </button>
      </div>
      {aviso && (
        <Aviso tono={aviso.tono} alCerrar={() => setAviso(null)}>
          {aviso.texto}
        </Aviso>
      )}
      {canchas.cargando && !canchas.datos && <Cargando />}
      <MensajeError error={canchas.error} alReintentar={recargar} />
      {canchas.datos?.length === 0 && (
        <Vacio titulo="Registra tu primera cancha" texto="Ubícala en el mapa, pon tus tarifas y publícala para recibir reservas.">
          <button type="button" className="boton boton-principal" onClick={() => setEditar('nueva')}>
            Registrar cancha
          </button>
        </Vacio>
      )}
      {canchas.datos?.length > 0 && (
        <div className="tabla-envoltura">
          <table className="tabla">
            <thead>
              <tr>
                <th>Cancha</th>
                {esAdmin && <th>Dueño</th>}
                <th>Detalle</th>
                <th>Precio</th>
                <th>Estado</th>
                <th>
                  <span className="sr-only">Acciones</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {canchas.datos.map(c => (
                <tr key={c.id}>
                  <td>
                    <Link to={`/canchas/${c.id}`}>{c.nombre}</Link>
                    <div className="texto-suave">{c.zona}</div>
                  </td>
                  {esAdmin && <td>{c.dueno?.nombre}</td>}
                  <td>
                    {TIPOS[c.tipo]} · F{c.formato}
                    {c.techada ? ' · techada' : ''}
                  </td>
                  <td>{c.precioDesde !== null ? `${soles(c.precioDesde)}–${soles(c.precioHasta)}` : <span className="texto-aviso">sin tarifas</span>}</td>
                  <td>
                    <Etiqueta tono={c.publicada ? 'exito' : 'neutro'}>{c.publicada ? 'Publicada' : 'Borrador'}</Etiqueta>
                  </td>
                  <td className="acciones">
                    <button type="button" className="boton boton-chico" onClick={() => setEditar(c)}>
                      Editar
                    </button>
                    <button type="button" className="boton boton-chico" onClick={() => setImagenes(c)}>
                      Fotos y QR
                    </button>
                    <button type="button" className="boton boton-chico" onClick={() => alternarPublicada(c)}>
                      {c.publicada ? 'Despublicar' : 'Publicar'}
                    </button>
                    <button type="button" className="boton boton-chico boton-peligro-suave" onClick={() => { setErrorBorrar(null); setBorrar(c); }}>
                      Borrar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Dialogo abierto={Boolean(editar)} titulo={editar === 'nueva' ? 'Nueva cancha' : `Editar ${editar?.nombre || ''}`} alCerrar={() => setEditar(null)} ancho={640}>
        {editar && (
          <FormCancha
            key={editar === 'nueva' ? 'nueva' : editar.id}
            cancha={editar === 'nueva' ? null : editar}
            duenos={esAdmin ? duenos : null}
            alGuardar={g => {
              setEditar(null);
              setAviso({ tono: 'exito', texto: `${g.nombre} guardada.${g.publicada ? '' : ' Recuerda publicarla cuando tenga tarifas.'}` });
              recargar();
            }}
          />
        )}
      </Dialogo>

      <DialogoImagenes cancha={imagenes && canchas.datos?.find(c => c.id === imagenes.id)} alCerrar={() => setImagenes(null)} alCambiar={recargar} />

      <Confirmar
        abierto={Boolean(borrar)}
        titulo="¿Borrar la cancha?"
        texto={
          <>
            Se borrarán {borrar?.nombre}, sus tarifas y bloqueos. No se puede deshacer.
            {errorBorrar && <MensajeError error={errorBorrar} />}
          </>
        }
        textoBoton="Borrar"
        ocupado={ocupado}
        alCerrar={() => setBorrar(null)}
        alConfirmar={async () => {
          setOcupado(true);
          try {
            await api.delete(`/canchas/${borrar.id}`);
            setBorrar(null);
            setAviso({ tono: 'exito', texto: 'Cancha borrada.' });
            recargar();
          } catch (e) {
            setErrorBorrar(e);
          } finally {
            setOcupado(false);
          }
        }}
      />
    </section>
  );
}

// Fotos de la cancha (hasta 6) y QR de Yape/Plin.
function DialogoImagenes({ cancha, alCerrar, alCambiar }) {
  const [error, setError] = useState(null);
  const [subiendo, setSubiendo] = useState(false);

  const subir = async (archivo, tipo) => {
    if (!archivo) return;
    const datos = new FormData();
    datos.append('imagen', archivo);
    setSubiendo(true);
    setError(null);
    try {
      await api.post(`/canchas/${cancha.id}/imagenes`, datos, { params: { tipo } });
      alCambiar();
    } catch (e) {
      setError(e);
    } finally {
      setSubiendo(false);
    }
  };

  const quitar = async url => {
    try {
      await api.delete(`/canchas/${cancha.id}/fotos`, { data: { url } });
      alCambiar();
    } catch (e) {
      setError(e);
    }
  };

  return (
    <Dialogo abierto={Boolean(cancha)} titulo={`Fotos y QR · ${cancha?.nombre || ''}`} alCerrar={alCerrar}>
      {cancha && (
        <div className="formulario">
          <h3>QR de Yape / Plin</h3>
          <p className="texto-suave">Los jugadores lo verán al pagar el adelanto.</p>
          {cancha.qrPagoUrl && <img className="qr" src={cancha.qrPagoUrl} alt="QR actual" />}
          <input type="file" accept="image/jpeg,image/png,image/webp" disabled={subiendo} onChange={e => subir(e.target.files[0], 'qr')} aria-label="Subir QR" />
          <h3>Fotos ({cancha.fotos.length}/6)</h3>
          <div className="galeria">
            {cancha.fotos.map(f => (
              <figure key={f}>
                <img src={f} alt="Foto de la cancha" />
                <button type="button" className="boton boton-chico boton-peligro-suave" onClick={() => quitar(f)}>
                  Quitar
                </button>
              </figure>
            ))}
          </div>
          {cancha.fotos.length < 6 && <input type="file" accept="image/jpeg,image/png,image/webp" disabled={subiendo} onChange={e => subir(e.target.files[0], 'foto')} aria-label="Subir foto" />}
          {subiendo && <Cargando texto="Subiendo…" />}
          <MensajeError error={error} />
        </div>
      )}
    </Dialogo>
  );
}
