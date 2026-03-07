# LINHER Move PWA

Aplicación web para cotizaciones, operación logística, flota, auditoría, respaldos y reportes.

## Stack

- Frontend: React + Vite
- Backend: Node.js + Express
- Base de datos: MySQL
- Estilos: CSS vanilla con design tokens

## Requisitos

- Node.js 20+
- npm 10+
- MySQL local (XAMPP o equivalente)

## Estructura del repositorio

- `frontend/`: aplicación React
- `backend/`: API y lógica de negocio
- `database/`: esquema y seeds

## Instalación inicial

Desde la raíz del proyecto:

```bash
npm run install-all
```

## Variables de entorno

### Backend (`backend/.env`)

```env
PORT=3000
DB_HOST=localhost
DB_NAME=linher_move
DB_USER=root
DB_PASS=
JWT_SECRET="change-this-secret"
MYSQLDUMP_PATH="C:\xampp\mysql\bin\mysqldump.exe"
MYSQL_PATH="C:\xampp\mysql\bin\mysql.exe"
DROPBOX_CLIENT_ID="..."
DROPBOX_CLIENT_SECRET="..."
DROPBOX_REDIRECT_URI="http://localhost:3000/api/v1/backups/dropbox/callback"
FRONTEND_URL="http://localhost:5173"
REPORT_EXPORT_MAX_ROWS=200000
```

### Frontend (`frontend/.env` o `frontend/.env.local`)

```env
VITE_API_URL=http://localhost:3000/api/v1
VITE_BACKEND_URL=http://localhost:3000
```

## Inicialización de base de datos (importante)

El script de bootstrap ahora separa esquema y seeds:

- `database/init.sql`: solo esquema
- `database/seed_core.sql`: seed obligatorio de producción limpia
- `database/seed_demo.sql`: seed opcional para demo/pruebas

Desde `backend/`:

```bash
node scripts/init-db.js
```

Eso ejecuta:

1. `init.sql`
2. `seed_core.sql`

Si quieres cargar también datos demo:

```bash
node scripts/init-db.js --with-demo
```

## Desarrollo

Desde la raíz (frontend + backend en paralelo):

```bash
npm run dev
```

También puedes levantar por separado:

```bash
npm run backend
npm run frontend
```

## Scripts útiles de backend

Desde `backend/`:

```bash
npm run dev
npm run backup:test-auto
npm run backup:restore
```

## Respaldos automáticos

La automatización se configura desde la pantalla de `Respaldos`.

Settings involucrados en `global_settings`:

- `backups_enabled`
- `backup_frequency`

Valores válidos:

- `backups_enabled`: `true` o `false`
- `backup_frequency`: `daily` o `weekly`

## Cómo funciona el scheduler

- El backend ejecuta un cron diario a medianoche.
- Si `backups_enabled = true`, evalúa la frecuencia configurada.
- Si la frecuencia es `daily`, genera respaldo todos los días.
- Si la frecuencia es `weekly`, genera respaldo solo los domingos a medianoche.

La ejecución automática usa la misma lógica operativa que el respaldo manual.

## Qué incluye un respaldo

Cada respaldo local genera un `.zip` con:

- `database.sql`
- carpeta `uploads/`

Después:

- se registra en la tabla `backups`
- se conservan los 7 respaldos locales más recientes
- si Dropbox está conectado, se intenta sincronizar el mismo `.zip`
- Dropbox también conserva los 7 respaldos cloud más recientes

## Probar automatización sin esperar medianoche

Desde `backend/`:

```bash
node scripts/run-automated-backup.js --force --skip-cloud
```

Notas:

- `--force`: ejecuta la lógica aunque no sea medianoche
- `--skip-cloud`: evita sincronización con Dropbox para una prueba local segura

Si quieres solo validar si el cron correría o no, sin forzar:

```bash
npm run backup:test-auto
```

Respuesta esperada fuera de horario:

- `executed: false`
- `reason: "not_due"`

## Dropbox

La integración usa:

- `integration_connections`
- `integration_oauth_states`

Requisitos:

- la app de Dropbox debe tener registrada la callback exacta
- la conexión se realiza desde la pantalla `Respaldos`
- los respaldos cloud se disparan después del respaldo local

Eventos relevantes:

- `BACKUP_CREATED`
- `BACKUP_SYNC_SUCCESS`
- `DROPBOX_SYNC_ERROR`
- `DROPBOX_RETENTION_ERROR`

## Restauración de respaldos

La restauración no debe depender de que la app web esté funcional.

Por eso existe un script externo de recuperación:

```bash
node scripts/restore-backup.js
```

Comportamiento por defecto:

- toma el `.zip` más reciente de `backend/backups/`
- restaura `database.sql`
- restaura `uploads/`
- reaplica el esquema operativo actual para no perder ajustes recientes

### Restaurar un zip específico

```bash
node scripts/restore-backup.js "C:\ruta\respaldo.zip"
```

### Restaurar sin tocar uploads

```bash
node scripts/restore-backup.js --skip-uploads
```

### Restaurar sin tocar base de datos

```bash
node scripts/restore-backup.js --skip-db
```

### Restaurar fusionando uploads en vez de reemplazarlos

```bash
node scripts/restore-backup.js --merge-uploads
```

## Flujo recomendado de recuperación

1. Detener backend.
2. Conseguir el `.zip` local o descargarlo manualmente desde Dropbox.
3. Ejecutar `restore-backup.js`.
4. Levantar backend.
5. Validar `GET /api/v1/health`.
6. Validar `GET /api/v1/backups/summary`.

## Limitación importante

Si se pierde completamente la base de datos, la app no puede depender de ella para recuperar por sí sola los tokens de Dropbox, porque esos tokens viven en la propia DB.

En un escenario de desastre total, la recuperación correcta es:

- descargar manualmente el respaldo desde Dropbox
- restaurar con el script externo
