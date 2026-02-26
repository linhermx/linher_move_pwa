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
    UserController
} from './controllers/Controllers.js';
import { UserModel } from './models/UserModel.js';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

app.use(cors());
app.use(express.json());
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

// Auth
v1.post('/auth/login', authCtrl.login);

// Vehicles
v1.get('/vehicles', vehicleCtrl.list);
v1.get('/vehicles/:id', vehicleCtrl.show);
v1.post('/vehicles', upload.single('photo'), vehicleCtrl.create);
v1.put('/vehicles/:id', upload.single('photo'), vehicleCtrl.update);
v1.delete('/vehicles/:id', vehicleCtrl.delete);

// Services
v1.get('/services', serviceCtrl.list);
v1.get('/services/:id', serviceCtrl.show);
v1.post('/services', serviceCtrl.create);
v1.put('/services/:id', serviceCtrl.update);
v1.delete('/services/:id', serviceCtrl.delete);

// Settings
v1.get('/settings', settingsCtrl.index);
v1.post('/settings', settingsCtrl.update);

// Maps
v1.get('/maps/autocomplete', mapsCtrl.autocomplete);
v1.get('/maps/reverse', mapsCtrl.reverse);
v1.post('/maps/route', mapsCtrl.route);

// Quotations
v1.get('/quotations', quotationCtrl.list);
v1.get('/quotations/:id', quotationCtrl.show);
v1.post('/quotations', quotationCtrl.create);
v1.put('/quotations/:id', quotationCtrl.update);

// Users & Permissions
v1.get('/users', userCtrl.list);
v1.get('/users/roles', userCtrl.listRoles);
v1.get('/users/permissions', userCtrl.listPermissions);
v1.get('/users/:id', userCtrl.show);
v1.post('/users', upload.single('photo'), userCtrl.create);
v1.put('/users/:id', upload.single('photo'), userCtrl.update);
v1.delete('/users/:id', userCtrl.delete);
v1.post('/users/:id/permissions', userCtrl.updatePermissions);

// Mount
app.use('/api/v1', v1);

// Test DB Connection and Start
const startServer = async () => {
    try {
        await pool.query('SELECT 1');
        console.log('Database connected successfully');

        app.listen(PORT, () => {
            console.log(`Server running on port ${PORT}`);
        });
    } catch (error) {
        console.error('Failed to connect to the database:', error.message);
        console.log('Make sure XAMPP (MySQL) is running and configured correctly.');
        // Still start the server for health checks, or exit? 
        // Let's start it so the user can see the health check if possible, 
        // but routes requiring DB will fail.
        app.listen(PORT, () => {
            console.log(`Server running on port ${PORT} (DB disconnected)`);
        });
    }
};

startServer();
