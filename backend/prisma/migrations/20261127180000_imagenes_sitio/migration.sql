-- CreateEnum
CREATE TYPE "LugarImagen" AS ENUM ('PORTADA', 'INGRESO', 'CANCHA_SIN_FOTO');

-- CreateTable
CREATE TABLE "ImagenSitio" (
    "id" SERIAL NOT NULL,
    "lugar" "LugarImagen" NOT NULL,
    "url" TEXT NOT NULL,
    "titulo" TEXT,
    "credito" TEXT,
    "enlaceCredito" TEXT,
    "orden" INTEGER NOT NULL DEFAULT 0,
    "activa" BOOLEAN NOT NULL DEFAULT true,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ImagenSitio_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ImagenSitio_lugar_activa_orden_idx" ON "ImagenSitio"("lugar", "activa", "orden");

