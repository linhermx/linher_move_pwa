# CI para Frontend (GitHub Actions -> cPanel)

Este flujo compila `frontend` en GitHub Actions y publica `frontend/dist` en cPanel, para evitar builds locales y evitar fallas por memoria en `Deploy HEAD Commit`.

## 1) Archivos

- Workflow: `.github/workflows/deploy-frontend-cpanel.yml`
- Destino de publicación: `public_html/move` (configurable)

## 2) Secrets (GitHub -> Settings -> Secrets and variables -> Actions -> Secrets)

Crear estos secrets:

- `CPANEL_FTP_HOST`
- `CPANEL_FTP_USERNAME`
- `CPANEL_FTP_PASSWORD`

## 3) Variables (GitHub -> Settings -> Secrets and variables -> Actions -> Variables)

Variables requeridas:

- `VITE_API_URL` (ej. `https://api-move.linher.com.mx/api/v1` o test URL)
- `VITE_BACKEND_URL` (ej. `https://api-move.linher.com.mx`)

Variables opcionales:

- `VITE_APP_BASE_PATH` (default de Vite en producción: `/move/`)
- `CPANEL_FTP_PROTOCOL` (`ftps` recomendado, default: `ftps`)
- `CPANEL_FTP_PORT` (default: `21`)
- `CPANEL_FTP_REMOTE_DIR` (default: `/public_html/move/`)

## 4) Disparadores del workflow

- `push` a `main` con cambios en `frontend/**`
- `workflow_dispatch` (manual)

## 5) Flujo operativo recomendado

1. Hacer cambios en frontend.
2. `git push origin main`.
3. Esperar a que termine `Deploy Frontend to cPanel` en GitHub Actions.
4. Validar en navegador `https://linher.com.mx/move/` (o entorno de prueba).

## 6) Backend

Este workflow no reemplaza el despliegue de backend.
El backend se sigue manejando por flujo Node.js App/cPanel del servidor correspondiente.
