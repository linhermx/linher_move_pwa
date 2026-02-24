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
                "SELECT last_count FROM folio_counters WHERE year_month = ? FOR UPDATE",
                [yearMonth]
            );

            let newCount;
            if (rows.length > 0) {
                newCount = rows[0].last_count + 1;
                await connection.query(
                    "UPDATE folio_counters SET last_count = ? WHERE year_month = ?",
                    [newCount, yearMonth]
                );
            } else {
                newCount = 1;
                await connection.query(
                    "INSERT INTO folio_counters (year_month, last_count) VALUES (?, ?)",
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
             google_maps_link, distance_total, time_total, toll_cost, costo_logistico_redondeado, 
             subtotal, iva, total, status)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pendiente')
        `;

        const params = [
            data.folio,
            data.user_id,
            data.vehicle_id,
            data.origin_address,
            data.destination_address,
            data.google_maps_link,
            data.distance_total,
            data.time_total,
            data.toll_cost,
            data.costo_logistico_redondeado,
            data.subtotal,
            data.iva,
            data.total
        ];

        const [result] = await this.db.query(query, params);
        return result.insertId;
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
