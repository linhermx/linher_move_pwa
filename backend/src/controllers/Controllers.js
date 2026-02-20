import { VehicleModel, SettingsModel } from '../models/OtherModels.js';
import { ProxyService } from '../services/ProxyService.js';
import { QuotationModel } from '../models/QuotationModel.js';
import { CalculationMotor } from '../utils/CalculationMotor.js';

export const VehicleController = (db) => {
    const model = new VehicleModel(db);
    return {
        list: async (req, res) => {
            const vehicles = await model.getAll();
            res.json(vehicles);
        },
        show: async (req, res) => {
            const vehicle = await model.getById(req.params.id);
            if (!vehicle) return res.status(404).json({ message: "Vehicle not found" });
            res.json(vehicle);
        },
        create: async (req, res) => {
            const id = await model.create(req.body);
            res.status(201).json({ id, message: "Vehicle created" });
        }
    };
};

export const SettingsController = (db) => {
    const model = new SettingsModel(db);
    return {
        index: async (req, res) => {
            const settings = await model.getAll();
            res.json(settings);
        },
        update: async (req, res) => {
            const { key, value } = req.body;
            await model.updateSetting(key, value);
            res.json({ message: "Setting updated" });
        }
    };
};

export const MapsController = () => {
    const proxy = new ProxyService();
    return {
        autocomplete: async (req, res) => {
            const { text } = req.query;
            if (!text) return res.json([]);
            try {
                const data = await proxy.geocode(text);
                const mapped = data.features.map(f => ({
                    label: f.properties.label,
                    lat: f.geometry.coordinates[1],
                    lng: f.geometry.coordinates[0]
                }));
                res.json(mapped);
            } catch (err) {
                console.error(err);
                res.status(500).json({ message: "Geocode error" });
            }
        },
        route: async (req, res) => {
            const { locations, coordinates } = req.body;
            const points = coordinates || locations; // Accept both
            if (!points || points.length < 2) {
                return res.status(400).json({ message: "At least 2 points required." });
            }
            try {
                const data = await proxy.getRoute(points);
                res.json(data);
            } catch (err) {
                console.error(err);
                res.status(500).json({ message: "Routing error" });
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
        }
    };
};
