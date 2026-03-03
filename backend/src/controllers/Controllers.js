import { VehicleModel, SettingsModel, ServiceModel } from '../models/OtherModels.js';
import { UserModel } from '../models/UserModel.js';
import { ProxyService } from '../services/ProxyService.js';
import { QuotationModel } from '../models/QuotationModel.js';
import { AuthModel } from '../models/AuthModel.js';
import { CalculationMotor } from '../utils/CalculationMotor.js';
import { LogModel } from '../models/LogModel.js';
import { SystemLogger } from '../utils/Logger.js';
import { BackupService } from '../services/BackupService.js';
import { DropboxService } from '../services/DropboxService.js';
import pool from '../config/db.js';
import bcrypt from 'bcryptjs';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { buildRequestContext, getOperatorIdFromRequest, logHandledError, sanitizeForLog } from '../utils/RequestContext.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const handleApiError = async (logger, req, res, error, action, response) => {
    await logHandledError({
        logger,
        req,
        action,
        error,
        details: response?.details || {}
    });

    if (response?.send) {
        return res.status(response.status || 500).send(response.send);
    }

    return res.status(response?.status || 500).json({
        message: response?.message || 'Error interno del servidor'
    });
};


export const VehicleController = (db) => {
    const model = new VehicleModel(db);
    const logger = new SystemLogger(db);
    return {
        list: async (req, res) => {
            const vehicles = await model.getAll('id DESC');
            res.json(vehicles);
        },
        show: async (req, res) => {
            const vehicle = await model.getById(req.params.id);
            if (!vehicle) return res.status(404).json({ message: "Vehicle not found" });
            res.json(vehicle);
        },
        create: async (req, res) => {
            const vehicleData = {
                ...req.body,
                photo_path: req.file ? `uploads/vehicles/${req.file.filename}` : null
            };
            const id = await model.create(vehicleData);

            // Log action
            await logger.business(req.body.operator_id, 'CREATE_VEHICLE', { vehicle_id: id, name: vehicleData.name });

            res.status(201).json({ id, message: "Vehicle created" });
        },
        update: async (req, res) => {
            const vehicleData = {
                ...req.body,
                photo_path: req.file ? `uploads/vehicles/${req.file.filename}` : undefined
            };
            const success = await model.update(req.params.id, vehicleData);
            if (!success) return res.status(404).json({ message: "Vehicle not found" });

            // Log action
            await logger.business(req.body.operator_id, 'UPDATE_VEHICLE', { vehicle_id: req.params.id, name: vehicleData.name });

            res.json({ message: "Vehicle updated" });
        },
        delete: async (req, res) => {
            const success = await model.delete(req.params.id);
            if (!success) return res.status(404).json({ message: "Vehicle not found" });

            // Log action
            await logger.business(req.body.operator_id || req.query.operator_id, 'DELETE_VEHICLE', { vehicle_id: req.params.id });

            res.json({ message: "Vehicle deleted" });
        }
    };
};

export const SettingsController = (db) => {
    const model = new SettingsModel(db);
    const logger = new SystemLogger(db);
    return {
        index: async (req, res) => {
            try {
                const settings = await model.getAll('setting_key ASC');
                // Convert array to flat object { setting_key: setting_value }
                const flatSettings = settings.reduce((acc, curr) => {
                    acc[curr.setting_key] = curr.setting_value;
                    return acc;
                }, {});
                res.json(flatSettings);
            } catch (error) {
                await handleApiError(logger, req, res, error, 'SETTINGS_FETCH_ERROR');
            }
        },
        update: async (req, res) => {
            try {
                const settings = req.body;
                const reservedKeys = new Set(['operator_id']);
                // Support both single key-value and object bulk update
                if (settings.key && settings.value !== undefined) {
                    if (reservedKeys.has(settings.key)) {
                        return res.status(400).json({ message: 'Invalid setting key' });
                    }
                    await model.updateSetting(settings.key, settings.value);
                } else {
                    // Bulk update
                    for (const [key, value] of Object.entries(settings)) {
                        if (reservedKeys.has(key)) {
                            continue;
                        }
                        await model.updateSetting(key, value);
                    }
                }
                res.json({ message: "Settings updated" });

                // Log action
                await logger.config(req.body.operator_id, 'UPDATE_SETTINGS', {
                    keys: Object.keys(settings).filter((key) => !reservedKeys.has(key))
                });
            } catch (error) {
                await handleApiError(logger, req, res, error, 'SETTINGS_UPDATE_ERROR');
            }
        }
    };
};

export const MapsController = () => {
    const proxy = new ProxyService();
    const logger = new SystemLogger(pool);

    // Helper to format address nicely
    const formatAddress = (p) => {
        const parts = [];

        // Street and Number
        if (p.street) {
            parts.push(p.housenumber ? `${p.street} ${p.housenumber}` : p.street);
        } else if (p.name && p.name !== p.locality) {
            parts.push(p.name);
        }

        if (p.neighbourhood) parts.push(p.neighbourhood);
        if (p.postalcode) parts.push(`C.P. ${p.postalcode}`);
        if (p.locality) parts.push(p.locality);
        if (p.region) parts.push(p.region);

        return parts.length > 0 ? parts.join(', ') : p.label;
    };

    return {
        autocomplete: async (req, res) => {
            const { text } = req.query;
            if (!text) return res.json([]);
            try {
                const data = await proxy.geocode(text);

                if (!data.features) {
                    return res.json([]);
                }

                const mapped = data.features.map(f => ({
                    label: formatAddress(f.properties),
                    lat: f.geometry.coordinates[1],
                    lng: f.geometry.coordinates[0]
                }));
                res.json(mapped);
            } catch (err) {
                if (err.message === "ORS_API_KEY_MISSING") {
                    return res.status(401).json({
                        message: "Falta la clave de API de OpenRouteService en el servidor.",
                        setup_needed: true
                    });
                }
                console.error('Controller Geocode Error:', err);
                res.status(500).json({ message: "Error al buscar la ubicación" });
            }
        },
        route: async (req, res) => {
            const { locations, coordinates } = req.body;
            const points = coordinates || locations;
            if (!points || points.length < 2) {
                return res.status(400).json({ message: "Se requieren al menos 2 puntos." });
            }
            try {
                const data = await proxy.getRoute(points);
                res.json(data);
            } catch (err) {
                if (err.message === "ORS_API_KEY_MISSING") {
                    return res.status(401).json({
                        message: "Configuración de mapas incompleta (API KEY)."
                    });
                }

                console.error('Controller Route Error:', err);

                if (err.message.includes("404")) {
                    return res.status(404).json({ message: "No se encontró una ruta factible entre estos puntos." });
                }
                if (err.message.includes("429")) {
                    return res.status(429).json({ message: "Límite de solicitudes de mapas excedido. Intenta de nuevo en un momento." });
                }

                // Handle connection timeouts or fetch failures
                if (err.message.includes("fetch failed") || err.name === 'ConnectTimeoutError' || (err.cause && err.cause.code === 'UND_ERR_CONNECT_TIMEOUT')) {
                    return res.status(503).json({ message: "El servicio de mapas está tardando en responder (Timeout). Por favor, intenta de nuevo." });
                }

                res.status(500).json({ message: "Error al calcular la ruta" });
            }
        },
        reverse: async (req, res) => {
            const { lat, lng } = req.query;
            if (!lat || !lng) return res.status(400).json({ message: "Lat and Lng required" });
            try {
                const data = await proxy.reverseGeocode(lat, lng);
                if (data.features && data.features.length > 0) {
                    res.json({ label: formatAddress(data.features[0].properties) });
                } else {
                    res.json({ label: `${parseFloat(lat).toFixed(6)}, ${parseFloat(lng).toFixed(6)}` });
                }
            } catch (err) {
                console.error('Controller Reverse Error:', err);
                // Graceful failure: return coordinates instead of 500
                res.json({ label: `${parseFloat(lat).toFixed(6)}, ${parseFloat(lng).toFixed(6)}` });
            }
        }
    };
};

export const QuotationController = (db) => {
    const model = new QuotationModel(db);
    const logger = new SystemLogger(db);
    return {
        list: async (req, res) => {
            try {
                const total = await model.countQuotes(req.query);
                const limit = parseInt(req.query.limit) || 20;
                const offset = parseInt(req.query.offset) || 0;

                const quotations = await model.filterQuotes({
                    ...req.query,
                    limit,
                    offset
                });

                res.json({
                    data: quotations,
                    pagination: {
                        total,
                        limit,
                        pages: Math.ceil(total / limit),
                        current_page: Math.floor(offset / limit) + 1
                    }
                });
            } catch (error) {
                res.status(500).json({ message: error.message });
            }
        },
        create: async (req, res) => {
            try {
                const folio = await model.generateFolio(req.body.user_id);

                const quoteData = {
                    ...req.body,
                    folio
                };

                const quoteId = await model.createQuote(quoteData);
                if (req.body.stops) {
                    await model.addStops(quoteId, req.body.stops);
                }

                res.status(201).json({
                    id: quoteId,
                    folio,
                    message: "Quotation created successfully"
                });

                // Log action
                await logger.business(req.body.operator_id, 'CREATE_QUOTATION', { quote_id: quoteId, folio, total: req.body.total });
            } catch (error) {
                console.error(error);
                await handleApiError(logger, req, res, error, 'QUOTATION_CREATE_ERROR');
            }
        },
        show: async (req, res) => {
            try {
                const quote = await model.getById(req.params.id);
                if (!quote) return res.status(404).json({ message: "Quotation not found" });
                res.json(quote);
            } catch (error) {
                console.error(error);
                await handleApiError(logger, req, res, error, 'QUOTATION_SHOW_ERROR');
            }
        },
        update: async (req, res) => {
            try {
                const success = await model.updateQuote(req.params.id, req.body);
                if (!success) return res.status(404).json({ message: "Quotation not found or no changes made" });
                res.json({ message: "Quotation updated successfully" });

                // Log action
                await logger.business(req.body.operator_id, 'UPDATE_QUOTATION', {
                    quote_id: req.params.id,
                    status: req.body.status,
                    total: req.body.total
                });
            } catch (error) {
                console.error(error);
                await handleApiError(logger, req, res, error, 'QUOTATION_UPDATE_ERROR');
            }
        }
    };
};

export const ServiceController = (pool) => {
    const model = new ServiceModel(pool);
    const logger = new SystemLogger(pool);

    return {
        list: async (req, res) => {
            try {
                const services = await model.getAll('name ASC');
                res.json(services);
            } catch (error) {
                res.status(500).json({ message: error.message });
            }
        },
        show: async (req, res) => {
            const service = await model.getById(req.params.id);
            if (!service) return res.status(404).json({ message: "Service not found" });
            res.json(service);
        },
        create: async (req, res) => {
            try {
                const id = await model.create(req.body);

                // Log
                await logger.business(req.body.operator_id, 'CREATE_SERVICE', { service_id: id, name: req.body.name });

                res.status(201).json({ id, message: "Service created" });
            } catch (error) {
                res.status(500).json({ message: error.message });
            }
        },
        update: async (req, res) => {
            try {
                const success = await model.update(req.params.id, req.body);
                if (!success) return res.status(404).json({ message: "Service not found" });

                // Log
                await logger.business(req.body.operator_id, 'UPDATE_SERVICE', { service_id: req.params.id, name: req.body.name });

                res.json({ message: "Service updated" });
            } catch (error) {
                res.status(500).json({ message: error.message });
            }
        },
        delete: async (req, res) => {
            try {
                const success = await model.delete(req.params.id);
                if (!success) return res.status(404).json({ message: "Service not found" });

                // Log
                await logger.business(req.body.operator_id || req.query.operator_id, 'DELETE_SERVICE', { service_id: req.params.id });

                res.json({ message: "Service deleted" });
            } catch (error) {
                res.status(500).json({ message: error.message });
            }
        }
    };
};

export const AuthController = (db) => {
    const model = new AuthModel(db);
    const logger = new SystemLogger(db);
    return {
        login: async (req, res) => {
            const { email, password } = req.body;
            try {
                const user = await model.findByEmail(email);
                if (!user) {
                    return res.status(401).json({ message: "Usuario no encontrado o inactivo" });
                }

                // Compare passwords using bcrypt (fallback to plain text during transition)
                const isMatch = await bcrypt.compare(password, user.password).catch(() => false);
                const isPlainMatch = user.password === password;

                if (!isMatch && !isPlainMatch) {
                    return res.status(401).json({ message: "Contraseña incorrecta" });
                }

                // If it was a plain text match, we could optionally hash it and save it now,
                // but we are running a migration script anyway.

                // consolidated perms = Role Perms (TBD) + Individual Perms
                // For now, let's fetch individual perms
                const userModel = new UserModel(db);
                const fullUser = await userModel.getByIdWithPermissions(user.id);

                res.json({
                    user: fullUser,
                    message: "Login exitoso"
                });

                // Log action
                await logger.auth(fullUser.id, 'LOGIN', { email: fullUser.email }, req.ip);
            } catch (error) {
                console.error(error);
                await handleApiError(logger, req, res, error, 'AUTH_LOGIN_ERROR', {
                    message: 'Error en el servidor'
                });
            }
        }
    };
};


export const UserController = (db) => {
    const model = new UserModel(db);
    const logger = new SystemLogger(db);
    return {
        list: async (req, res) => {
            try {
                const total = await model.countUsers(req.query);
                const limit = parseInt(req.query.limit) || 50;
                const offset = parseInt(req.query.offset) || 0;

                const users = await model.getAllWithRoles({
                    ...req.query,
                    limit,
                    offset
                });

                res.json({
                    data: users,
                    pagination: {
                        total,
                        limit,
                        pages: Math.ceil(total / limit),
                        current_page: Math.floor(offset / limit) + 1
                    }
                });
            } catch (error) {
                res.status(500).json({ message: error.message });
            }
        },
        listRoles: async (req, res) => {
            const roles = await model.getAllRoles();
            res.json(roles);
        },
        listPermissions: async (req, res) => {
            const perms = await model.getAllPermissions();
            res.json(perms);
        },
        show: async (req, res) => {
            const user = await model.getByIdWithPermissions(req.params.id);
            if (!user) return res.status(404).json({ message: "Usuario no encontrado" });
            res.json(user);
        },
        create: async (req, res) => {
            try {
                let finalPassword = req.body.password;
                if (finalPassword) {
                    const salt = await bcrypt.genSalt(10);
                    finalPassword = await bcrypt.hash(finalPassword, salt);
                }

                const userData = {
                    ...req.body,
                    password: finalPassword,
                    photo_path: req.file ? `uploads/users/${req.file.filename}` : null
                };
                const id = await model.create(userData);

                // Log
                await logger.system(req.body.operator_id, 'CREATE_USER', { user_id: id, email: userData.email });

                res.status(201).json({ id, message: "Usuario creado" });
            } catch (error) {
                res.status(500).json({ message: error.message });
            }
        },
        update: async (req, res) => {
            try {
                let finalPassword = req.body.password;
                // If the user sent a new password, hash it.
                // ProfileModal sends empty password if not changed. We should handle that in frontend,
                // but if it's sent and not empty, hash it.
                if (finalPassword && finalPassword.trim() !== '') {
                    const salt = await bcrypt.genSalt(10);
                    finalPassword = await bcrypt.hash(finalPassword, salt);
                }

                const userData = {
                    ...req.body,
                    photo_path: req.file ? `uploads/users/${req.file.filename}` : undefined
                };

                // Remove password field if it is empty so it won't overwrite the existing one
                if (!finalPassword || finalPassword.trim() === '') {
                    delete userData.password;
                } else {
                    userData.password = finalPassword;
                }

                const success = await model.update(req.params.id, userData);
                if (!success) return res.status(404).json({ message: "Usuario no encontrado" });

                // Log
                await logger.system(req.body.operator_id, 'UPDATE_USER', { user_id: req.params.id, email: userData.email });

                res.json({
                    message: "Usuario actualizado",
                    photo_path: userData.photo_path
                });
            } catch (error) {
                res.status(500).json({ message: error.message });
            }
        },
        delete: async (req, res) => {
            try {
                const success = await model.delete(req.params.id);
                if (!success) return res.status(404).json({ message: "Usuario eliminado" });

                // Log
                await logger.system(req.body.operator_id || req.query.operator_id, 'DELETE_USER', { user_id: req.params.id });

                res.json({ message: "Usuario eliminado" });
            } catch (error) {
                res.status(500).json({ message: error.message });
            }
        },
        updatePermissions: async (req, res) => {
            try {
                const { permissions } = req.body; // array of slugs
                await model.setPermissions(req.params.id, permissions);

                // Log
                await logger.system(req.body.operator_id, 'UPDATE_USER_PERMISSIONS', { user_id: req.params.id, permissions });

                res.json({ message: "Permisos actualizados" });
            } catch (error) {
                res.status(500).json({ message: error.message });
            }
        }
    };
};

export const LogController = (pool) => {
    const model = new LogModel(pool);
    const logger = new SystemLogger(pool);
    return {
        list: async (req, res) => {
            try {
                const logs = await model.filterLogs(req.query);
                const total = await model.countLogs(req.query);
                const limit = parseInt(req.query.limit) || 50;

                res.json({
                    data: logs,
                    pagination: {
                        total,
                        limit,
                        pages: Math.ceil(total / limit),
                        current_page: Math.floor((parseInt(req.query.offset) || 0) / limit) + 1
                    }
                });
            } catch (error) {
                await handleApiError(logger, req, res, error, 'LOGS_FETCH_ERROR');
            }
        },
        clientError: async (req, res) => {
            try {
                const operatorId = getOperatorIdFromRequest(req);
                const payload = sanitizeForLog(req.body || {});

                await logger.error(
                    operatorId,
                    payload.action || 'FRONTEND_RUNTIME_ERROR',
                    {
                        ...payload,
                        ...buildRequestContext(req)
                    },
                    req.ip,
                    {
                        severity: payload.severity || 'error',
                        source: payload.source || 'frontend'
                    }
                );

                res.status(201).json({ message: 'Error registrado' });
            } catch (error) {
                await handleApiError(logger, req, res, error, 'CLIENT_ERROR_LOGGING_ERROR');
            }
        }
    };
};

export const DashboardController = (db) => {
    const logger = new SystemLogger(db);
    return {
        stats: async (req, res) => {
            try {
                const { user_id } = req.query;
                const role = (req.query.role || 'OPERADOR').toUpperCase();
                const date_from = req.query.date_from || null;  // e.g. '2026-01-01'
                const date_to = req.query.date_to || null;  // e.g. '2026-01-31'

                // ── Date filter helper ─────────────────────────────────────────────────
                const dateClause = (alias = '') => {
                    const col = alias ? `${alias}.created_at` : 'created_at';
                    let clause = '';
                    const params = [];
                    if (date_from) { clause += ` AND ${col} >= ?`; params.push(date_from); }
                    if (date_to) { clause += ` AND ${col} <= ?`; params.push(`${date_to} 23:59:59`); }
                    return { clause, params };
                };

                // ── Shared: quotations by status (with optional filter) ───────────────
                const { clause: sc, params: sp } = dateClause();
                const [statusRows] = await db.query(
                    `SELECT status, COUNT(*) as count FROM quotations WHERE 1=1${sc} GROUP BY status`, sp
                );
                const quotations_by_status = statusRows;

                // ── ADMIN ─────────────────────────────────────────────────────────────
                if (role === 'ADMIN') {
                    const { clause: dc, params: dp } = dateClause();    // no-join queries
                    const { clause: dqc, params: dqp } = dateClause('q'); // join queries (alias q)

                    // Revenue follows the selected period; with no filter it returns the historical total.
                    let revenueQuery, revenueParams;
                    if (date_from || date_to) {
                        revenueQuery = `SELECT COALESCE(SUM(qc.total), 0) as revenue FROM quotations q JOIN quotation_costs qc ON q.id = qc.quotation_id WHERE q.status='completada'${dqc}`;
                        revenueParams = dqp;
                    } else {
                        revenueQuery = `SELECT COALESCE(SUM(qc.total), 0) as revenue FROM quotations q JOIN quotation_costs qc ON q.id = qc.quotation_id WHERE q.status='completada'`;
                        revenueParams = [];
                    }

                    const [
                        [revenueRows],
                        [totalRows],
                        [topOperatorsRows],
                        [byDayRows],
                        [fleetStatusRows],
                        [fleetEffRows],
                        [recentLogsRows],
                        [activeUsersRows]
                    ] = await Promise.all([
                        db.query(revenueQuery, revenueParams),
                        db.query(`SELECT COUNT(*) as total FROM quotations WHERE 1=1${dc}`, dp),
                        db.query(`SELECT u.name, COUNT(q.id) as total FROM quotations q JOIN users u ON q.user_id=u.id WHERE q.status='completada'${dqc} GROUP BY u.id, u.name ORDER BY total DESC LIMIT 5`, dqp),
                        db.query(`SELECT DATE(created_at) as day, COUNT(*) as count FROM quotations WHERE 1=1${dc} GROUP BY DATE(created_at) ORDER BY day ASC`, dp),
                        // Fleet & users are real-time — not date-filtered
                        db.query(`SELECT status, COUNT(*) as count FROM vehicles GROUP BY status`),
                        db.query(`SELECT COALESCE(AVG(rendimiento_real/rendimiento_teorico*100), 0) as fleet_eff FROM vehicles WHERE rendimiento_teorico > 0`),
                        db.query(`SELECT l.action, l.log_type, l.created_at, u.name as user_name FROM logs l LEFT JOIN users u ON l.user_id=u.id ORDER BY l.created_at DESC LIMIT 5`),
                        db.query(`SELECT COUNT(*) as count FROM users WHERE status='active'`)
                    ]);

                    const total = totalRows[0].total;
                    const completada = quotations_by_status.find(r => r.status === 'completada');
                    const success_rate = total > 0 ? Math.round((completada?.count || 0) / total * 100) : 0;
                    const available = fleetStatusRows.find(r => r.status === 'available');

                    return res.json({
                        role: 'ADMIN',
                        kpis: {
                            revenue: parseFloat(revenueRows[0].revenue),
                            total_quotes: total,
                            success_rate,
                            available_vehicles: available?.count || 0,
                            active_users: activeUsersRows[0].count
                        },
                        quotations_by_status,
                        top_operators: topOperatorsRows,
                        by_day: byDayRows,
                        fleet_status: fleetStatusRows,
                        fleet_efficiency: parseFloat(fleetEffRows[0].fleet_eff || 0).toFixed(1),
                        recent_logs: recentLogsRows
                    });
                }

                // ── SUPERVISOR ────────────────────────────────────────────────────────
                if (role === 'SUPERVISOR') {
                    const { clause: dc, params: dp } = dateClause();    // no-join
                    const { clause: dqc, params: dqp } = dateClause('q'); // join queries

                    const [
                        [fleetStatusRows],
                        [fleetEffRows],
                        [pendingRows],
                        [avgTimeRows]
                    ] = await Promise.all([
                        db.query(`SELECT status, COUNT(*) as count FROM vehicles GROUP BY status`),
                        db.query(`SELECT COALESCE(AVG(rendimiento_real/rendimiento_teorico*100), 0) as fleet_eff FROM vehicles WHERE rendimiento_teorico > 0`),
                        db.query(`SELECT q.folio, qc.total, q.created_at, u.name as operator FROM quotations q JOIN users u ON q.user_id=u.id JOIN quotation_costs qc ON q.id = qc.quotation_id WHERE q.status='pendiente'${dqc} ORDER BY q.created_at DESC LIMIT 5`, dqp),
                        db.query(`SELECT COALESCE(AVG(qr.time_total), 0) as avg_time FROM quotations q JOIN quotation_routes qr ON q.id = qr.quotation_id WHERE q.status='completada'${dqc}`, dqp)
                    ]);

                    const activeCount = quotations_by_status
                        .filter(r => r.status === 'pendiente' || r.status === 'en_proceso')
                        .reduce((s, r) => s + r.count, 0);
                    const inRoute = fleetStatusRows.find(r => r.status === 'in_route');

                    return res.json({
                        role: 'SUPERVISOR',
                        kpis: {
                            active_quotes: activeCount,
                            vehicles_in_route: inRoute?.count || 0,
                            avg_route_time: Math.round(parseFloat(avgTimeRows[0].avg_time || 0)),
                            fleet_efficiency: parseFloat(fleetEffRows[0].fleet_eff || 0).toFixed(1)
                        },
                        quotations_by_status,
                        fleet_status: fleetStatusRows,
                        fleet_efficiency: parseFloat(fleetEffRows[0].fleet_eff || 0).toFixed(1),
                        pending_quotes: pendingRows
                    });
                }

                // ── OPERADOR ──────────────────────────────────────────────────────────
                const { clause: dc, params: dp } = dateClause();
                const { clause: dqc, params: dqp } = dateClause('q');

                const [
                    [myStatusRows],
                    [myRevenueRows],
                    [myWeeklyRows],
                    [myRecentRows]
                ] = await Promise.all([
                    db.query(`SELECT status, COUNT(*) as count FROM quotations q WHERE q.user_id=?${dqc} GROUP BY status`, [user_id, ...dqp]),
                    db.query(`SELECT COALESCE(SUM(qc.total),0) as amount FROM quotations q JOIN quotation_costs qc ON q.id=qc.quotation_id WHERE q.user_id=? AND q.status='completada'${dqc}`, [user_id, ...dqp]),
                    db.query(`SELECT YEARWEEK(q.created_at,1) as week, COUNT(*) as count FROM quotations q WHERE q.user_id=?${dqc} GROUP BY YEARWEEK(q.created_at,1) ORDER BY week ASC`, [user_id, ...dqp]),
                    db.query(`SELECT q.folio, qr.destination_address, qc.total, q.status, q.created_at FROM quotations q JOIN quotation_routes qr ON q.id = qr.quotation_id JOIN quotation_costs qc ON q.id = qc.quotation_id WHERE q.user_id=?${dqc} ORDER BY q.created_at DESC LIMIT 5`, [user_id, ...dqp])
                ]);

                const myTotal = myStatusRows.reduce((s, r) => s + r.count, 0);
                const myCompleted = myStatusRows.find(r => r.status === 'completada');
                const myPending = myStatusRows.find(r => r.status === 'pendiente');

                return res.json({
                    role: 'OPERADOR',
                    kpis: {
                        total_quotes: myTotal,
                        completed_this_month: myCompleted?.count || 0,
                        revenue_this_month: parseFloat(myRevenueRows[0].amount),
                        pending: myPending?.count || 0
                    },
                    my_status: myStatusRows,
                    my_weekly: myWeeklyRows,
                    my_recent: myRecentRows
                });

            } catch (error) {
                console.error('Dashboard error:', error);
                await handleApiError(logger, req, res, error, 'DASHBOARD_STATS_ERROR');
            }
        }
    };
};

export const BackupController = (db) => {
    const logger = new SystemLogger(db);
    const parseBooleanSetting = (value) => (
        value === true
        || value === 'true'
        || value === 1
        || value === '1'
    );

    const toBackupSummary = (backup) => {
        if (!backup) {
            return null;
        }

        return {
            id: backup.id,
            filename: backup.filename,
            size_bytes: backup.size_bytes,
            type: backup.type,
            status: backup.status,
            trigger_source: backup.trigger_source,
            operator_id: backup.operator_id,
            created_at: backup.created_at
        };
    };

    return {
        list: async (req, res) => {
            try {
                const limit = parseInt(req.query.limit, 10) || 10;
                const offset = parseInt(req.query.offset, 10) || 0;
                const [[{ total }]] = await db.query('SELECT COUNT(*) AS total FROM backups');
                const pages = Math.max(1, Math.ceil(total / limit));
                const currentPage = Math.min(Math.floor(offset / limit) + 1, pages);
                const normalizedOffset = Math.max(0, (currentPage - 1) * limit);
                const [rows] = await db.query(
                    'SELECT * FROM backups ORDER BY created_at DESC LIMIT ? OFFSET ?',
                    [limit, normalizedOffset]
                );

                res.json({
                    data: rows,
                    pagination: {
                        total,
                        limit,
                        pages,
                        current_page: currentPage
                    }
                });
            } catch (error) {
                await handleApiError(logger, req, res, error, 'BACKUPS_LIST_ERROR');
            }
        },

        summary: async (req, res) => {
            try {
                const [settingsRows] = await db.query(
                    `
                        SELECT setting_key, setting_value
                        FROM global_settings
                        WHERE setting_key IN ('backups_enabled', 'backup_frequency')
                    `
                );
                const [latestLocalRows] = await db.query(
                    `
                        SELECT *
                        FROM backups
                        WHERE type = 'local'
                        ORDER BY created_at DESC
                        LIMIT 1
                    `
                );
                const [latestAutomatedRows] = await db.query(
                    `
                        SELECT *
                        FROM backups
                        WHERE type = 'local'
                          AND trigger_source = 'automated'
                        ORDER BY created_at DESC
                        LIMIT 1
                    `
                );

                const settings = settingsRows.reduce((accumulator, setting) => {
                    accumulator[setting.setting_key] = setting.setting_value;
                    return accumulator;
                }, {});

                const automationEnabled = parseBooleanSetting(settings.backups_enabled);
                const frequency = settings.backup_frequency || 'daily';
                const expectedWindowHours = frequency === 'weekly' ? 168 : 24;
                const latestAutomatedBackup = latestAutomatedRows[0] || null;
                const latestLocalBackup = latestLocalRows[0] || null;

                let health = 'disabled';
                let warningMessage = null;

                if (automationEnabled) {
                    if (!latestAutomatedBackup) {
                        health = 'never_run';
                        warningMessage = 'La automatización está activa, pero todavía no existe un respaldo automático registrado.';
                    } else {
                        const ageInHours = (Date.now() - new Date(latestAutomatedBackup.created_at).getTime()) / (1000 * 60 * 60);
                        if (ageInHours > expectedWindowHours) {
                            health = 'stale';
                            warningMessage = frequency === 'weekly'
                                ? 'El respaldo automático semanal no se ha ejecutado dentro de la ventana esperada.'
                                : 'El respaldo automático diario no se ha ejecutado en las últimas 24 horas.';
                        } else {
                            health = 'healthy';
                        }
                    }
                }

                res.json({
                    automation: {
                        enabled: automationEnabled,
                        frequency,
                        health,
                        expected_window_hours: expectedWindowHours,
                        latest_automated_backup: toBackupSummary(latestAutomatedBackup),
                        latest_local_backup: toBackupSummary(latestLocalBackup),
                        warning_message: warningMessage
                    }
                });
            } catch (error) {
                await handleApiError(logger, req, res, error, 'BACKUPS_SUMMARY_ERROR');
            }
        },

        generate: async (req, res) => {
            try {
                const { operator_id } = req.body;
                const result = await BackupService.generateLocalBackup(operator_id, buildRequestContext(req));

                res.json({ message: 'Backup generated successfully', ...result });
            } catch (error) {
                await handleApiError(logger, req, res, error, 'BACKUP_GENERATE_ERROR');
            }
        },

        download: async (req, res) => {
            try {
                const { id } = req.params;
                const [rows] = await db.query('SELECT filename FROM backups WHERE id = ?', [id]);
                if (!rows.length) return res.status(404).json({ message: 'Backup not found' });

                const filePath = path.join(__dirname, '../../backups', rows[0].filename);
                if (!fs.existsSync(filePath)) return res.status(404).json({ message: 'File not found on disk' });

                res.download(filePath);
            } catch (error) {
                await handleApiError(logger, req, res, error, 'BACKUP_DOWNLOAD_ERROR');
            }
        },

        delete: async (req, res) => {
            try {
                const { id } = req.params;
                const [rows] = await db.query('SELECT filename FROM backups WHERE id = ?', [id]);
                if (!rows.length) return res.status(404).json({ message: 'Backup not found' });

                const filePath = path.join(__dirname, '../../backups', rows[0].filename);
                if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

                await db.query('DELETE FROM backups WHERE id = ?', [id]);
                await logger.system(getOperatorIdFromRequest(req), 'BACKUP_DELETED', {
                    backup_id: id,
                    filename: rows[0].filename,
                    ...buildRequestContext(req)
                });
                res.json({ message: 'Backup deleted successfully' });
            } catch (error) {
                await handleApiError(logger, req, res, error, 'BACKUP_DELETE_ERROR');
            }
        },

        authUrl: async (req, res) => {
            try {
                const operatorId = req.query.operator_id || getOperatorIdFromRequest(req);
                const url = await DropboxService.getAuthUrl(operatorId);
                res.json({ url });
            } catch (error) {
                await handleApiError(logger, req, res, error, 'DROPBOX_AUTH_URL_ERROR');
            }
        },

        callback: async (req, res) => {
            try {
                const { code, state } = req.query;
                if (!code) return res.status(400).send('Authorization code missing');
                if (!state) return res.status(400).send('Authorization state missing');

                const result = await DropboxService.saveTokens(code, state);
                await logger.system(result.operator_id, 'BACKUP_SYNC_CONNECTED', {
                    provider: 'dropbox',
                    user: result.user
                });

                const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
                res.redirect(`${frontendUrl}/backups?sync=success`);
            } catch (error) {
                console.error('Dropbox Auth Callback Error:', error);
                await logHandledError({
                    logger,
                    req,
                    action: 'DROPBOX_AUTH_CALLBACK_ERROR',
                    error,
                    details: { provider: 'dropbox' }
                });
                res.status(500).send('Authentication failed');
            }
        },

        status: async (req, res) => {
            try {
                const status = await DropboxService.getStatus();
                res.json(status);
            } catch (error) {
                await handleApiError(logger, req, res, error, 'DROPBOX_STATUS_ERROR');
            }
        },

        disconnect: async (req, res) => {
            try {
                const { operator_id } = req.body;
                await DropboxService.disconnect();
                await logger.system(operator_id, 'BACKUP_SYNC_DISCONNECTED', {
                    provider: 'dropbox',
                    ...buildRequestContext(req)
                });
                res.json({ message: 'Dropbox disconnected' });
            } catch (error) {
                await handleApiError(logger, req, res, error, 'DROPBOX_DISCONNECT_ERROR');
            }
        }
    };
};


