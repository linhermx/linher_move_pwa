import { VehicleModel, SettingsModel, ServiceModel } from '../models/OtherModels.js';
import { ProxyService } from '../services/ProxyService.js';
import { QuotationModel } from '../models/QuotationModel.js';
import { AuthModel } from '../models/AuthModel.js';
import { CalculationMotor } from '../utils/CalculationMotor.js';

export const VehicleController = (db) => {
    const model = new VehicleModel(db);
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
            res.status(201).json({ id, message: "Vehicle created" });
        },
        update: async (req, res) => {
            const vehicleData = {
                ...req.body,
                photo_path: req.file ? `uploads/vehicles/${req.file.filename}` : undefined
            };
            const success = await model.update(req.params.id, vehicleData);
            if (!success) return res.status(404).json({ message: "Vehicle not found" });
            res.json({ message: "Vehicle updated" });
        },
        delete: async (req, res) => {
            const success = await model.delete(req.params.id);
            if (!success) return res.status(404).json({ message: "Vehicle not found" });
            res.json({ message: "Vehicle deleted" });
        }
    };
};

export const SettingsController = (db) => {
    const model = new SettingsModel(db);
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
    return {
        list: async (req, res) => {
            const quotes = await model.filterQuotes(req.query);
            res.json(quotes);
        },
        create: async (req, res) => {
            try {
                // Calculation handled via utility
                const breakdown = CalculationMotor.calculate(req.body);
                const folio = await model.generateFolio(req.body.user_id);

                const quoteData = {
                    ...req.body,
                    folio,
                    ...breakdown
                };

                const quoteId = await model.createQuote(quoteData);
                if (req.body.stops) {
                    await model.addStops(quoteId, req.body.stops);
                }

                res.status(201).json({
                    id: quoteId,
                    folio,
                    message: "Quotation created successfully",
                    breakdown
                });
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
            } catch (error) {
                console.error(error);
                res.status(500).json({ message: "Internal server error" });
            }
        }
    };
};

export const ServiceController = (pool) => {
    const model = new ServiceModel(pool);

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
                res.status(201).json({ id, message: "Service created" });
            } catch (error) {
                res.status(500).json({ message: error.message });
            }
        },
        update: async (req, res) => {
            try {
                const success = await model.update(req.params.id, req.body);
                if (!success) return res.status(404).json({ message: "Service not found" });
                res.json({ message: "Service updated" });
            } catch (error) {
                res.status(500).json({ message: error.message });
            }
        },
        delete: async (req, res) => {
            try {
                const success = await model.delete(req.params.id);
                if (!success) return res.status(404).json({ message: "Service not found" });
                res.json({ message: "Service deleted" });
            } catch (error) {
                res.status(500).json({ message: error.message });
            }
        }
    };
};

export const AuthController = (db) => {
    const model = new AuthModel(db);
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

                // Remove sensitive data
                delete user.password;

                res.json({
                    user,
                    message: "Login exitoso"
                });
            } catch (error) {
                console.error(error);
                res.status(500).json({ message: "Error en el servidor" });
            }
        }
    };
};
