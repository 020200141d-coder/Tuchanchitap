// ============================================================================
//  src/util/alertas.js — alertas, avisos y confeti con el estilo "Noche de estadio"
//
//  ¿Por qué un archivo propio?
//   Todas las acciones importantes (reservar, cancelar, aprobar, borrar…)
//   usan las mismas ventanas de SweetAlert2 con colores del tema, y así cada
//   pantalla solo dice QUÉ preguntar, no CÓMO se ve.
//
//  Funciones:
//   confirmar({ titulo, html, boton, peligro, accion })
//     → pregunta; si la persona acepta, ejecuta `accion` (async) mostrando un
//       cargando en el botón. Si la API falla, muestra el error DENTRO de la
//       ventana y deja reintentar. Devuelve el resultado de `accion` o null.
//   aviso(texto, tipo)      → toast arriba a la derecha que se cierra solo.
//   celebrar(opciones)      → ventana de éxito con confeti (al reservar).
//   pedirTexto({ titulo })  → ventana con un campo (motivo de rechazo…).
//   fiesta()                → solo el confeti.
// ============================================================================

import Swal from 'sweetalert2';
import 'sweetalert2/dist/sweetalert2.min.css';
import confetti from 'canvas-confetti';

const CLASES = {
  popup: 'alerta',
  title: 'alerta-titulo',
  htmlContainer: 'alerta-texto',
  confirmButton: 'boton boton-principal',
  cancelButton: 'boton boton-vidrio',
  denyButton: 'boton boton-whatsapp',
  validationMessage: 'alerta-error'
};

const base = Swal.mixin({
  customClass: CLASES,
  buttonsStyling: false,
  reverseButtons: true,
  showClass: { popup: 'alerta-entra' },
  hideClass: { popup: 'alerta-sale' }
});

const toast = Swal.mixin({
  toast: true,
  position: 'top-end',
  showConfirmButton: false,
  timer: 2800,
  timerProgressBar: true,
  customClass: { popup: 'alerta-toast' },
  didOpen: t => {
    t.addEventListener('mouseenter', Swal.stopTimer);
    t.addEventListener('mouseleave', Swal.resumeTimer);
  }
});

export const aviso = (texto, tipo = 'success') => toast.fire({ icon: tipo, title: texto });

export function fiesta() {
  const reducir = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  if (reducir) return;
  const colores = ['#bef264', '#22c55e', '#ffffff', '#facc15'];
  confetti({ particleCount: 120, spread: 80, origin: { y: 0.6 }, colors: colores, zIndex: 3000 });
  setTimeout(() => confetti({ particleCount: 60, angle: 60, spread: 60, origin: { x: 0, y: 0.7 }, colors: colores, zIndex: 3000 }), 250);
  setTimeout(() => confetti({ particleCount: 60, angle: 120, spread: 60, origin: { x: 1, y: 0.7 }, colors: colores, zIndex: 3000 }), 400);
}

export async function confirmar({ titulo, html, boton = 'Sí, continuar', cancelar = 'Volver', peligro = false, icono, accion }) {
  const r = await base.fire({
    title: titulo,
    html,
    icon: icono || (peligro ? 'warning' : 'question'),
    showCancelButton: true,
    confirmButtonText: boton,
    cancelButtonText: cancelar,
    customClass: { ...CLASES, confirmButton: `boton ${peligro ? 'boton-peligro' : 'boton-principal'}` },
    showLoaderOnConfirm: Boolean(accion),
    allowOutsideClick: () => !Swal.isLoading(),
    preConfirm: accion
      ? async () => {
          try {
            return await accion();
          } catch (e) {
            Swal.showValidationMessage(e.mensaje || e.message);
            return false;
          }
        }
      : undefined
  });
  return r.isConfirmed ? (r.value ?? true) : null;
}

export async function celebrar({ titulo, html, boton = 'Listo', otroBoton, otroBotonEsWhatsApp = false }) {
  fiesta();
  const r = await base.fire({
    title: titulo,
    html,
    icon: 'success',
    confirmButtonText: boton,
    showDenyButton: Boolean(otroBoton),
    denyButtonText: otroBoton,
    customClass: { ...CLASES, denyButton: otroBotonEsWhatsApp ? 'boton boton-whatsapp' : 'boton boton-vidrio' }
  });
  return r.isDenied ? 'otro' : r.isConfirmed ? 'principal' : null;
}

export async function pedirTexto({ titulo, html, placeholder, boton = 'Enviar', minimo = 3, accion }) {
  const r = await base.fire({
    title: titulo,
    html,
    input: 'text',
    inputPlaceholder: placeholder,
    showCancelButton: true,
    confirmButtonText: boton,
    cancelButtonText: 'Volver',
    inputValidator: v => (!v || v.trim().length < minimo ? 'Escribe un poco más' : undefined),
    showLoaderOnConfirm: true,
    preConfirm: async v => {
      try {
        return await accion(v.trim());
      } catch (e) {
        Swal.showValidationMessage(e.mensaje || e.message);
        return false;
      }
    }
  });
  return r.isConfirmed ? r.value : null;
}

// Texto seguro dentro del html de una alerta (evita inyectar HTML de datos).
export const seguro = t => String(t ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
