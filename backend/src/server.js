import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import pool from './config/db.js';
import {
    VehicleController,
    SettingsController,
    MapsController,
    QuotationController,
    ServiceController,
    AuthController,
    UserController,
    LogController,
    DashboardController,
    BackupController
} from './controllers/Controllers.js';
import { ReportsController } from './controllers/ReportsController.js';
import { OnboardingStateController } from './controllers/OnboardingController.js';
import { BackupService } from './services/BackupService.js';
import { BackupSchedulerService } from './services/BackupSchedulerService.js';
import nodeCron from 'node-cron';
import { UserModel } from './models/UserModel.js';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { SystemLogger } from './utils/Logger.js';
import { ensureOperationalSchema } from './utils/SchemaManager.js';
import { requestContextMiddleware, logRuntimeError } from './utils/RequestContext.js';
import { AuthMiddleware } from './middleware/AuthMiddleware.js';
import { validateAuthConfig } from './utils/AuthToken.js';

dotenv.config();
validateAuthConfig();

const app = express();
const PORT = process.env.PORT || 3000;
const logger = new SystemLogger(pool);
const toOrigin = (urlValue) => {
    if (!urlValue) {
        return null;
    }

    try {
        return new URL(urlValue).origin;
    } catch {
        return String(urlValue).replace(/\/+$/, '');
    }
};

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const frontendOrigin = toOrigin(process.env.FRONTEND_URL || process.env.FRONTEND_APP_URL);
const localDevOriginPattern = /^https?:\/\/(localhost|127\.0\.0\.1):517\d$/;
const allowedOrigins = [
    frontendOrigin,
    'http://localhost:5173',
    'http://127.0.0.1:5173'
].filter(Boolean);

// Multer configuration
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const entity = req.body.entity || 'general';
        const uploadDir = path.join(__dirname, `../uploads/${entity}`);
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});
const upload = multer({ storage: storage });

app.use(cors({
    origin(origin, callback) {
        if (!origin || allowedOrigins.includes(origin) || localDevOriginPattern.test(origin)) {
            callback(null, true);
            return;
        }

        callback(new Error('CORS_NOT_ALLOWED'));
    },
    credentials: true
}));
app.use(express.json());
app.use(requestContextMiddleware);
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Routes
const v1 = express.Router();

// Health check
v1.get('/health', (req, res) => res.json({ status: "ok", message: "Move Node API is running." }));

// Instances
const vehicleCtrl = VehicleController(pool);
const settingsCtrl = SettingsController(pool);
const mapsCtrl = MapsController();
const quotationCtrl = QuotationController(pool);
const serviceCtrl = ServiceController(pool);
const authCtrl = AuthController(pool);
const userCtrl = UserController(pool);
const logCtrl = LogController(pool);
const dashCtrl = DashboardController(pool);
const backupCtrl = BackupController(pool);
const reportCtrl = ReportsController(pool);
const onboardingCtrl = OnboardingStateController(pool);
const authz = AuthMiddleware(pool);
const {
    requireAuth,
    requireRole,
    requirePermission,
    requireAnyPermission
} = authz;

// Auth
v1.post('/auth/login', authCtrl.login);
v1.post('/auth/refresh', authCtrl.refresh);
v1.post('/auth/logout', authCtrl.logout);
v1.get('/auth/me', requireAuth, authCtrl.me);


// Vehicles
v1.get('/vehicles/catalog', requireAuth, requireAnyPermission(['manage_fleet', 'create_quotation', 'view_history']), vehicleCtrl.catalog);
v1.get('/vehicles', requireAuth, requirePermission('manage_fleet'), vehicleCtrl.list);
v1.get('/vehicles/:id', requireAuth, requirePermission('manage_fleet'), vehicleCtrl.show);
v1.post('/vehicles', requireAuth, requirePermission('manage_fleet'), upload.single('photo'), vehicleCtrl.create);
v1.put('/vehicles/:id', requireAuth, requirePermission('manage_fleet'), upload.single('photo'), vehicleCtrl.update);
v1.delete('/vehicles/:id', requireAuth, requirePermission('manage_fleet'), vehicleCtrl.delete);

// Services
v1.get('/services/catalog', requireAuth, requireAnyPermission(['manage_services', 'create_quotation', 'view_history']), serviceCtrl.catalog);
v1.get('/services', requireAuth, requirePermission('manage_services'), serviceCtrl.list);
v1.get('/services/:id', requireAuth, requirePermission('manage_services'), serviceCtrl.show);
v1.post('/services', requireAuth, requirePermission('manage_services'), serviceCtrl.create);
v1.put('/services/:id', requireAuth, requirePermission('manage_services'), serviceCtrl.update);
v1.delete('/services/:id', requireAuth, requirePermission('manage_services'), serviceCtrl.delete);

// Settings
v1.get('/settings/public', requireAuth, settingsCtrl.publicSettings);
v1.get('/settings', requireAuth, requirePermission('edit_settings'), settingsCtrl.index);
v1.post('/settings', requireAuth, requirePermission('edit_settings'), settingsCtrl.update);

// Maps
v1.get('/maps/autocomplete', requireAuth, requireAnyPermission(['create_quotation', 'view_history', 'edit_settings']), mapsCtrl.autocomplete);
v1.get('/maps/reverse', requireAuth, requireAnyPermission(['create_quotation', 'view_history', 'edit_settings']), mapsCtrl.reverse);
v1.post('/maps/route', requireAuth, requireAnyPermission(['create_quotation', 'view_history', 'edit_settings']), mapsCtrl.route);

// Quotations
v1.get('/quotations', requireAuth, requirePermission('view_history'), quotationCtrl.list);
v1.get('/quotations/:id', requireAuth, requirePermission('view_history'), quotationCtrl.show);
v1.post('/quotations', requireAuth, requirePermission('create_quotation'), quotationCtrl.create);
v1.put('/quotations/:id', requireAuth, requirePermission('view_history'), quotationCtrl.update);

// Users & Permissions
v1.get('/users', requireAuth, requireRole('admin'), userCtrl.list);
v1.get('/users/roles', requireAuth, requireRole('admin'), userCtrl.listRoles);
v1.get('/users/permissions', requireAuth, requireRole('admin'), userCtrl.listPermissions);
v1.get('/users/:id', requireAuth, requireRole('admin'), userCtrl.show);
v1.post('/users', requireAuth, requireRole('admin'), upload.single('photo'), userCtrl.create);
v1.put('/users/:id', requireAuth, requireRole('admin'), upload.single('photo'), userCtrl.update);
v1.delete('/users/:id', requireAuth, requireRole('admin'), userCtrl.delete);
v1.post('/users/:id/offboard', requireAuth, requireRole('admin'), userCtrl.offboard);
v1.post('/users/:id/permissions', requireAuth, requireRole('admin'), userCtrl.updatePermissions);

// Logs
v1.get('/logs', requireAuth, requireRole('admin'), logCtrl.list);
v1.post('/logs/error', logCtrl.clientError);

// Dashboard analytics
v1.get('/dashboard', requireAuth, dashCtrl.stats);

// Onboarding
v1.get('/onboarding/state', requireAuth, onboardingCtrl.getState);
v1.put('/onboarding/state', requireAuth, onboardingCtrl.updateState);

// Backups
v1.get('/backups', requireAuth, requireRole('admin'), backupCtrl.list);
v1.get('/backups/summary', requireAuth, requireRole('admin'), backupCtrl.summary);
v1.post('/backups/generate', requireAuth, requireRole('admin'), backupCtrl.generate);
v1.get('/backups/download/:id', requireAuth, requireRole('admin'), backupCtrl.download);
v1.delete('/backups/:id', requireAuth, requireRole('admin'), backupCtrl.delete);

// Dropbox Sync
v1.get('/backups/dropbox/url', requireAuth, requireRole('admin'), backupCtrl.authUrl);
v1.get('/backups/dropbox/callback', backupCtrl.callback);
v1.get('/backups/dropbox/status', requireAuth, requireRole('admin'), backupCtrl.status);
v1.post('/backups/dropbox/disconnect', requireAuth, requireRole('admin'), backupCtrl.disconnect);

// Reports
v1.get('/reports/operational', requireAuth, requirePermission('view_reports'), reportCtrl.operational);
v1.get('/reports/operators', requireAuth, requirePermission('view_reports'), reportCtrl.operators);
v1.get('/reports/financial', requireAuth, requirePermission('view_reports'), reportCtrl.financial);
v1.get('/reports/export', requireAuth, requirePermission('export_reports'), reportCtrl.exportCsv);

// Mount
app.use('/api/v1', v1);

// Test DB Connection and Start
const startServer = async () => {
    try {
        await pool.query('SELECT 1');
        console.log('Database connected successfully');
        await ensureOperationalSchema(pool);
        console.log('Operational schema ensured.');

        app.listen(PORT, () => {
            console.log(`Server running on port ${PORT}`);

            // Setup automated backups cron (Runs every day at midnight to check settings)
            nodeCron.schedule('0 0 * * *', async () => {
                try {
                    const execution = await BackupSchedulerService.runScheduledBackupCycle({
                        now: new Date(),
                        requestId: 'cron-backup'
                    });

                    if (execution.executed) {
                        console.log(`[Cron] Automated ${execution.settings.frequency} backup completed.`);
                    } else if (execution.reason === 'not_due') {
                        console.log('[Cron] Weekly backup skipped because today is outside the scheduled window.');
                    } else if (execution.reason === 'disabled') {
                        console.log('[Cron] Automated backups are disabled.');
                    }
                } catch (err) {
                    console.error('[Cron] Error in automated backup:', err);
                    void logRuntimeError({
                        logger,
                        action: 'CRON_BACKUP_ERROR',
                        error: err,
                        details: { source: 'cron' },
                        source: 'cron',
                        severity: 'critical'
                    });
                }
            });
            console.log('Automated backup scheduler initialized.');
        });
    } catch (error) {
        console.error('Failed to connect to the database:', error.message);
        void logRuntimeError({
            logger,
            action: 'SERVER_STARTUP_DB_ERROR',
            error,
            details: { port: PORT },
            source: 'startup',
            severity: 'critical'
        });
        console.log('Make sure XAMPP (MySQL) is running and configured correctly.');
        // Still start the server for health checks, or exit? 
        // Let's start it so the user can see the health check if possible, 
        // but routes requiring DB will fail.
        app.listen(PORT, () => {
            console.log(`Server running on port ${PORT} (DB disconnected)`);
        });
    }
};

process.on('uncaughtException', (error) => {
    console.error('Uncaught exception:', error);
    void logRuntimeError({
        logger,
        action: 'UNCAUGHT_EXCEPTION',
        error,
        source: 'runtime',
        severity: 'critical'
    });
});

process.on('unhandledRejection', (reason) => {
    console.error('Unhandled rejection:', reason);
    void logRuntimeError({
        logger,
        action: 'UNHANDLED_REJECTION',
        error: reason instanceof Error ? reason : new Error(String(reason)),
        details: { reason: String(reason) },
        source: 'runtime',
        severity: 'critical'
    });
});

startServer();
