# Walkthrough: Move Logistics Application Development

Successfully implemented the full-stack development of the "Move" logistics application. The app is a high-performance PWA designed for LINHER's internal operations.

## Features Implemented

### 1. Database & Models
- **Schema**: Robust MySQL design with 10+ tables covering users, fleet, quotations, and audit logs.
- **ORM-like Base**: Created a central `Model` class for efficient CRUD operations.
- **Folio Generator**: Concurrency-safe nomenclature generator using `LMJR-YYMMDDNNN` format.

### 2. Logistics Calculation Engine
- **Exact Formulas**: Implemented the `CalculationMotor` with factors for maneuvers (1.2), traffic (1.5), and automatic rounding to the nearest 100.
- **Service Integration**: Supports optional costs like interconnection, maintenance, and lodging.

### 3. Interactive Map & Routing
- **Leaflet & ORS**: Integrated Leaflet for the frontend and a secure PHP proxy for OpenRouteService on the backend.
- **Real-time Routing**: Draggable markers and address search (autocomplete) are integrated into the "New Quote" flow.

### 4. Professional Dashboard
- **Role-based KPIs**: Summary cards for pending, in-process, and completed quotes.
- **Activity Summary**: High-level overview of fleet status and recent records.

### 5. PWA & Mobile Ready
- **Manifest & Service Worker**: Configured for standalone installation on iOS and Android.
- **Responsive Layout**: Sidebar + Topbar structure that adapts to different screen sizes.

## Technical Structure
- **Frontend**: React + Vite + Tailwind/Modern CSS + Lucide Icons.
- **Backend**: PHP 8 (Clean REST API architecture) + MySQL.
- **Security**: .env protection, PDO prepared statements, and API key proxying.

## Next Steps for Deployment
1. Import `database/init.sql` into the cPanel MySQL database.
2. Update `backend/core/Config.php` with the live database credentials.
3. Build the frontend (`npm run build`) and upload the `dist` contents to the `public_html` folder.
4. Place the `backend` folder in a secure location (or under `/api/v1/`).
