// ============================================================================
//  src/componentes/Anuncio.jsx — un anuncio discreto de un negocio del barrio
//
//  Reglas para no saturar (junto con las del backend):
//   • Siempre dice "Anuncio" y se puede ocultar (×). Si la persona oculta uno,
//     no se le muestran más en esta visita (sessionStorage).
//   • Pide 1 anuncio, priorizando la zona de la cancha.
//   • Si no hay anuncio vigente o la API falla, no muestra NADA (un anuncio
//     nunca debe romper ni ensuciar la pantalla).
//   • Nunca se usa en las pantallas de reservar o pagar.
//  Al tocarlo, se registra el clic (para el reporte al anunciante) y se abre
//  su enlace en otra pestaña.
// ============================================================================

import { useEffect, useState } from 'react';
import api from '../api/cliente';
import { X } from 'lucide-react';

const CLAVE_OCULTOS = 'tukanchitape.anunciosOcultos';
const estanOcultos = () => {
  try {
    return sessionStorage.getItem(CLAVE_OCULTOS) === '1';
  } catch {
    return false;
  }
};

export default function Anuncio({ zona }) {
  const [anuncio, setAnuncio] = useState(null);
  const [oculto, setOculto] = useState(estanOcultos);

  useEffect(() => {
    if (oculto) return;
    let vigente = true;
    api
      .get('/anuncios', { params: { zona, cantidad: 1 } })
      .then(lista => vigente && setAnuncio(lista[0] || null))
      .catch(() => vigente && setAnuncio(null));
    return () => {
      vigente = false;
    };
  }, [zona, oculto]);

  if (oculto || !anuncio) return null;

  const abrir = async () => {
    try {
      const { enlace } = await api.post(`/anuncios/${anuncio.id}/clic`);
      if (enlace) window.open(enlace, '_blank', 'noopener');
    } catch {
      /* si falla el conteo, no molestamos a la persona */
    }
  };

  const ocultar = () => {
    try {
      sessionStorage.setItem(CLAVE_OCULTOS, '1');
    } catch {
      /* sin almacenamiento: se oculta solo en esta pantalla */
    }
    setOculto(true);
  };

  return (
    <aside className="anuncio" aria-label={`Anuncio de ${anuncio.anunciante}`}>
      <div className="anuncio-cabecera">
        <span className="anuncio-etiqueta">Anuncio · {anuncio.anunciante}</span>
        <button type="button" className="boton-icono" aria-label="Ocultar anuncios" onClick={ocultar}>
          <X size={18} aria-hidden="true" />
        </button>
      </div>
      <p className="anuncio-titulo">{anuncio.titulo}</p>
      <p className="texto-suave">{anuncio.texto}</p>
      {anuncio.enlace && (
        <button type="button" className="boton boton-chico" onClick={abrir}>
          Ver oferta
        </button>
      )}
    </aside>
  );
}
