# AGENTS.md

## Propósito
Este archivo define el contrato operativo para cualquier IA que trabaje en `linher_move_pwa`.
La prioridad es mantener consistencia visual, accesibilidad, trazabilidad y escalabilidad sin reinventar componentes ni estilos.

## Stack y estructura
- Frontend: React + Vite.
- Backend: Node.js + Express.
- Base de datos: MySQL local en XAMPP.
- Estilos: CSS vanilla con tokens semánticos y clases reutilizables.
- Fuente de verdad visual:
  - `frontend/src/design-tokens.css`
  - `frontend/src/index.css`

## Reglas de trabajo obligatorias
- Leer con cuidado toda la petición del usuario y cubrir todos sus puntos.
- No modificar fuera del alcance solicitado.
- Si el usuario pide solo UI/CSS, no alterar lógica de negocio.
- Si el usuario pide una corrección funcional que toca UI por accesibilidad o comportamiento esperado, sí puede ajustarse la UI mínima necesaria.
- No hacer commits salvo que el usuario lo pida explícitamente.
- Si se hace commit por petición del usuario:
  - el mensaje debe estar en inglés
  - usar prefijos como `Fix:`, `Feat:`, `Refactor:`, `Audit:`

## Idioma
- Todo texto visible para el usuario final debe estar en español.
- Código, nombres internos y comentarios deben estar en inglés.
- No escribir comentarios en español dentro del código fuente.

## Sistema UI: reglas base

### Fuente de verdad
- Antes de crear clases nuevas, revisar primero:
  - `frontend/src/design-tokens.css`
  - `frontend/src/index.css`
  - `frontend/src/components/`
- Está prohibido reinventar patrones visuales que ya existan.

### Tema
- El proyecto opera con `data-theme="dark|light"`.
- No hardcodear colores en JSX (`#fff`, `#161616`, `rgba(...)`, etc.) salvo valores realmente dinámicos en runtime.
- El modo dark es el default.
- El modo light debe verse suave y descansado, no blanco puro.

### Inline CSS
- `style={{ ... }}` está prohibido para:
  - color
  - spacing
  - tipografía
  - layout estático
  - borders
  - hover/focus/active
  - sombras
  - estados visuales
- Solo se permite para valores estrictamente dinámicos de runtime:
  - coordenadas
  - transforms calculados
  - dimensiones de mapas/charts
  - posicionamiento derivado de datos

### Tipografía
- Usar medidas relativas (`rem`, `em`) para tamaños tipográficos.
- Evitar `px` en tamaños de texto salvo casos muy justificados.
- Cabeceras de pantalla: usar el estándar de `PageHeader`.
- Mantener consistencia de peso, espaciado y subtítulos muted.

### Layout
- Usar `page-shell` como contenedor estándar de pantallas.
- `NewQuote` es una excepción válida de tipo workspace y debe usar `page-shell page-shell--workspace`.
- Mantener landmarks semánticos cuando aplique:
  - `aside`
  - `nav`
  - `main`
  - `section`
  - `article`
  - `header`
  - `footer`

## Componentes reutilizables obligatorios
Antes de crear algo nuevo, revisar y preferir:
- `PageHeader`
- `ModalShell`
- `StatusBadge`
- `Alert`
- `NotificationToast`
- `CustomSelect`
- `CustomMenu`
- `ConfirmModal`
- `Pagination`
- `ThemeToggle`
- `StatusView`

## Cabeceras de pantalla
- Usar `PageHeader` para la cabecera principal de cada vista.
- No crear `h1` manuales aislados si la vista ya cabe en `PageHeader`.
- El patrón estándar es:
  - título principal
  - subtítulo muted
  - acciones a la derecha si la pantalla las requiere
- Las vistas de detalle también deben apoyarse en `PageHeader` cuando sea posible.

## Formularios y accesibilidad

### Regla obligatoria
Todo `input`, `textarea` o control tipo select debe tener:
- `id`
- `name`
- etiqueta asociada

### Etiquetas
- Si el campo tiene label visible, usar `label` con `htmlFor`.
- Si el diseño no muestra label visible, usar `label` con clase `sr-only` o un `aria-label` claro.
- No usar `label` como texto decorativo para datos estáticos. En esos casos usar `span`, `p` o `strong`.

### Inputs y selects
- Usar `.form-field` para inputs estándar.
- Usar `.form-field-group` para campos con icono.
- Usar `.form-select-container` alrededor de `CustomSelect`.
- `CustomSelect` debe recibir `id`, `name` y `ariaLabel` cuando no tenga label visible.

### Estándar visual de controles
- Alto estándar: `42px`.
- Labels:
  - clase `.form-label`
  - uppercase
  - tamaño pequeño
  - color muted
- Focus:
  - borde rojo
  - `box-shadow` del sistema

### Campos de archivo
- Los `input type="file"` también deben tener `id`, `name` y `aria-label`.

### Filtros
- Los filtros también son formulario.
- Search bars y date pickers deben cumplir accesibilidad igual que cualquier otro campo:
  - `id`
  - `name`
  - label asociada visible o `sr-only`

## Modales, menús y overlays

### Modales
- Todo modal nuevo o refactorizado debe usar `ModalShell` o el patrón accesible equivalente.
- Debe incluir:
  - `role="dialog"`
  - `aria-modal="true"`
  - `aria-labelledby`
  - `aria-describedby` cuando aplique
  - foco inicial razonable
  - cierre con `Escape`
  - cierre por click en backdrop

### Menús, popovers y speed dials
- Todo menú flotante debe cerrarse con:
  - click fuera
  - `Escape`
- Si un trigger puede abrir y cerrar, el icono debe reflejar el estado actual.
- No depender solo de `hover` para interacciones críticas.

## Botones
- Clase base: `.btn`
- Altura estándar: `42px`
- Tipografía estándar:
  - `0.875rem`
  - peso `600`
- No forzar mayúsculas.

### Variantes
- Primario: `.btn.btn-primary`
  - fondo rojo del sistema
  - texto blanco
- Secundario: `.btn.btn-secondary`
  - fondo o borde neutral del sistema
- Ghost: `.btn.btn-ghost`
  - para acciones discretas
- Icon button: `.icon-button` o variante equivalente del sistema

### Regla crítica
- Un botón rojo nunca debe llevar texto negro.
- Si se detecta, se considera desviación del sistema UI.

## Tablas y DataTable
- Usar marcado semántico:
  - `<table>`
  - `<caption>`
  - `<thead>`
  - `<tbody>`
  - `scope="col"`
- Reutilizar clases del sistema:
  - `.table`
  - `.table-shell`
  - `.table__empty`
  - `.table__entity`
  - footer/paginación del sistema
- No construir grillas visuales nuevas si la información es tabular.
- El footer de tabla debe mantener la composición estándar:
  - bloque de “Mostrar” a la izquierda
  - total a la derecha

## Sidebar y navegación
- El sidebar debe mantener consistencia en ambos estados:
  - expandido
  - colapsado
- El botón de contraer/expandir debe quedar centrado sobre el borde entre sidebar y contenido.
- Los menús del perfil deben:
  - cerrarse con click fuera
  - cerrarse con `Escape`
  - mostrar iconografía consistente con el estado abierto/cerrado

## Nueva Cotización: reglas especiales
- Es una vista workspace, no una pantalla administrativa convencional.
- Debe conservar:
  - layout tipo panel + mapa
  - padding y shell coherentes con el sistema
  - FAB/speed dial accesible
- El speed dial debe abrir por click, no depender solo de hover.
- Acciones actuales válidas:
  - `Guardar como pendiente`
  - `Nueva cotización`
- Al reiniciar una cotización:
  - no recargar la página
  - limpiar ruta, resumen y desglose
  - limpiar la capa de ruta del mapa
  - evitar toasts innecesarios
  - conservar el origen default si existe en settings

## Feedback y notificaciones
- `NotificationToast`:
  - para confirmaciones efímeras o errores generales no bloqueantes
- `Alert`:
  - para mensajes persistentes dentro del flujo de la vista o formulario
- No fabricar alertas manuales con `div` e inline styles si ya existe `Alert`.

## Perfil de usuario
- El usuario solo puede editar:
  - nombre
  - foto
  - contraseña
- Email, rol y estatus son de solo lectura en perfil.
- Después de actualizar perfil:
  - actualizar `localStorage`/`sessionStorage` según corresponda
  - reflejar el cambio en sidebar sin requerir recarga manual

## Imágenes
- Fotos de usuario: `backend/uploads/users/`
- Base URL local de imágenes en frontend: `http://localhost:3000/`

## Auditoría, logs y trazabilidad

### operator_id
- Todas las peticiones `POST`, `PUT` y `DELETE` deben registrar autor.
- El frontend inyecta `operator_id` desde el interceptor de Axios.
- En backend usar `req.body.operator_id` o `req.query.operator_id` para registrar logs.
- No dejar el autor como `NULL` o `"Sistema"` cuando la acción venga de una persona.

### Error logging
- Backend:
  - usar `SystemLogger.error(...)` o helper equivalente
  - no dejar errores solo en `console.error`
- Frontend:
  - usar `clientLogger`
  - reportar a `POST /api/v1/logs/error`
- Sanitizar siempre:
  - `password`
  - `access_token`
  - `refresh_token`
  - `authorization`
  - `cookie`
  - secretos

## Dropbox y backups
- Dropbox debe persistirse en tablas dedicadas:
  - `integration_connections`
  - `integration_oauth_states`
- No guardar nuevos tokens OAuth en `global_settings`.
- El flujo OAuth debe validar `state` y asociarlo con `operator_id`.
- Variables obligatorias:
  - `DROPBOX_CLIENT_ID`
  - `DROPBOX_CLIENT_SECRET`
  - `DROPBOX_REDIRECT_URI`
  - `FRONTEND_URL`
- El tipo de backup de Dropbox es `dropbox`.
- Conexión, desconexión, sync y errores deben quedar en logs.

## Backend: patrones de arquitectura
- Nuevos modelos deben heredar de `BaseModel.js` cuando aplique.
- Los controladores siguen patrón factory:
  - `export const SomethingController = (db) => { ... }`
- Para mapas e integraciones con OpenRouteService usar el servicio centralizado correspondiente, no llamadas directas dispersas.

## Base de datos
- Todo esquema nuevo debe cumplir 3FN por defecto.
- No usar JSON como sustituto de modelado relacional salvo logs estáticos sin necesidad de consulta relacional.

## Seguridad
- No exponer contraseñas en URLs.
- Mantener la transmisión segura de credenciales.
- Aunque el cliente actual maneje ciertas contraseñas en texto plano en DB por compatibilidad, no ampliar ni empeorar ese patrón.

## Fechas y zona horaria
- Zona oficial del proyecto: `America/Mexico_City`.
- No asumir UTC.
- En DB se usa hora local del servidor.
- En frontend:
  - fecha corta: `toLocaleDateString('es-MX', ...)`
  - fecha y hora: `toLocaleString('es-MX', ...)` o helper existente
- Al parsear fechas tipo `YYYY-MM-DD`, evitar `new Date(row.fecha)` sin hora auxiliar.

## Estructura de sesión
- La sesión usa la clave `user` en `localStorage` o `sessionStorage`.
- Estructura esperada:
```json
{
  "id": 1,
  "name": "Joel Rosas",
  "email": "correo@gmail.com",
  "photo_path": "uploads/users/archivo.jpg",
  "role_name": "ADMIN",
  "permissions": ["create_quotation", "manage_fleet"]
}
```

## Checklist obligatorio antes de cerrar una tarea UI
- Revisar si ya existe componente reusable.
- Revisar `design-tokens.css` e `index.css`.
- Confirmar compatibilidad dark/light.
- Confirmar semántica HTML y accesibilidad base.
- Confirmar que cada control de formulario tenga `id`, `name` y label asociada.
- Confirmar que modales/menús cierren con `Escape` si aplica.
- Confirmar que no se hayan introducido colores hardcodeados en JSX.
- Confirmar que no se hayan metido inline styles no justificados.
- Ejecutar al menos:
  - `npm run lint`
  - `npm run build`

## Criterio final
Si una IA duda entre crear algo nuevo o reutilizar, debe reutilizar.
Si una IA duda entre resolver rápido o mantener consistencia del sistema, debe mantener consistencia del sistema.
