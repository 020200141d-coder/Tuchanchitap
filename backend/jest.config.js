// ============================================================================
//  jest.config.js — configuración de las pruebas (Jest + Supertest)
//
//  • Las pruebas viven en pruebas/ con extensión .spec.js.
//  • pruebas/apoyo/entorno.js fija NODE_ENV=test antes de cargar nada, así
//    src/db usa la base en memoria aunque tu .env tenga DATABASE_URL.
//  • La cobertura (npm run cobertura) se mide sobre las capas con reglas:
//    servicios, validadores y lib. La meta del curso es ≥70 % en servicios.
// ============================================================================

module.exports = {
  testEnvironment: 'node',
  testMatch: ['<rootDir>/pruebas/**/*.spec.js'],
  setupFiles: ['<rootDir>/pruebas/apoyo/entorno.js'],
  collectCoverageFrom: ['src/servicios/**/*.js', 'src/validadores/**/*.js', 'src/lib/**/*.js'],
  coverageThreshold: {
    './src/servicios/': { statements: 70, branches: 60, functions: 70, lines: 70 }
  },
  clearMocks: true
};
