-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "Rol" AS ENUM ('JUGADOR', 'DUENO', 'ADMIN');

-- CreateEnum
CREATE TYPE "TipoCancha" AS ENUM ('SINTETICO', 'LOSA', 'GRASS');

-- CreateEnum
CREATE TYPE "EstadoReserva" AS ENUM ('PENDIENTE_PAGO', 'CONFIRMADA', 'CANCELADA', 'EXPIRADA', 'JUGADA');

-- CreateEnum
CREATE TYPE "MetodoPago" AS ENUM ('YAPE', 'PLIN');

-- CreateEnum
CREATE TYPE "EstadoPago" AS ENUM ('PENDIENTE', 'APROBADO', 'RECHAZADO');

-- CreateEnum
CREATE TYPE "MotivoBloqueo" AS ENUM ('LLUVIA', 'MANTENIMIENTO', 'EVENTO', 'OTRO');

-- CreateTable
CREATE TABLE "Usuario" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "telefono" TEXT,
    "passwordHash" TEXT NOT NULL,
    "rol" "Rol" NOT NULL DEFAULT 'JUGADOR',
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Usuario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Cancha" (
    "id" SERIAL NOT NULL,
    "duenoId" INTEGER NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "tipo" "TipoCancha" NOT NULL,
    "formato" INTEGER NOT NULL,
    "techada" BOOLEAN NOT NULL DEFAULT false,
    "conLuz" BOOLEAN NOT NULL DEFAULT false,
    "lat" DOUBLE PRECISION NOT NULL,
    "lng" DOUBLE PRECISION NOT NULL,
    "direccion" TEXT NOT NULL,
    "zona" TEXT,
    "telefono" TEXT,
    "fotos" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "qrPagoUrl" TEXT,
    "publicada" BOOLEAN NOT NULL DEFAULT false,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Cancha_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Tarifa" (
    "id" SERIAL NOT NULL,
    "canchaId" INTEGER NOT NULL,
    "diaSemana" INTEGER NOT NULL,
    "horaInicio" INTEGER NOT NULL,
    "horaFin" INTEGER NOT NULL,
    "precioHora" DECIMAL(8,2) NOT NULL,

    CONSTRAINT "Tarifa_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Bloqueo" (
    "id" SERIAL NOT NULL,
    "canchaId" INTEGER NOT NULL,
    "inicio" TIMESTAMP(3) NOT NULL,
    "fin" TIMESTAMP(3) NOT NULL,
    "motivo" "MotivoBloqueo" NOT NULL DEFAULT 'OTRO',
    "nota" TEXT,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Bloqueo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Reserva" (
    "id" SERIAL NOT NULL,
    "canchaId" INTEGER NOT NULL,
    "jugadorId" INTEGER NOT NULL,
    "inicio" TIMESTAMP(3) NOT NULL,
    "fin" TIMESTAMP(3) NOT NULL,
    "total" DECIMAL(8,2) NOT NULL,
    "adelanto" DECIMAL(8,2) NOT NULL,
    "estado" "EstadoReserva" NOT NULL DEFAULT 'PENDIENTE_PAGO',
    "expiraEn" TIMESTAMP(3),
    "adelantoPerdido" BOOLEAN NOT NULL DEFAULT false,
    "canceladaEn" TIMESTAMP(3),
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Reserva_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Pago" (
    "id" SERIAL NOT NULL,
    "reservaId" INTEGER NOT NULL,
    "metodo" "MetodoPago" NOT NULL,
    "numeroOperacion" TEXT NOT NULL,
    "fotoUrl" TEXT NOT NULL,
    "monto" DECIMAL(8,2) NOT NULL,
    "estado" "EstadoPago" NOT NULL DEFAULT 'PENDIENTE',
    "nota" TEXT,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revisadoEn" TIMESTAMP(3),

    CONSTRAINT "Pago_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Resena" (
    "id" SERIAL NOT NULL,
    "reservaId" INTEGER NOT NULL,
    "estrellas" INTEGER NOT NULL,
    "texto" TEXT,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Resena_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Usuario_email_key" ON "Usuario"("email");

-- CreateIndex
CREATE INDEX "Cancha_publicada_idx" ON "Cancha"("publicada");

-- CreateIndex
CREATE INDEX "Tarifa_canchaId_diaSemana_idx" ON "Tarifa"("canchaId", "diaSemana");

-- CreateIndex
CREATE INDEX "Bloqueo_canchaId_inicio_idx" ON "Bloqueo"("canchaId", "inicio");

-- CreateIndex
CREATE INDEX "Reserva_canchaId_inicio_idx" ON "Reserva"("canchaId", "inicio");

-- CreateIndex
CREATE INDEX "Reserva_jugadorId_idx" ON "Reserva"("jugadorId");

-- CreateIndex
CREATE UNIQUE INDEX "Pago_metodo_numeroOperacion_key" ON "Pago"("metodo", "numeroOperacion");

-- CreateIndex
CREATE UNIQUE INDEX "Resena_reservaId_key" ON "Resena"("reservaId");

-- AddForeignKey
ALTER TABLE "Cancha" ADD CONSTRAINT "Cancha_duenoId_fkey" FOREIGN KEY ("duenoId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tarifa" ADD CONSTRAINT "Tarifa_canchaId_fkey" FOREIGN KEY ("canchaId") REFERENCES "Cancha"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Bloqueo" ADD CONSTRAINT "Bloqueo_canchaId_fkey" FOREIGN KEY ("canchaId") REFERENCES "Cancha"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reserva" ADD CONSTRAINT "Reserva_canchaId_fkey" FOREIGN KEY ("canchaId") REFERENCES "Cancha"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reserva" ADD CONSTRAINT "Reserva_jugadorId_fkey" FOREIGN KEY ("jugadorId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pago" ADD CONSTRAINT "Pago_reservaId_fkey" FOREIGN KEY ("reservaId") REFERENCES "Reserva"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Resena" ADD CONSTRAINT "Resena_reservaId_fkey" FOREIGN KEY ("reservaId") REFERENCES "Reserva"("id") ON DELETE CASCADE ON UPDATE CASCADE;

