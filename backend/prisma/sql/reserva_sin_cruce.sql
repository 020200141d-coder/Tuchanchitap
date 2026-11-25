-- RN01: una cancha no puede tener dos reservas activas que se crucen.
-- Se ejecuta una vez después de la primera migración de Prisma.
-- Si dos jugadores reservan la misma hora a la vez, PostgreSQL solo acepta la primera.
CREATE EXTENSION IF NOT EXISTS btree_gist;

ALTER TABLE reserva ADD CONSTRAINT reserva_sin_cruce
  EXCLUDE USING gist (cancha_id WITH =, tsrange(inicio, fin) WITH &&)
  WHERE (estado IN ('PENDIENTE_PAGO', 'CONFIRMADA'));
