-- CreateTable
CREATE TABLE "Anuncio" (
    "id" SERIAL NOT NULL,
    "anunciante" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "texto" TEXT NOT NULL,
    "enlace" TEXT,
    "imagenUrl" TEXT,
    "zona" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "desde" TIMESTAMP(3) NOT NULL,
    "hasta" TIMESTAMP(3) NOT NULL,
    "impresiones" INTEGER NOT NULL DEFAULT 0,
    "clics" INTEGER NOT NULL DEFAULT 0,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Anuncio_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Anuncio_activo_desde_hasta_idx" ON "Anuncio"("activo", "desde", "hasta");

