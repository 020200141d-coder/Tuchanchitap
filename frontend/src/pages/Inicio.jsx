// Pantalla inicial temporal: comprueba la conexión con la API (/api/salud).
import { useEffect, useState } from 'react';
import cliente from '../api/cliente';

export default function Inicio() {
  const [estado, setEstado] = useState('comprobando...');

  useEffect(() => {
    cliente.get('/salud')
      .then((r) => setEstado(r.data.estado))
      .catch(() => setEstado('sin conexión con la API'));
  }, []);

  return (
    <main style={{ fontFamily: 'sans-serif', padding: 24 }}>
      <h1>Tuchanchitap</h1>
      <p>Reserva tu cancha sintética en Cusco.</p>
      <p>Estado de la API: <b>{estado}</b></p>
    </main>
  );
}
