import { BaseModel } from './BaseModel.js';

export class QuotationModel extends BaseModel {
    constructor(db) {
        super('quotations', db);
    }

    /**
     * Get all records from the table with filters
     */
    async filterQuotes(filters) {
        let query = `
            SELECT
                q.*,
                qr.*,
                qc.*,
                qp.*,
                CASE
                    WHEN qst.quotation_id IS NULL THEN 'logistics'
                    ELSE 'services'
                END AS quote_type
            FROM ${this.tableName} q
            LEFT JOIN quotation_routes qr ON q.id = qr.quotation_id
            LEFT JOIN quotation_costs qc ON q.id = qc.quotation_id
            LEFT JOIN quotation_parameters qp ON q.id = qp.quotation_id
            LEFT JOIN (
                SELECT DISTINCT quotation_id
                FROM quotation_services
            ) qst ON qst.quotation_id = q.id
            WHERE 1=1
        `;
        const params = [];

        if (filters.folio) {
            query += " AND q.folio LIKE ?";
            params.push(`%${filters.folio}%`);
        }

        if (filters.status) {
            query += " AND q.status = ?";
            params.push(filters.status);
        }

        if (filters.quote_type === 'services') {
            query += " AND qst.quotation_id IS NOT NULL";
        } else if (filters.quote_type === 'logistics') {
            query += " AND qst.quotation_id IS NULL";
        }

        if (filters.date_from) {
            query += " AND q.created_at >= ?";
            params.push(filters.date_from);
        }

        if (filters.date_to) {
            query += " AND q.created_at <= ?";
            params.push(`${filters.date_to} 23:59:59`);
        }

        query += " ORDER BY q.created_at DESC";

        // Pagination
        if (filters.limit !== undefined && filters.offset !== undefined) {
            query += " LIMIT ? OFFSET ?";
            params.push(parseInt(filters.limit), parseInt(filters.offset));
        }

        const [rows] = await this.db.query(query, params);
        return rows;
    }

    async countQuotes(filters) {
        let query = `
            SELECT COUNT(*) as total
            FROM ${this.tableName} q
            LEFT JOIN (
                SELECT DISTINCT quotation_id
                FROM quotation_services
            ) qst ON qst.quotation_id = q.id
            WHERE 1=1
        `;
        const params = [];

        if (filters.folio) {
            query += " AND q.folio LIKE ?";
            params.push(`%${filters.folio}%`);
        }

        if (filters.status) {
            query += " AND q.status = ?";
            params.push(filters.status);
        }

        if (filters.quote_type === 'services') {
            query += " AND qst.quotation_id IS NOT NULL";
        } else if (filters.quote_type === 'logistics') {
            query += " AND qst.quotation_id IS NULL";
        }

        if (filters.date_from) {
            query += " AND q.created_at >= ?";
            params.push(filters.date_from);
        }

        if (filters.date_to) {
            query += " AND q.created_at <= ?";
            params.push(`${filters.date_to} 23:59:59`);
        }

        const [rows] = await this.db.query(query, params);
        return rows[0].total;
    }

    async generateFolio(userId) {
        let userInitials = "XX"; // Fallback

        try {
            // 1. Get user name to extract initials
            const [users] = await this.db.query(
                "SELECT name FROM `users` WHERE id = ?",
                [userId]
            );

            if (users.length > 0) {
                const nameParts = users[0].name.trim().split(/\s+/);
                if (nameParts.length >= 2) {
                    // First letter of first name and first letter of last name
                    userInitials = (nameParts[0][0] + nameParts[nameParts.length - 1][0]).toUpperCase();
                } else if (nameParts.length === 1) {
                    // First two letters of the name if only one part
                    userInitials = nameParts[0].slice(0, 2).toUpperCase();
                }
            }
        } catch (error) {
            console.error("Error fetching user name for folio:", error);
        }

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
            const counterPart = String(newCount).padStart(4, '0');
            return `LM${userInitials}-${yearMonth}${counterPart}`;
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }

    async createQuote(data) {
        const connection = await this.db.getConnection();
        await connection.beginTransaction();

        try {
            // 1. Insert into quotations
            const [qResult] = await connection.query(`
                INSERT INTO ${this.tableName} (folio, user_id, assigned_user_id, completed_by_user_id, vehicle_id, status)
                VALUES (?, ?, ?, ?, ?, 'pendiente')
            `, [
                data.folio,
                data.user_id,
                data.assigned_user_id ?? data.user_id,
                data.completed_by_user_id ?? null,
                data.vehicle_id
            ]);

            const quoteId = qResult.insertId;

            // 2. Insert into quotation_routes
            await connection.query(`
                INSERT INTO quotation_routes (
                    quotation_id, origin_address, destination_address, origin_lat, origin_lng, 
                    destination_lat, destination_lng, google_maps_link, distance_total, 
                    time_total, time_traffic_min, time_services_min
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [
                quoteId, data.origin_address, data.destination_address, data.origin_lat || null, data.origin_lng || null,
                data.destination_lat || null, data.destination_lng || null, data.google_maps_link,
                data.distance_total || data.distancia_total || 0, data.time_total || data.tiempo_total_min || 0,
                data.time_traffic_min || data.tiempo_con_trafico_min || 0, data.time_services_min || data.tiempo_con_servicios_min || 0
            ]);

            // 3. Insert into quotation_costs
            await connection.query(`
                INSERT INTO quotation_costs (
                    quotation_id, toll_cost, lodging_cost, meal_cost, gas_liters, gas_cost, 
                    logistics_cost_raw, logistics_cost_rounded, subtotal, iva, total
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [
                quoteId, data.toll_cost || 0, data.lodging_cost || 0, data.meal_cost || 0,
                data.gas_liters || data.gasolina_litros || 0, data.gas_cost || 0,
                data.logistics_cost_raw || 0, data.costo_logistico_redondeado || data.logistics_cost_rounded || 0,
                data.subtotal || 0, data.iva || 0, data.total || 0
            ]);

            // 4. Insert into quotation_parameters
            await connection.query(`
                INSERT INTO quotation_parameters (
                    quotation_id, num_legs, num_tolls, toll_unit_cost, gas_price_applied, 
                    maneuver_factor_applied, traffic_factor_applied
                ) VALUES (?, ?, ?, ?, ?, ?, ?)
            `, [
                quoteId, data.num_trayectos || data.num_legs || 1, data.num_casetas || data.num_tolls || 0,
                data.costo_casetas_unit || data.toll_unit_cost || data.cost_per_toll || 0,
                data.gas_price_applied || data.gas_price || 0, data.factor_maniobra_applied || data.maneuver_factor_applied || data.maneuver_factor || 1,
                data.factor_trafico_applied || data.traffic_factor_applied || data.traffic_factor || 1
            ]);

            // 5. Insert services if any
            if (data.services && Array.isArray(data.services)) {
                for (const service of data.services) {
                    await connection.query(`
                        INSERT INTO quotation_services (quotation_id, service_id, cost, time_minutes)
                        VALUES (?, ?, ?, ?)
                    `, [quoteId, service.id, service.cost, service.time_minutes || 0]);
                }
            }

            // Also replace addServices method calls by embedding it directly inside the transaction so it's safer
            // AddServices is a separate function, but here we run it within the transaction connection. 
            // In case there is an addServices call elsewhere, it's safer to keep the old addServices function as well.

            await connection.commit();
            return quoteId;
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
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

    async getById(id) {
        const query = `
            SELECT q.*, qr.*, qc.*, qp.*, v.name as vehicle_name, v.plate as vehicle_plate, u.name as user_name,
                   au.name as assigned_user_name, cu.name as completed_by_user_name,
                   qc.logistics_cost_rounded as costo_logistico_redondeado,
                   qp.num_legs as num_trayectos, qp.num_tolls as num_casetas, qp.toll_unit_cost as costo_casetas_unit,
                   qp.maneuver_factor_applied as factor_maniobra_applied, qp.traffic_factor_applied as factor_trafico_applied
            FROM ${this.tableName} q
            LEFT JOIN quotation_routes qr ON q.id = qr.quotation_id
            LEFT JOIN quotation_costs qc ON q.id = qc.quotation_id
            LEFT JOIN quotation_parameters qp ON q.id = qp.quotation_id
            LEFT JOIN vehicles v ON q.vehicle_id = v.id
            LEFT JOIN users u ON q.user_id = u.id
            LEFT JOIN users au ON q.assigned_user_id = au.id
            LEFT JOIN users cu ON q.completed_by_user_id = cu.id
            WHERE q.id = ?
        `;
        const [rows] = await this.db.query(query, [id]);
        if (rows.length === 0) return null;

        const quote = rows[0];

        // Fetch stops
        const [stops] = await this.db.query(
            "SELECT address, lat, lng, order_index FROM quotation_stops WHERE quotation_id = ? ORDER BY order_index ASC",
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

        // FALLBACK: If gas_cost is 0 but we have liters and price, calculate it
        if (!quote.gas_cost || parseFloat(quote.gas_cost) === 0) {
            quote.gas_cost = (parseFloat(quote.gas_liters || 0) * parseFloat(quote.gas_price_applied || 0));
        }

        // Map English DB columns back to Spanish frontend keys expected by UI to avoid breaking it
        quote.logistics_cost_rounded = parseFloat(quote.logistics_cost_rounded || 0);

        return quote;
    }

    async updateQuote(id, data) {
        const connection = await this.db.getConnection();
        await connection.beginTransaction();

        try {
            // Update quotations table
            const qFields = ['status', 'vehicle_id', 'assigned_user_id', 'completed_by_user_id'];
            let qUpdates = [];
            let qParams = [];
            for (let f of qFields) {
                if (data[f] !== undefined) { qUpdates.push(`${f} = ?`); qParams.push(data[f]); }
            }
            if (qUpdates.length > 0) {
                qParams.push(id);
                await connection.query(`UPDATE quotations SET ${qUpdates.join(', ')} WHERE id = ?`, qParams);
            }

            // Update quotation_routes
            const qrFields = ['distance_total', 'time_total', 'time_traffic_min', 'time_services_min', 'origin_lat', 'origin_lng', 'destination_lat', 'destination_lng'];
            let qrUpdates = [];
            let qrParams = [];
            for (let f of qrFields) {
                if (data[f] !== undefined) { qrUpdates.push(`${f} = ?`); qrParams.push(data[f]); }
            }
            if (qrUpdates.length > 0) {
                qrParams.push(id);
                await connection.query(`UPDATE quotation_routes SET ${qrUpdates.join(', ')} WHERE quotation_id = ?`, qrParams);
            }

            // Update quotation_costs
            // Map legacy spanish fields from frontend to new schema if present
            const qcF = {
                'toll_cost': data.toll_cost, 'lodging_cost': data.lodging_cost, 'meal_cost': data.meal_cost,
                'subtotal': data.subtotal, 'iva': data.iva, 'total': data.total,
                'gas_liters': data.gas_liters !== undefined ? data.gas_liters : data.gasolina_litros,
                'gas_cost': data.gas_cost,
                'logistics_cost_raw': data.logistics_cost_raw,
                'logistics_cost_rounded': data.costo_logistico_redondeado !== undefined ? data.costo_logistico_redondeado : data.logistics_cost_rounded
            };
            let qcUpdates = [];
            let qcParams = [];
            for (let f in qcF) {
                if (qcF[f] !== undefined) { qcUpdates.push(`${f} = ?`); qcParams.push(qcF[f]); }
            }
            if (qcUpdates.length > 0) {
                qcParams.push(id);
                await connection.query(`UPDATE quotation_costs SET ${qcUpdates.join(', ')} WHERE quotation_id = ?`, qcParams);
            }

            // Update quotation_parameters
            // Map legacy spanish fields
            const qpF = {
                'num_legs': data.num_trayectos !== undefined ? data.num_trayectos : data.num_legs,
                'num_tolls': data.num_casetas !== undefined ? data.num_casetas : data.num_tolls,
                'toll_unit_cost': data.costo_casetas_unit !== undefined ? data.costo_casetas_unit : data.toll_unit_cost,
                'gas_price_applied': data.gas_price_applied,
                'maneuver_factor_applied': data.factor_maniobra_applied !== undefined ? data.factor_maniobra_applied : data.maneuver_factor_applied,
                'traffic_factor_applied': data.factor_trafico_applied !== undefined ? data.factor_trafico_applied : data.traffic_factor_applied
            };
            let qpUpdates = [];
            let qpParams = [];
            for (let f in qpF) {
                if (qpF[f] !== undefined) { qpUpdates.push(`${f} = ?`); qpParams.push(qpF[f]); }
            }
            if (qpUpdates.length > 0) {
                qpParams.push(id);
                await connection.query(`UPDATE quotation_parameters SET ${qpUpdates.join(', ')} WHERE quotation_id = ?`, qpParams);
            }

            // Synchronize services if provided
            if (data.services && Array.isArray(data.services)) {
                await connection.query("DELETE FROM quotation_services WHERE quotation_id = ?", [id]);
                if (data.services.length > 0) {
                    for (const service of data.services) {
                        await connection.query(`
                            INSERT INTO quotation_services (quotation_id, service_id, cost, time_minutes)
                            VALUES (?, ?, ?, ?)
                        `, [id, service.id, service.cost, service.time_minutes || 0]);
                    }
                }
            }

            await connection.commit();
            return true;
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }

    /**
     * Add stops to a quote
     */
    async addStops(quoteId, stops) {
        const query = "INSERT INTO quotation_stops (quotation_id, address, lat, lng, order_index) VALUES (?, ?, ?, ?, ?)";
        for (let i = 0; i < stops.length; i++) {
            const stop = stops[i];
            const address = typeof stop === 'string' ? stop : stop.address;
            const lat = typeof stop === 'object' ? stop.lat : null;
            const lng = typeof stop === 'object' ? stop.lng : null;
            await this.db.query(query, [quoteId, address, lat, lng, i]);
        }
    }
}
