// Rutas de la aplicación. Cada pantalla vive en src/pages.
import { Routes, Route } from 'react-router-dom';
import Inicio from './pages/Inicio';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Inicio />} />
      {/* Hito 3: /ingresar, /local/:id, /reservar, /panel, /panel/cobros, /admin */}
    </Routes>
  );
}
