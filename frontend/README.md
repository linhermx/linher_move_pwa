# Frontend - LINHER Move PWA

Aplicacion React + Vite para operacion diaria de cotizaciones, flota, respaldos y reportes.

## Requisitos

- Node.js 20+
- npm 10+
- Backend de `linher_move_pwa` ejecutandose en local

## Instalacion

Desde la carpeta `frontend/`:

```bash
npm install
```

## Variables de entorno

Crear `frontend/.env` (o `.env.local`) con:

```env
VITE_API_URL=http://localhost:3000/api/v1
VITE_BACKEND_URL=http://localhost:3000
```

Si `VITE_BACKEND_URL` no se define, se infiere desde `VITE_API_URL`.

## Scripts disponibles

```bash
npm run dev      # desarrollo local (Vite)
npm run lint     # analisis estatico con ESLint
npm run build    # build de produccion
npm run preview  # levantar build local
```

## Estructura base

- `src/pages/`: pantallas por modulo
- `src/components/`: componentes reutilizables del sistema UI
- `src/services/`: cliente HTTP, logger, PWA y servicios de integracion
- `src/context/`: estado global (tema, sesion, etc.)
- `src/design-tokens.css`: tokens de diseno (fuente visual)
- `src/index.css`: estilos globales y clases del sistema

## Convenciones del proyecto

- Texto visible al usuario final en espanol.
- Modo dark/light controlado por `data-theme`.
- Evitar estilos inline para layout/colores/tipografia; reutilizar clases existentes.
- Preferir componentes del sistema (`PageHeader`, `ModalShell`, `Alert`, `NotificationToast`, etc.).
- Todo control de formulario debe incluir `id`, `name` y etiqueta asociada.
