import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import pool from './config/db.js';
import {
    VehicleController,
    SettingsController,
    MapsController,
    QuotationController
} from './controllers/Controllers.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Routes
const v1 = express.Router();

// Health check
v1.get('/health', (req, res) => res.json({ status: "ok", message: "Move Node API is running." }));

// Instances
const vehicleCtrl = VehicleController(pool);
const settingsCtrl = SettingsController(pool);
const mapsCtrl = MapsController();
const quotationCtrl = QuotationController(pool);

// Vehicles
v1.get('/vehicles', vehicleCtrl.list);
v1.get('/vehicles/:id', vehicleCtrl.show);
v1.post('/vehicles', vehicleCtrl.create);

// Settings
v1.get('/settings', settingsCtrl.index);
v1.post('/settings', settingsCtrl.update);

// Maps
v1.get('/maps/autocomplete', mapsCtrl.autocomplete);
v1.post('/maps/route', mapsCtrl.route);

// Quotations
v1.get('/quotations', quotationCtrl.list);
v1.post('/quotations', quotationCtrl.create);

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
