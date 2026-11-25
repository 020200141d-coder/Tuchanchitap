// Cliente Axios compartido: todas las llamadas a la API pasan por aquí.
// Agrega el token JWT guardado para que el backend sepa quién hace la petición.
import axios from 'axios';

const cliente = axios.create({ baseURL: import.meta.env.VITE_API_URL });

cliente.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export default cliente;
