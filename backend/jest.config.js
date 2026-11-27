// ============================================================================
//  jest.config.js — configuración de las pruebas (Jest + Supertest)
//
//  • Las pruebas viven en pruebas/ con extensión .spec.js.
//  • pruebas/apoyo/entorno.js fija NODE_ENV=test antes de cargar nada, así
//    src/config/database.js usa la base en memoria aunque tu .env tenga DATABASE_URL.
//  • Corre en modo módulos ES ("type": "module"): por eso los scripts usan
//    node --experimental-vm-modules.
//  • La cobertura (npm run cobertura) se mide sobre los servicios y esquemas
//    de cada módulo y las utilidades. La meta del curso es ≥70 % en servicios.
// ============================================================================

export default {
  testEnvironment: 'node',
  transform: {}, // módulos ES nativos: sin Babel
  testMatch: ['<rootDir>/pruebas/**/*.spec.js'],
  setupFiles: ['<rootDir>/pruebas/apoyo/entorno.js'],
  collectCoverageFrom: ['src/modules/**/*.service.js', 'src/modules/**/*.schema.js', 'src/utils/**/*.js'],
  coverageThreshold: {
    './src/modules/': { statements: 70, branches: 60, functions: 70, lines: 70 }
  },
  clearMocks: true
};
