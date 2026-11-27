// ============================================================================
//  src/App.jsx — mapa de pantallas (React Router)
//
//  Públicas: inicio (buscar), ficha de cancha, ingresar, registro.
//  Con sesión: mis reservas. Solo DUENO: /panel. Solo ADMIN: /admin.
// ============================================================================

import { Route, Routes } from 'react-router-dom';
import Cabecera from './componentes/Cabecera';
import RutaProtegida from './componentes/RutaProtegida';
import { Vacio } from './componentes/Estado';
import Inicio from './paginas/Inicio';
import Cancha from './paginas/Cancha';
import { Ingresar, Registro } from './paginas/Acceso';
import MisReservas from './paginas/MisReservas';
import PanelDueno from './paginas/PanelDueno';
import PanelAdmin from './paginas/PanelAdmin';

export default function App() {
  return (
    <>
      <Cabecera />
      <main>
        <Routes>
          <Route path="/" element={<Inicio />} />
          <Route path="/canchas/:id" element={<Cancha />} />
          <Route path="/ingresar" element={<Ingresar />} />
          <Route path="/registro" element={<Registro />} />
          <Route path="/mis-reservas" element={<RutaProtegida><MisReservas /></RutaProtegida>} />
          <Route path="/panel" element={<RutaProtegida roles={['DUENO']}><PanelDueno /></RutaProtegida>} />
          <Route path="/admin" element={<RutaProtegida roles={['ADMIN']}><PanelAdmin /></RutaProtegida>} />
          <Route path="*" element={<div className="contenedor"><Vacio titulo="Esta página no existe" texto="Vuelve al inicio para buscar canchas." /></div>} />
        </Routes>
      </main>
      <footer className="pie">
        <div className="contenedor">
          tukanchitape · canchitas de Cusco · Mapas © <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> · <a href="https://carto.com/attributions">CARTO</a> · Fotos de ejemplo: Unsplash
        </div>
      </footer>
    </>
  );
}
