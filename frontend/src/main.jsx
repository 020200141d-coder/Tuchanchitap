// ============================================================================
//  src/main.jsx — arranque de React
//  Monta la app dentro de #raiz con el router, la sesión y las imágenes del
//  sitio (fondos administrables desde el panel admin).
// ============================================================================

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { ProveedorSesion } from './contexto/Sesion';
import { ProveedorImagenes } from './contexto/Imagenes';
import App from './App';
import './estilos.css';

createRoot(document.getElementById('raiz')).render(
  <StrictMode>
    <BrowserRouter>
      <ProveedorSesion>
        <ProveedorImagenes>
          <App />
        </ProveedorImagenes>
      </ProveedorSesion>
    </BrowserRouter>
  </StrictMode>
);
