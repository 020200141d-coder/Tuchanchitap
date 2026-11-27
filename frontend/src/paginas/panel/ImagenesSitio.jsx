// ============================================================================
//  src/paginas/panel/ImagenesSitio.jsx — Admin → Imágenes del sitio
//
//  Aquí el ADMIN cambia los fondos de la app sin tocar código:
//   • PORTADA: fotos del carrusel del inicio (varias, en el orden elegido).
//   • INGRESO: fondo de "Ingresar" y "Crear cuenta".
//   • CANCHA_SIN_FOTO: imagen para las canchas que aún no subieron fotos.
//
//  Agregar: subir una foto y RECORTARLA (Cropper.js, como en AeeS) con la
//  proporción correcta para cada lugar, o pegar la URL de una foto libre.
//  Cada imagen se puede pausar/activar, mover en el orden y borrar (con
//  confirmación SweetAlert2). La API impide dejar un lugar sin imágenes.
//  Al guardar se recarga el contexto de imágenes: el cambio se ve al instante.
// ============================================================================

import { useEffect, useRef, useState } from 'react';
import Cropper from 'cropperjs';
import 'cropperjs/dist/cropper.css';
import api from '../../api/cliente';
import { useCarga } from '../../util/useCarga';
import { useImagenes } from '../../contexto/Imagenes';
import { aviso, confirmar } from '../../util/alertas';
import Dialogo from '../../componentes/Dialogo';
import Campo from '../../componentes/Campo';
import { Cargando, Etiqueta, MensajeError, Vacio } from '../../componentes/Estado';

const LUGARES = {
  PORTADA: { texto: 'Portada (carrusel del inicio)', proporcion: 16 / 9 },
  INGRESO: { texto: 'Fondo de ingreso y registro', proporcion: 16 / 9 },
  CANCHA_SIN_FOTO: { texto: 'Cancha sin foto', proporcion: 16 / 10 }
};

export default function ImagenesSitio() {
  const lista = useCarga(() => api.get('/admin/imagenes'), []);
  const { recargar: recargarSitio } = useImagenes();
  const [nueva, setNueva] = useState(null); // lugar elegido para agregar
  const [editar, setEditar] = useState(null);

  const listo = texto => {
    aviso(texto);
    lista.recargar();
    recargarSitio();
  };

  const cambiar = async (img, cambios, texto) => {
    try {
      await api.patch(`/admin/imagenes/${img.id}`, cambios);
      listo(texto);
    } catch (e) {
      aviso(e.mensaje, 'error');
    }
  };

  const borrar = img =>
    confirmar({ titulo: '¿Borrar la imagen?', html: 'Se quitará del sitio. Si solo quieres ocultarla un tiempo, mejor páusala.', boton: 'Sí, borrar', peligro: true, accion: () => api.delete(`/admin/imagenes/${img.id}`) }).then(ok => ok && listo('Imagen borrada'));

  return (
    <section>
      <div className="fila-titulo">
        <h2>Imágenes del sitio</h2>
      </div>
      <p className="texto-suave">Cambia los fondos de la app. Las que vienen de ejemplo son fotos libres de Unsplash: reemplázalas por fotos reales de tus canchas cuando las tengas.</p>
      {lista.cargando && !lista.datos && <Cargando />}
      <MensajeError error={lista.error} alReintentar={lista.recargar} />

      {lista.datos &&
        Object.entries(LUGARES).map(([lugar, info]) => {
          const delLugar = lista.datos.filter(i => i.lugar === lugar);
          return (
            <div key={lugar} style={{ margin: '1.4rem 0' }}>
              <div className="fila-titulo">
                <h3>{info.texto}</h3>
                <button type="button" className="boton boton-principal boton-chico" onClick={() => setNueva(lugar)}>
                  + Agregar
                </button>
              </div>
              {delLugar.length === 0 && <Vacio titulo="Sin imágenes" texto="Agrega una para este lugar." />}
              <div className="imagenes-sitio">
                {delLugar.map((img, i) => (
                  <figure key={img.id} className={`tarjeta imagen-sitio ${img.activa ? '' : 'pausada'}`}>
                    <img src={img.url} alt={img.titulo || 'Imagen del sitio'} loading="lazy" />
                    <figcaption className="cuerpo">
                      <strong>{img.titulo || 'Sin título'}</strong>
                      {img.credito && <span className="texto-suave">{img.credito}</span>}
                      <span>
                        <Etiqueta tono={img.activa ? 'exito' : 'neutro'}>{img.activa ? 'Visible' : 'Pausada'}</Etiqueta> <span className="texto-suave">orden {img.orden}</span>
                      </span>
                      <div className="acciones">
                        <button type="button" className="boton boton-chico" disabled={i === 0} aria-label="Subir en el orden" onClick={() => cambiar(img, { orden: Math.max(0, delLugar[i - 1].orden - 1) }, 'Orden actualizado')}>
                          ↑
                        </button>
                        <button type="button" className="boton boton-chico" disabled={i === delLugar.length - 1} aria-label="Bajar en el orden" onClick={() => cambiar(img, { orden: delLugar[i + 1].orden + 1 }, 'Orden actualizado')}>
                          ↓
                        </button>
                        <button type="button" className="boton boton-chico" onClick={() => cambiar(img, { activa: !img.activa }, img.activa ? 'Imagen pausada' : 'Imagen visible')}>
                          {img.activa ? 'Pausar' : 'Activar'}
                        </button>
                        <button type="button" className="boton boton-chico" onClick={() => setEditar(img)}>
                          Editar
                        </button>
                        <button type="button" className="boton boton-chico boton-peligro-suave" onClick={() => borrar(img)}>
                          Borrar
                        </button>
                      </div>
                    </figcaption>
                  </figure>
                ))}
              </div>
            </div>
          );
        })}

      <Dialogo abierto={Boolean(nueva)} titulo={`Nueva imagen · ${nueva ? LUGARES[nueva].texto : ''}`} alCerrar={() => setNueva(null)} ancho={680}>
        {nueva && (
          <FormNueva
            key={nueva}
            lugar={nueva}
            alGuardar={() => {
              setNueva(null);
              listo('Imagen agregada');
            }}
          />
        )}
      </Dialogo>
      <Dialogo abierto={Boolean(editar)} titulo="Editar imagen" alCerrar={() => setEditar(null)} ancho={480}>
        {editar && (
          <FormEditar
            key={editar.id}
            imagen={editar}
            alGuardar={() => {
              setEditar(null);
              listo('Imagen actualizada');
            }}
          />
        )}
      </Dialogo>
    </section>
  );
}

// Subir y recortar, o pegar URL.
function FormNueva({ lugar, alGuardar }) {
  const [modo, setModo] = useState('subir');
  const [archivoUrl, setArchivoUrl] = useState(null);
  const [d, setD] = useState({ url: '', titulo: '', credito: '', enlaceCredito: '' });
  const [error, setError] = useState(null);
  const [guardando, setGuardando] = useState(false);
  const imgRef = useRef(null);
  const cropperRef = useRef(null);

  // Crea el recortador cuando hay imagen elegida; lo destruye al cambiar.
  useEffect(() => {
    if (!archivoUrl || !imgRef.current) return undefined;
    cropperRef.current = new Cropper(imgRef.current, { aspectRatio: LUGARES[lugar].proporcion, viewMode: 1, autoCropArea: 1, background: false });
    return () => {
      cropperRef.current?.destroy();
      cropperRef.current = null;
      URL.revokeObjectURL(archivoUrl);
    };
  }, [archivoUrl, lugar]);

  const guardar = async e => {
    e.preventDefault();
    setError(null);
    const datos = new FormData();
    datos.append('lugar', lugar);
    for (const k of ['titulo', 'credito', 'enlaceCredito']) if (d[k]) datos.append(k, d[k]);
    try {
      setGuardando(true);
      if (modo === 'subir') {
        if (!cropperRef.current) throw Object.assign(new Error('Elige una foto primero'), { campos: {} });
        // Recorte final en JPG (máx. 1920 px de ancho) para que cargue rápido.
        const lienzo = cropperRef.current.getCroppedCanvas({ maxWidth: 1920, maxHeight: 1920, imageSmoothingQuality: 'high' });
        const blob = await new Promise(ok => lienzo.toBlob(ok, 'image/jpeg', 0.85));
        datos.append('imagen', blob, 'imagen.jpg');
      } else {
        datos.append('url', d.url);
      }
      await api.post('/admin/imagenes', datos);
      alGuardar();
    } catch (err) {
      setError(err);
    } finally {
      setGuardando(false);
    }
  };

  const c = error?.campos || {};
  return (
    <form className="formulario" onSubmit={guardar} noValidate>
      <div className="pestanas" role="tablist" style={{ marginBottom: 0 }}>
        <button type="button" role="tab" aria-selected={modo === 'subir'} className={`pestana ${modo === 'subir' ? 'pestana-activa' : ''}`} onClick={() => setModo('subir')}>
          Subir y recortar
        </button>
        <button type="button" role="tab" aria-selected={modo === 'url'} className={`pestana ${modo === 'url' ? 'pestana-activa' : ''}`} onClick={() => setModo('url')}>
          Pegar URL
        </button>
      </div>
      {modo === 'subir' ? (
        <>
          <Campo etiqueta="Foto" ayuda="JPG, PNG o WEBP. Luego ajusta el recuadro.">
            <input type="file" accept="image/jpeg,image/png,image/webp" onChange={e => e.target.files[0] && setArchivoUrl(URL.createObjectURL(e.target.files[0]))} />
          </Campo>
          {archivoUrl && (
            <div className="recorte">
              <img ref={imgRef} src={archivoUrl} alt="Imagen a recortar" />
            </div>
          )}
        </>
      ) : (
        <Campo etiqueta="URL de la imagen" error={c.url} ayuda="Por ejemplo, de Unsplash o Pexels (fotos libres).">
          <input type="url" value={d.url} onChange={e => setD({ ...d, url: e.target.value })} placeholder="https://images.unsplash.com/…" />
        </Campo>
      )}
      <Campo etiqueta="Título (opcional)" error={c.titulo}>
        <input value={d.titulo} onChange={e => setD({ ...d, titulo: e.target.value })} placeholder="Pichanga nocturna en Wanchaq" />
      </Campo>
      <div className="dos-columnas">
        <Campo etiqueta="Crédito (opcional)" error={c.credito}>
          <input value={d.credito} onChange={e => setD({ ...d, credito: e.target.value })} placeholder="Foto de … en Unsplash" />
        </Campo>
        <Campo etiqueta="Enlace del crédito" error={c.enlaceCredito}>
          <input type="url" value={d.enlaceCredito} onChange={e => setD({ ...d, enlaceCredito: e.target.value })} placeholder="https://unsplash.com/photos/…" />
        </Campo>
      </div>
      {error && !Object.keys(c).length && <MensajeError error={error} />}
      <button className="boton boton-principal boton-bloque" disabled={guardando}>
        {guardando ? 'Guardando…' : 'Guardar imagen'}
      </button>
    </form>
  );
}

function FormEditar({ imagen, alGuardar }) {
  const [d, setD] = useState({ lugar: imagen.lugar, titulo: imagen.titulo || '', credito: imagen.credito || '', enlaceCredito: imagen.enlaceCredito || '' });
  const [error, setError] = useState(null);
  const c = error?.campos || {};
  return (
    <form
      className="formulario"
      onSubmit={async e => {
        e.preventDefault();
        try {
          await api.patch(`/admin/imagenes/${imagen.id}`, d);
          alGuardar();
        } catch (err) {
          setError(err);
        }
      }}
    >
      <img src={imagen.url} alt="" style={{ borderRadius: 12, maxHeight: 180, objectFit: 'cover' }} />
      <Campo etiqueta="Lugar" error={c.lugar}>
        <select value={d.lugar} onChange={e => setD({ ...d, lugar: e.target.value })}>
          {Object.entries(LUGARES).map(([k, v]) => (
            <option key={k} value={k}>
              {v.texto}
            </option>
          ))}
        </select>
      </Campo>
      <Campo etiqueta="Título" error={c.titulo}>
        <input value={d.titulo} onChange={e => setD({ ...d, titulo: e.target.value })} />
      </Campo>
      <Campo etiqueta="Crédito" error={c.credito}>
        <input value={d.credito} onChange={e => setD({ ...d, credito: e.target.value })} />
      </Campo>
      <Campo etiqueta="Enlace del crédito" error={c.enlaceCredito}>
        <input type="url" value={d.enlaceCredito} onChange={e => setD({ ...d, enlaceCredito: e.target.value })} />
      </Campo>
      {error && !Object.keys(c).length && <MensajeError error={error} />}
      <button className="boton boton-principal boton-bloque">Guardar cambios</button>
    </form>
  );
}
