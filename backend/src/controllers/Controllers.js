import { VehicleModel, SettingsModel, ServiceModel } from '../models/OtherModels.js';
import { UserModel } from '../models/UserModel.js';
import { ProxyService } from '../services/ProxyService.js';
import { QuotationModel } from '../models/QuotationModel.js';
import { AuthModel } from '../models/AuthModel.js';
import { CalculationMotor } from '../utils/CalculationMotor.js';
import { LogModel } from '../models/LogModel.js';
import { SystemLogger } from '../utils/Logger.js';

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
                res.status(500).json({ message: error.message });
            }
        },
        update: async (req, res) => {
            try {
                const settings = req.body;
                // Support both single key-value and object bulk update
                if (settings.key && settings.value !== undefined) {
                    await model.updateSetting(settings.key, settings.value);
                } else {
                    // Bulk update
                    for (const [key, value] of Object.entries(settings)) {
                        await model.updateSetting(key, value);
                    }
                }
                res.json({ message: "Settings updated" });

                // Log action
                await logger.config(req.body.operator_id, 'UPDATE_SETTINGS', { keys: Object.keys(settings) });
            } catch (error) {
                res.status(500).json({ message: error.message });
            }
        }
    };
};

export const MapsController = () => {
    const proxy = new ProxyService();

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
                res.status(500).json({ message: "Internal server error" });
            }
        },
        show: async (req, res) => {
            try {
                const quote = await model.getById(req.params.id);
                if (!quote) return res.status(404).json({ message: "Quotation not found" });
                res.json(quote);
            } catch (error) {
                console.error(error);
                res.status(500).json({ message: "Internal server error" });
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
                res.status(500).json({ message: "Internal server error" });
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

                // Simple check for now as requested
                if (user.password !== password) {
                    return res.status(401).json({ message: "Contraseña incorrecta" });
                }

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
                res.status(500).json({ message: "Error en el servidor" });
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
                const userData = {
                    ...req.body,
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
                const userData = {
                    ...req.body,
                    photo_path: req.file ? `uploads/users/${req.file.filename}` : undefined
                };
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
                res.status(500).json({ message: error.message });
            }
        }
    };
};

export const DashboardController = (db) => {
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

                    // Revenue: always filtered by period (defaults to current month if no filter)
                    let revenueQuery, revenueParams;
                    if (date_from || date_to) {
                        revenueQuery = `SELECT COALESCE(SUM(total), 0) as revenue FROM quotations WHERE status='completada'${dc}`;
                        revenueParams = dp;
                    } else {
                        revenueQuery = `SELECT COALESCE(SUM(total), 0) as revenue FROM quotations WHERE status='completada' AND MONTH(created_at)=MONTH(NOW()) AND YEAR(created_at)=YEAR(NOW())`;
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
                        db.query(`SELECT q.folio, q.total, q.created_at, u.name as operator FROM quotations q JOIN users u ON q.user_id=u.id WHERE q.status='pendiente'${dqc} ORDER BY q.created_at DESC LIMIT 5`, dqp),
                        db.query(`SELECT COALESCE(AVG(time_total), 0) as avg_time FROM quotations WHERE status='completada'${dc}`, dp)
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

                const [
                    [myStatusRows],
                    [myRevenueRows],
                    [myWeeklyRows],
                    [myRecentRows]
                ] = await Promise.all([
                    db.query(`SELECT status, COUNT(*) as count FROM quotations WHERE user_id=?${dc} GROUP BY status`, [user_id, ...dp]),
                    db.query(`SELECT COALESCE(SUM(total),0) as amount FROM quotations WHERE user_id=? AND status='completada'${dc}`, [user_id, ...dp]),
                    db.query(`SELECT YEARWEEK(created_at,1) as week, COUNT(*) as count FROM quotations WHERE user_id=?${dc} GROUP BY YEARWEEK(created_at,1) ORDER BY week ASC`, [user_id, ...dp]),
                    db.query(`SELECT folio, destination_address, total, status, created_at FROM quotations WHERE user_id=?${dc} ORDER BY created_at DESC LIMIT 5`, [user_id, ...dp])
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
                res.status(500).json({ message: error.message });
            }
        }
    };
};


