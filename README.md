# LINHER Move PWA

Aplicación web para la operación logística de LINHER: cotizaciones con rutas, gestión de flota y servicios, auditoría, reportes y respaldos locales/cloud.

## Tabla de contenidos

1. [Contexto de la app](#contexto-de-la-app)
2. [Alcance funcional](#alcance-funcional)
3. [Arquitectura técnica](#arquitectura-técnica)
4. [Stack tecnológico](#stack-tecnológico)
5. [Estructura del repositorio](#estructura-del-repositorio)
6. [Requisitos previos](#requisitos-previos)
7. [Puesta en marcha local](#puesta-en-marcha-local)
8. [Variables de entorno](#variables-de-entorno)
9. [Base de datos y seeds](#base-de-datos-y-seeds)
10. [Scripts de desarrollo y operación](#scripts-de-desarrollo-y-operación)
11. [Despliegue en cPanel + GitHub Actions (/move)](#despliegue-en-cpanel--github-actions-move)
12. [API (visión general)](#api-visión-general)
13. [Respaldos, Dropbox y recuperación](#respaldos-dropbox-y-recuperación)
14. [Saneamiento de base de datos para entrega](#saneamiento-de-base-de-datos-para-entrega)
15. [Convenciones críticas de desarrollo](#convenciones-críticas-de-desarrollo)
16. [Checklist técnico antes de entregar cambios](#checklist-técnico-antes-de-entregar-cambios)
17. [Solución de problemas frecuentes](#solución-de-problemas-frecuentes)
18. [Notas de seguridad](#notas-de-seguridad)
19. [Documentación complementaria](#documentación-complementaria)

## Contexto de la app

`linher_move_pwa` centraliza el flujo operativo de transporte:

- Crear cotizaciones con cálculo de ruta, tiempos y costos.
- Administrar catálogos operativos (flota y servicios).
- Gestionar usuarios, roles y permisos.
- Monitorear actividad mediante auditoría y reportes.
- Proteger continuidad operativa con respaldos locales y sincronización con Dropbox.

## Alcance funcional

Módulos principales del frontend:

- `Dashboard`
- `Nueva Cotización`
- `Historial` y `Detalle de cotización`
- `Flota`
- `Servicios`
- `Usuarios`
- `Auditoría`
- `Respaldos`
- `Reportes`
- `Configuración`

## Arquitectura técnica

Flujo general:

1. Frontend React consume API REST en `http://localhost:3000/api/v1` (local).
2. En producción, Move se publica en `https://linher.com.mx/move` y consume `https://api-move.linher.com.mx/api/v1`.
3. Backend Express aplica autenticación JWT + autorización por rol/permisos.
4. Persistencia en MySQL (`linher_move` por defecto).
5. Integraciones:
   - OpenRouteService (geocoding/ruteo)
   - Dropbox (OAuth + sincronización de respaldos)
6. Archivos subidos (fotos y assets operativos) se sirven desde `/uploads`.

## Stack tecnológico

- Frontend: React 19 + Vite 7
- Backend: Node.js + Express 5
- Base de datos: MySQL (XAMPP local recomendado)
- Estilos: CSS vanilla con tokens semánticos
- Librerías clave:
  - `axios`, `react-router-dom`, `leaflet`, `recharts`
  - `mysql2`, `jsonwebtoken`, `multer`, `node-cron`, `dropbox`

## Estructura del repositorio

```text
linher_move_pwa/
|- frontend/                 # App React + Vite
|  |- src/
|  |  |- components/
|  |  |- pages/
|  |  |- context/
|  |  |- services/
|  |  |- design-tokens.css   # Fuente visual base
|  |  `- index.css           # Estilos globales y utilidades
|  |- public/                # manifest, service-worker y .htaccess para SPA
|  `- .env.example
|- backend/                  # API, servicios y modelos
|  |- src/
|  |  |- controllers/
|  |  |- models/
|  |  |- services/
|  |  |- middleware/
|  |  `- utils/
|  |- scripts/               # Init DB, backups, restore, saneamiento
|  |- uploads/               # Activos operativos (runtime)
|  |- backups/               # Zips de respaldo (runtime)
|  |- .env
|  `- .env.example
|- database/
|  |- init.sql
|  |- seed_core.sql
|  `- seed_demo.sql
|- .cpanel.yml               # Deploy Git en cPanel hacia /public_html/move
|- AGENTS.md                 # Guía operativa y estándares del proyecto
`- README.md
```

## Requisitos previos

- Node.js 20+
- npm 10+
- MySQL local activo (XAMPP o equivalente)
- (Opcional) cuenta Dropbox para respaldo cloud
- (Opcional) API key de OpenRouteService para mapa/ruteo

## Puesta en marcha local

1. Instalar dependencias de frontend y backend:

```bash
npm run install-all
```

2. Crear archivos de entorno desde los ejemplos:

```powershell
Copy-Item backend/.env.example backend/.env
Copy-Item frontend/.env.example frontend/.env.local
```

3. Inicializar base de datos (esquema + seed core):

```bash
cd backend
node scripts/init-db.js
```

4. Levantar frontend + backend desde raíz:

```bash
cd ..
npm run dev
```

5. Validar salud de API:

```text
GET http://localhost:3000/api/v1/health
```

## Variables de entorno

### Backend (`backend/.env`, base sugerida: `backend/.env.example`)

| Variable | Requerida | Ejemplo / default | Uso |
|---|---|---|---|
| `PORT` | No | `3000` | Puerto de API |
| `NODE_ENV` | No | `development` | Perfil de ejecución |
| `DB_HOST` | Sí | `localhost` | Host MySQL |
| `DB_USER` | Sí | `root` | Usuario MySQL |
| `DB_PASS` | No | *(vacío)* | Password MySQL |
| `DB_NAME` | Sí | `linher_move` | Nombre de base |
| `JWT_SECRET` | Sí | `change-this-jwt-secret-32-chars-min` | Firma de access tokens |
| `JWT_REFRESH_SECRET` | Sí | `change-this-refresh-jwt-secret-32-chars-min` | Firma de refresh tokens |
| `FRONTEND_URL` | Sí | `http://localhost:5173` | Origen permitido para CORS (sin path) |
| `FRONTEND_APP_URL` | Sí | `http://localhost:5173` | URL base de la app para redirecciones (puede incluir `/move`) |
| `ORS_API_KEY` | Sí (para mapas) | `...` | OpenRouteService |
| `MYSQLDUMP_PATH` | No | `C:\xampp\mysql\bin\mysqldump.exe` | Generación de respaldos |
| `MYSQL_PATH` | No | `C:\xampp\mysql\bin\mysql.exe` | Restauración de respaldos |
| `DROPBOX_CLIENT_ID` | No* | `...` | OAuth Dropbox |
| `DROPBOX_CLIENT_SECRET` | No* | `...` | OAuth Dropbox |
| `DROPBOX_REDIRECT_URI` | No* | `http://localhost:3000/api/v1/backups/dropbox/callback` | Callback OAuth |
| `REPORT_EXPORT_MAX_ROWS` | No | `200000` | Límite de exportación CSV |

\* Requeridas solo si usarás integración Dropbox.

### Frontend (`frontend/.env` o `frontend/.env.local`, base sugerida: `frontend/.env.example`)

| Variable | Requerida | Ejemplo / default | Uso |
|---|---|---|---|
| `VITE_API_URL` | No | `http://localhost:3000/api/v1` | Base URL API |
| `VITE_BACKEND_URL` | No | `http://localhost:3000` | Base URL backend para assets |
| `VITE_APP_BASE_PATH` | Sí en producción | `/` (local) o `/move/` (prod) | Subruta base de la app |

### Perfiles recomendados

`Local (localhost)`

```dotenv
VITE_API_URL=http://localhost:3000/api/v1
VITE_BACKEND_URL=http://localhost:3000
VITE_APP_BASE_PATH=/
```

`Producción (dominio principal + app en /move)`

```dotenv
VITE_API_URL=https://api-move.linher.com.mx/api/v1
VITE_BACKEND_URL=https://api-move.linher.com.mx
VITE_APP_BASE_PATH=/move/
```

Para backend en producción (mínimo esperado):

```dotenv
FRONTEND_URL=https://linher.com.mx
FRONTEND_APP_URL=https://linher.com.mx/move
DROPBOX_REDIRECT_URI=https://api-move.linher.com.mx/api/v1/backups/dropbox/callback
```

> En esta arquitectura, la API de Move va en `https://api-move.linher.com.mx/api/v1` (no en `/move/api/v1`).
> `/move` es la subruta del frontend, no del backend.
> Esto evita conflicto cuando se publique otra app en `/axis` con su propio backend.

> Ajusta URLs si tu API corre en otro dominio/subdominio.

## Base de datos y seeds

El bootstrap está dividido para separar esquema y datos base:

- `database/init.sql`: estructura de tablas.
- `database/seed_core.sql`: baseline obligatorio (roles, permisos, settings, admin inicial).
- `database/seed_demo.sql`: catálogo demo opcional para pruebas.

Comandos:

```bash
cd backend
node scripts/init-db.js
node scripts/init-db.js --with-demo
```

Credencial inicial incluida en `seed_core.sql`:

- Email: `programador@linher.com.mx`
- Password: `admin123`

Cambiar esta contraseña inmediatamente en cualquier entorno real.

## Scripts de desarrollo y operación

### Raíz

```bash
npm run dev          # frontend + backend en paralelo
npm run install-all
npm run backend
npm run frontend
```

### Frontend (`frontend/`)

```bash
npm run dev
npm run lint
npm run build
npm run preview
```

### Backend (`backend/`)

```bash
npm run dev
npm run start
npm run backup:test-auto
npm run backup:restore
npm run db:dev:sanitize:dry
npm run db:dev:sanitize:apply
npm run db:dev:sanitize:verify
npm run db:release:sanitize:apply
npm run db:release:sanitize:verify
```

Nota: actualmente no hay suite de pruebas automatizadas (`npm test`) configurada en el backend.

## Despliegue en cPanel + GitHub Actions (/move)

Move queda separado en dos endpoints:

- Frontend: `https://linher.com.mx/move` (o dominio de pruebas equivalente)
- Backend API: `https://api-move.linher.com.mx/api/v1` (o subdominio de pruebas)

### Estrategia recomendada (hosting con recursos limitados)

- Frontend: compilar y publicar con GitHub Actions (evitar build en cPanel).
- Backend: actualizar código desde Git en cPanel y reiniciar Node.js App.

Esta estrategia evita errores de memoria al ejecutar `vite build` dentro de cPanel.

### Setup inicial (una sola vez)

1. Clonar el repositorio en `cPanel > Git Version Control`.
2. Crear la app en `cPanel > Setup Node.js App`:
   - Node.js `20.x`
   - `Application root`: `repositories/linher_move_pwa/backend`
   - `Startup file`: `src/server.js`
   - URL: subdominio API del entorno (`api-move-test...` o `api-move...`)
3. Cargar `backend/.env` del entorno en el servidor.
4. Configurar GitHub Actions (repo `linher_move_pwa`):
   - Workflow: `.github/workflows/deploy-frontend-cpanel.yml`
   - Secrets:
     - `CPANEL_FTP_HOST`
     - `CPANEL_FTP_USERNAME`
     - `CPANEL_FTP_PASSWORD`
   - Variables:
     - `VITE_API_URL`
     - `VITE_BACKEND_URL`
     - `VITE_APP_BASE_PATH` (recomendado: `/move/`)
     - `CPANEL_FTP_PROTOCOL` (recomendado: `ftps`)
     - `CPANEL_FTP_PORT` (recomendado: `21`)
     - `CPANEL_FTP_REMOTE_DIR` (según cuenta FTP; típico: `/move/`)
5. Crear una cuenta FTP dedicada para CI y restringir su alcance.
   - Recomendado: home FTP en `public_html` y `CPANEL_FTP_REMOTE_DIR=/move/`.

### Flujo diario de despliegue

#### A) Si cambió solo frontend

1. `git push origin main`.
2. Ejecutar (o esperar) workflow `Deploy Frontend to cPanel` en GitHub Actions.
3. Validar `https://.../move/`.

#### B) Si cambió solo backend

1. `git push origin main`.
2. `cPanel > Git Version Control > Update from Remote`.
3. `cPanel > Setup Node.js App > Restart`.
4. Si cambió `backend/package*.json`, ejecutar `Run NPM Install` antes de reiniciar.
5. Validar `https://.../api/v1/health`.

#### C) Si cambiaron frontend y backend

1. Actualizar backend primero (`Update from Remote` + `Restart`).
2. Desplegar frontend por GitHub Actions.
3. Ejecutar prueba funcional de login y rutas críticas.

### Rol de `.cpanel.yml`

`.cpanel.yml` permanece como soporte de despliegue en cPanel, pero con esta estrategia
el despliegue principal del frontend se hace por GitHub Actions.
Para detalles del flujo CI, ver `docs/ci-frontend-cpanel.md`.

### Ruteo SPA en `/move`

Para soportar recargas directas (`/move/history`, `/move/reports`, etc.) se usa:

- `frontend/public/.htaccess`

Ese archivo se incluye en `dist` durante build y queda publicado en `/move/.htaccess`.

### Errores comunes de cPanel Git

Si cPanel muestra `The system cannot deploy`, revisar:

- existe `.cpanel.yml` válido en la rama actual
- no hay cambios sin commit en el repo del servidor
- log de despliegue:
  - `/home/linhercom/.cpanel/datastore/<repo>/deployment.log`

## API (visión general)

Base URL local: `http://localhost:3000/api/v1`

Base URL producción Move recomendada: `https://api-move.linher.com.mx/api/v1`

Rutas destacadas:

- Públicas:
  - `GET /health`
  - `POST /auth/login`
  - `POST /auth/refresh`
  - `POST /auth/logout`
  - `GET /backups/dropbox/callback`
- Protegidas por token y permisos:
  - `GET /auth/me`
  - `vehicles`, `services`, `settings`, `maps`, `quotations`
  - `users`, `logs`, `dashboard`, `backups`, `reports`

Autorización:

- `requireAuth`
- `requireRole('admin')`
- `requirePermission(...)`
- `requireAnyPermission(...)`

## Respaldos, Dropbox y recuperación

### Respaldo local

Cada respaldo local genera un `.zip` con:

- `database.sql`
- carpeta `uploads/`

Además:

- se registra en tabla `backups`
- retención local: se conservan los 7 más recientes

### Automatización (scheduler)

- El backend evalúa la ejecución diariamente a las `00:00`.
- Settings involucrados en `global_settings`:
  - `backups_enabled` (`true`/`false`)
  - `backup_frequency` (`daily`/`weekly`)
- En modo `weekly`, ejecuta en domingo dentro de la ventana de medianoche.

Prueba manual de scheduler:

```bash
cd backend
node scripts/run-automated-backup.js --force --skip-cloud
```

### Integración Dropbox

Fuente de verdad de conexión OAuth:

- `integration_connections`
- `integration_oauth_states`

Comportamiento:

- sincroniza al terminar respaldo local
- registra eventos de éxito/error en logs
- aplica retención cloud de 7 respaldos

### Restauración de respaldo

Script externo (independiente del estado de la app):

```bash
cd backend
node scripts/restore-backup.js
```

Variantes:

```bash
node scripts/restore-backup.js "C:\ruta\respaldo.zip"
node scripts/restore-backup.js --skip-uploads
node scripts/restore-backup.js --skip-db
node scripts/restore-backup.js --merge-uploads
```

Flujo recomendado:

1. Detener backend.
2. Seleccionar ZIP (local o descargado de Dropbox).
3. Ejecutar `restore-backup.js`.
4. Levantar backend.
5. Validar `GET /api/v1/health`.

## Saneamiento de base de datos para entrega

Modo desarrollo:

```bash
cd backend
npm run db:dev:sanitize:dry
npm run db:dev:sanitize:apply
npm run db:dev:sanitize:verify
```

Modo release (limpieza fuerte + baseline):

```bash
npm run db:release:sanitize:apply
npm run db:release:sanitize:verify
```

Flags avanzados disponibles en `scripts/sanitize-delivery-db.js`:

- `--apply`
- `--verify-only`
- `--clear-catalogs`
- `--clear-non-admin-users`
- `--single-admin`
- `--normalize-core-ids`
- `--skip-core-reseed` (no compatible con `--normalize-core-ids`)

## Convenciones críticas de desarrollo

Estas reglas son obligatorias para mantener consistencia técnica:

- UI: reutilizar patrones y tokens en:
  - `frontend/src/design-tokens.css`
  - `frontend/src/index.css`
  - `frontend/src/components/`
- Accesibilidad: cada control de formulario debe tener `id`, `name` y etiqueta asociada.
- Trazabilidad: peticiones `POST/PUT/DELETE` deben registrar `operator_id`.
- Logging:
  - Backend: usar `SystemLogger`
  - Frontend: usar `clientLogger` (`POST /api/v1/logs/error`)
- Zona horaria oficial del proyecto: `America/Mexico_City`.

## Checklist técnico antes de entregar cambios

1. Validar lint y build de frontend:

```bash
npm run lint --prefix frontend
npm run build --prefix frontend
```

2. Verificar API:

- `GET /api/v1/health`
- flujo principal relacionado con tu cambio

3. Si tocaste respaldos/DB:

- correr script de verificación correspondiente
- revisar registros en tabla `logs`

## Solución de problemas frecuentes

- `CORS_NOT_ALLOWED`:
  - revisa `FRONTEND_URL` en `backend/.env` (solo origen, sin `/move`)
  - verifica que el frontend corra en `http://localhost:5173`
- API responde 404 en producción:
  - confirma que frontend usa `https://api-move.linher.com.mx/api/v1`
  - no uses `https://linher.com.mx/move/api/v1` salvo que configures un proxy explícito
- callback de Dropbox redirige al lugar incorrecto:
  - define `FRONTEND_APP_URL=https://linher.com.mx/move`
  - valida `DROPBOX_REDIRECT_URI=https://api-move.linher.com.mx/api/v1/backups/dropbox/callback`
- `ORS_API_KEY_MISSING`:
  - define `ORS_API_KEY` para funciones de mapa/ruta
- error con `mysqldump` o `mysql`:
  - define `MYSQLDUMP_PATH` / `MYSQL_PATH` con ruta real del binario
- no corre respaldo automático:
  - confirma `backups_enabled=true` y frecuencia válida en `global_settings`
- deploy cPanel falla por `npm`:
  - valida que tu plan tenga Node/npm disponible para tareas de deploy
  - revisa `deployment.log` y ajusta `.cpanel.yml`

## Notas de seguridad

- No usar credenciales por defecto en ambientes reales.
- Rotar `JWT_SECRET` y `JWT_REFRESH_SECRET` por entorno.
- No almacenar tokens OAuth en `global_settings`; usar tablas de integración.
- Evitar exponer secretos en logs, URLs o commits.

## Documentación complementaria

- `AGENTS.md`: estándares operativos y de UI del proyecto.
- `TODO.md`: pendientes técnicos y funcionales.
