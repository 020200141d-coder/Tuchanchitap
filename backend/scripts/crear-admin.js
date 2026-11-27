// ============================================================================
//  scripts/crear-admin.js — crea (o asciende) la primera cuenta ADMIN
//
//  ¿Para qué?  En producción la base empieza vacía y nadie puede entrar al
//  panel admin. Este script se corre UNA vez desde tu PC (o desde la Shell de
//  Render) con la base de Supabase configurada en DATABASE_URL.
//
//  Uso (PowerShell, la contraseña va por variable de entorno, nunca en el
//  comando ni en el repositorio):
//    $env:ADMIN_PASSWORD = "una-clave-larga"
//    npm run crear-admin -- correo@ejemplo.com "Nombre Apellido"
//
//  Si el correo ya existe, lo convierte en ADMIN y actualiza su contraseña.
// ============================================================================

import dotenv from 'dotenv';
dotenv.config({ quiet: true });
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';

async function main() {
  const [email, nombre = 'Administración'] = process.argv.slice(2);
  const password = process.env.ADMIN_PASSWORD;
  if (!email || !/^\S+@\S+\.\S+$/.test(email)) throw new Error('Indica el correo: npm run crear-admin -- correo@ejemplo.com "Nombre"');
  if (!password || password.length < 8) throw new Error('Define ADMIN_PASSWORD (mínimo 8 caracteres) antes de correr el script');

  const db = new PrismaClient();
  try {
    const passwordHash = await bcrypt.hash(password, 10);
    const correo = email.trim().toLowerCase();
    const usuario = await db.usuario.upsert({
      where: { email: correo },
      update: { rol: 'ADMIN', activo: true, passwordHash },
      create: { email: correo, nombre, rol: 'ADMIN', passwordHash }
    });
    console.log(`Listo: ${usuario.email} es ADMIN (id ${usuario.id}).`);
  } finally {
    await db.$disconnect();
  }
}

main().catch(err => {
  console.error(err.message);
  process.exit(1);
});
