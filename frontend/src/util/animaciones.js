// ============================================================================
//  src/util/animaciones.js — efectos de movimiento (inspirados en AeeS)
//
//  • useAparecer(): los elementos con [data-aparecer] entran suavemente al
//    llegar a la pantalla (IntersectionObserver, sin librerías).
//  • useEscribir(frases): texto que se escribe y borra solo (título del inicio).
//  • useContador(numero): número que sube animado ("5 canchas libres hoy").
//  • inclinar: tarjetas con inclinación 3D que sigue al mouse.
//  Todo respeta "reducir movimiento" del sistema (accesibilidad).
// ============================================================================

import { useEffect, useState } from 'react';

export const reducirMovimiento = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

export function useAparecer(dependencia) {
  useEffect(() => {
    const elementos = document.querySelectorAll('[data-aparecer]:not(.visible)');
    if (reducirMovimiento() || !('IntersectionObserver' in window)) {
      elementos.forEach(el => el.classList.add('visible'));
      return undefined;
    }
    const observador = new IntersectionObserver(
      entradas =>
        entradas.forEach(e => {
          if (!e.isIntersecting) return;
          e.target.classList.add('visible');
          observador.unobserve(e.target);
        }),
      { threshold: 0.12, rootMargin: '0px 0px -30px 0px' }
    );
    elementos.forEach((el, i) => {
      el.style.setProperty('--retraso', `${Math.min(i, 8) * 70}ms`);
      observador.observe(el);
    });
    return () => observador.disconnect();
  }, [dependencia]);
}

export function useEscribir(frases, { escribir = 70, borrar = 35, pausa = 2200 } = {}) {
  const [texto, setTexto] = useState(reducirMovimiento() ? frases[0] : '');
  useEffect(() => {
    if (reducirMovimiento()) return undefined;
    let frase = 0;
    let letra = 0;
    let borrando = false;
    let timer;
    const paso = () => {
      const actual = frases[frase];
      letra += borrando ? -1 : 1;
      setTexto(actual.slice(0, letra));
      let espera = borrando ? borrar : escribir;
      if (!borrando && letra === actual.length) {
        borrando = true;
        espera = pausa;
      } else if (borrando && letra === 0) {
        borrando = false;
        frase = (frase + 1) % frases.length;
        espera = 400;
      }
      timer = setTimeout(paso, espera);
    };
    timer = setTimeout(paso, 300);
    return () => clearTimeout(timer);
  }, [frases.join('|')]); // eslint-disable-line react-hooks/exhaustive-deps
  return texto;
}

export function useContador(hasta, duracion = 1400) {
  const [valor, setValor] = useState(0);
  useEffect(() => {
    if (hasta === null || hasta === undefined) return undefined;
    if (reducirMovimiento()) {
      setValor(hasta);
      return undefined;
    }
    let frame;
    const inicio = performance.now();
    const paso = ahora => {
      const t = Math.min((ahora - inicio) / duracion, 1);
      setValor(Math.round(hasta * (1 - Math.pow(2, -10 * t))));
      if (t < 1) frame = requestAnimationFrame(paso);
    };
    frame = requestAnimationFrame(paso);
    return () => cancelAnimationFrame(frame);
  }, [hasta, duracion]);
  return valor;
}

// Manejadores para inclinación 3D: <article {...inclinar}>.
export const inclinar = {
  onPointerMove: e => {
    if (e.pointerType !== 'mouse' || reducirMovimiento()) return;
    const el = e.currentTarget;
    const r = el.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5;
    const y = (e.clientY - r.top) / r.height - 0.5;
    el.style.transform = `perspective(800px) rotateY(${x * 7}deg) rotateX(${-y * 7}deg) translateY(-4px)`;
    el.style.setProperty('--brillo-x', `${(x + 0.5) * 100}%`);
    el.style.setProperty('--brillo-y', `${(y + 0.5) * 100}%`);
  },
  onPointerLeave: e => {
    e.currentTarget.style.transform = '';
  }
};
