# Tuchanchitap

Plataforma web de reservas de canchas sintéticas en Cusco.
Proyecto Integrador – Plataformas para el Desarrollo de Aplicaciones (UAC, 2026).

## Integrantes

| Integrante | Módulos |
|---|---|
| Aguirre Bravo, Edson Francisco Lino | Usuarios y autenticación · Locales y canchas |
| Estudiante 2 | Reservas |
| Estudiante 3 | Pagos · Reportes |

## Descripción

Los jugadores encuentran canchas en un mapa, ven la disponibilidad por hora y reservan con pago en línea (Yape o tarjeta, en modo de prueba).
Los dueños de los locales administran sus canchas, tarifas, horarios y reservas sin riesgo de cruces de horario.

## Tecnologías

| Parte | Tecnología |
|---|---|
| Frontend | React + JavaScript (Vite), Axios, Leaflet + OpenStreetMap |
| Backend | Node.js + Express, Zod, JWT, bcrypt |
| Base de datos | PostgreSQL (Supabase) con Prisma |
| Pagos | Mercado Pago (modo de prueba) |
| Documentación | Swagger / OpenAPI en `/api/docs` |
| Pruebas | Postman, Jest y Supertest |
| Despliegue | Render |

## Estructura

```
tuchanchitap/
├── docs/          propuesta, evidencias del Hito 1 y diagramas
├── backend/       API REST (Express + Prisma)
│   ├── prisma/schema.prisma
│   └── src/
│       ├── config/
│       ├── middlewares/
│       └── modules/   usuarios, locales, reservas, pagos, reportes
└── frontend/      aplicación React
    └── src/       api, components, pages, context, routes
```

Cada módulo del backend tiene: `*.routes.js` → `*.controller.js` → `*.service.js` → `*.repository.js`, y sus esquemas Zod en `*.schema.js`.

## Instalación

Requisitos: Node.js 20 o superior y Git.

```bash
git clone https://github.com/020200141d-coder/Tuchanchitap.git
cd Tuchanchitap
```

### Backend

```bash
cd backend
npm install
cp .env.example .env      # completar con tus propios valores
npx prisma migrate dev --name inicial
# luego ejecutar prisma/sql/reserva_sin_cruce.sql en la base de datos (evita reservas cruzadas)
npm run dev               # http://localhost:3000
```

### Frontend

```bash
cd frontend
npm install
npm run dev               # http://localhost:5173
```

## Variables de entorno (backend/.env.example)

```
PORT=3000
DATABASE_URL=
JWT_SECRET=
JWT_EXPIRES_IN=1d
GOOGLE_CLIENT_ID=
MP_ACCESS_TOKEN=
FRONTEND_URL=http://localhost:5173
```

El archivo `.env` no se sube al repositorio.

## Forma de trabajo

- Rama principal: `master`.
- Cada módulo se trabaja en su rama (`feature/usuarios`, `feature/reservas`, ...) y se une a `master` con un pull request.
- Mensajes de commit cortos y en español: `feat: registro de usuarios`, `fix: validación de horario`.

## Documentación

- [Propuesta del proyecto](docs/Propuesta_Proyecto.docx)
- [Evidencias del Hito 1](docs/Hito1_Evidencias.docx)
- [Diagrama entidad-relación](docs/diagramas/entidad-relacion.png)
- [Arquitectura del sistema](docs/diagramas/arquitectura.png)

Los diagramas se generan desde los archivos `.dot` con Graphviz: `dot -Tpng entidad-relacion.dot -o entidad-relacion.png`.

## Estado del proyecto

| Hito | Estado |
|---|---|
| Hito 1 – Requerimientos, modelo de datos y arquitectura | Completo |
| Hito 2 – Backend y base de datos | Pendiente |
| Hito 3 – Frontend e integración | Pendiente |
| Hito 4 – Pruebas y despliegue | Pendiente |
