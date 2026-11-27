// ============================================================================
//  pruebas/apoyo/entorno.js — se ejecuta antes de cada archivo de prueba
//
//  Fija el entorno de prueba ANTES de que se cargue src/config/env.js: base en
//  memoria, clave JWT fija y reglas con sus valores por defecto, para que los
//  resultados no dependan de lo que tengas en tu .env.
// ============================================================================

process.env.NODE_ENV = 'test';
process.env.JWT_SECRETO = 'clave-solo-para-pruebas';
process.env.MINUTOS_SEPARACION = '15';
process.env.HORAS_CANCELACION = '6';
process.env.PORCENTAJE_ADELANTO = '30';
process.env.HORAS_MAXIMAS_RESERVA = '3';
process.env.DIAS_ANTICIPACION = '30';
process.env.SUPABASE_URL = '';
process.env.SUPABASE_SERVICE_KEY = '';
