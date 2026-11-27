// ============================================================================
//  src/api/cliente.js — único punto de salida hacia la API (Axios)
//
//  • baseURL: VITE_API_URL en producción; vacío en desarrollo (proxy de Vite).
//  • Interceptor de petición: agrega "Authorization: Bearer <token>" si hay
//    sesión guardada.
//  • Interceptor de respuesta: desenvuelve { ok, data } y convierte los
//    errores { ok:false, error, campos } en un Error con .mensaje, .campos y
//    .status, para que las pantallas muestren el texto tal cual.
//  • Si la API responde 401 (token vencido), avisa a la sesión para cerrarla.
// ============================================================================

import axios from 'axios';

const CLAVE_TOKEN = 'tukanchitape.token';

export const tokenGuardado = {
  leer: () => {
    try {
      return localStorage.getItem(CLAVE_TOKEN);
    } catch {
      return null;
    }
  },
  guardar: t => {
    try {
      if (t) localStorage.setItem(CLAVE_TOKEN, t);
      else localStorage.removeItem(CLAVE_TOKEN);
    } catch {
      /* navegador sin almacenamiento: la sesión dura lo que la pestaña */
    }
  }
};

export const API_URL = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');

const api = axios.create({ baseURL: `${API_URL}/api`, timeout: 15000 });

let alVencerSesion = () => {};
export const cuandoVenzaLaSesion = fn => {
  alVencerSesion = fn;
};

api.interceptors.request.use(config => {
  const token = tokenGuardado.leer();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  respuesta => (respuesta.status === 204 ? null : respuesta.data?.data),
  error => {
    const status = error.response?.status ?? 0;
    const cuerpo = error.response?.data;
    const e = new Error(cuerpo?.error || (status === 0 ? 'No hay conexión con el servidor. Revisa tu internet.' : 'Ocurrió un error inesperado'));
    e.mensaje = e.message;
    e.campos = cuerpo?.campos || {};
    e.status = status;
    if (status === 401 && tokenGuardado.leer()) alVencerSesion();
    return Promise.reject(e);
  }
);

export default api;
