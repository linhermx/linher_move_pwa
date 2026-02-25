import { BaseModel } from './BaseModel.js';

export class QuotationModel extends BaseModel {
    constructor(db) {
        super('quotations', db);
    }

    /**
     * Get all records from the table with filters
     */
    async filterQuotes(filters) {
        let query = `SELECT * FROM ${this.tableName} WHERE 1=1`;
        const params = [];

        if (filters.folio) {
            query += " AND folio LIKE ?";
            params.push(`%${filters.folio}%`);
        }

        if (filters.status) {
            query += " AND status = ?";
            params.push(filters.status);
        }

        query += " ORDER BY created_at DESC";
        const [rows] = await this.db.query(query, params);
        return rows;
    }

    async generateFolio(userId) {
        // 1. Get user initials (Mock for now)
        const userInitials = "JR";

        const now = new Date();
        const datePart = now.toISOString().slice(2, 10).replace(/-/g, ''); // YYMMDD
        const yearMonth = now.toISOString().slice(2, 7).replace('-', ''); // YYMM

        const connection = await this.db.getConnection();
        await connection.beginTransaction();

        try {
            const [rows] = await connection.query(
                "SELECT last_count FROM `folio_counters` WHERE `year_month` = ? FOR UPDATE",
                [yearMonth]
            );

            let newCount;
            if (rows.length > 0) {
                newCount = rows[0].last_count + 1;
                await connection.query(
                    "UPDATE `folio_counters` SET last_count = ? WHERE `year_month` = ?",
                    [newCount, yearMonth]
                );
            } else {
                newCount = 1;
                await connection.query(
                    "INSERT INTO `folio_counters` (`year_month`, last_count) VALUES (?, ?)",
                    [yearMonth, newCount]
                );
            }

            await connection.commit();
            const counterPart = String(newCount).padStart(3, '0');
            return `LM${userInitials}-${datePart}${counterPart}`;
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }

    /**
     * Create complex quotation with stops and services
     */
    async createQuote(data) {
        const query = `
            INSERT INTO ${this.tableName} 
            (folio, user_id, vehicle_id, origin_address, destination_address, 
             google_maps_link, num_trayectos, num_casetas, costo_casetas_unit, 
             gas_price_applied, factor_maniobra_applied, factor_trafico_applied,
             distance_total, time_total, toll_cost, lodging_cost, meal_cost, 
             logistics_cost_raw, costo_logistico_redondeado,
             subtotal, iva, total, status)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pendiente')
        `;

        const params = [
            data.folio,
            data.user_id,
            data.vehicle_id,
            data.origin_address,
            data.destination_address,
            data.google_maps_link,
            data.num_trayectos || data.num_legs || 1,
            data.num_casetas || data.num_tolls || 0,
            data.costo_casetas_unit || data.cost_per_toll || 0,
            data.gas_price_applied || data.gas_price || 0,
            data.factor_maniobra_applied || data.maneuver_factor || 1,
            data.factor_trafico_applied || data.traffic_factor || 1,
            data.distance_total || data.distancia_total || 0,
            data.time_total || data.tiempo_total_min || 0,
            data.toll_cost || 0,
            data.lodging_cost || 0,
            data.meal_cost || 0,
            data.logistics_cost_raw || 0,
            data.costo_logistico_redondeado || data.logistics_cost_rounded || 0,
            data.subtotal,
            data.iva,
            data.total
        ];

        const [result] = await this.db.query(query, params);
        const quoteId = result.insertId;

        if (data.services && Array.isArray(data.services)) {
            await this.addServices(quoteId, data.services);
        }

        return quoteId;
    }

    async addServices(quotationId, services) {
        const query = `
            INSERT INTO quotation_services (quotation_id, service_id, cost, time_minutes)
            VALUES (?, ?, ?, ?)
        `;
        for (const service of services) {
            await this.db.query(query, [
                quotationId,
                service.id,
                service.cost,
                service.time_minutes || 0
            ]);
        }
    }

    /**
     * Get a quotation by ID with its stops and services
     */
    async getById(id) {
        const query = `
            SELECT q.*, v.name as vehicle_name, v.plate as vehicle_plate, u.name as user_name
            FROM ${this.tableName} q
            LEFT JOIN vehicles v ON q.vehicle_id = v.id
            LEFT JOIN users u ON q.user_id = u.id
            WHERE q.id = ?
        `;
        const [rows] = await this.db.query(query, [id]);
        if (rows.length === 0) return null;

        const quote = rows[0];

        // Fetch stops
        const [stops] = await this.db.query(
            "SELECT address, order_index FROM quotation_stops WHERE quotation_id = ? ORDER BY order_index ASC",
            [id]
        );
        quote.stops = stops;

        // Fetch services
        const [services] = await this.db.query(
            `SELECT qs.*, s.name as service_name 
             FROM quotation_services qs
             JOIN services s ON qs.service_id = s.id
             WHERE qs.quotation_id = ?`,
            [id]
        );
        quote.services = services;

        // Calculate total service costs
        quote.service_costs = services.reduce((acc, s) => acc + parseFloat(s.cost || 0), 0);

        // Ensure consistent field alias for frontend (if it expects camelCase or specific English)
        quote.logistics_cost_rounded = parseFloat(quote.costo_logistico_redondeado || 0);

        return quote;
    }

    /**
     * Update quotation fields and recalculate if necessary
     */
    async updateQuote(id, data) {
        const allowedFields = [
            'status', 'lodging_cost', 'meal_cost', 'subtotal', 'iva', 'total',
            'vehicle_id', 'distance_total', 'time_total', 'toll_cost',
            'num_trayectos', 'num_casetas', 'costo_casetas_unit',
            'gas_price_applied', 'factor_maniobra_applied', 'factor_trafico_applied',
            'logistics_cost_raw', 'costo_logistico_redondeado'
        ];

        const updates = [];
        const params = [];

        for (const field of allowedFields) {
            if (data[field] !== undefined) {
                updates.push(`${field} = ?`);
                params.push(data[field]);
            }
        }

        if (updates.length === 0) return false;

        params.push(id);
        const query = `UPDATE ${this.tableName} SET ${updates.join(', ')} WHERE id = ?`;
        const [result] = await this.db.query(query, params);
        return result.affectedRows > 0;
    }

    /**
     * Add stops to a quote
     */
    async addStops(quoteId, stops) {
        const query = "INSERT INTO quotation_stops (quotation_id, address, order_index) VALUES (?, ?, ?)";
        for (let i = 0; i < stops.length; i++) {
            await this.db.query(query, [quoteId, stops[i], i]);
        }
    }
}
