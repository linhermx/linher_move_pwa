import { BaseModel } from './BaseModel.js';

export class LogModel extends BaseModel {
    constructor(db) {
        super('logs', db);
    }

    /**
     * Create a new audit log
     * @param {Object} data 
     * @param {string} data.log_type - 'system', 'config', 'business', 'auth', 'error'
     * @param {string} data.severity - 'info', 'warning', 'error', 'critical'
     * @param {number} data.user_id 
     * @param {string} data.action - Action name (e.g., 'CREATE_QUOTATION')
     * @param {Object} data.details - JSON details
     * @param {string} data.source
     * @param {string} data.ip_address 
     */
    async create(data) {
        const query = `INSERT INTO ${this.tableName} (log_type, severity, user_id, action, source, details, ip_address) VALUES (?, ?, ?, ?, ?, ?, ?)`;
        const params = [
            data.log_type,
            data.severity || 'info',
            data.user_id || null,
            data.action,
            data.source || 'server',
            data.details ? JSON.stringify(data.details) : null,
            data.ip_address || null
        ];
        const [result] = await this.db.query(query, params);
        return result.insertId;
    }

    async getRecent(limit = 100) {
        const query = `
            SELECT l.*, u.name as user_name, u.photo_path 
            FROM ${this.tableName} l
            LEFT JOIN users u ON l.user_id = u.id
            ORDER BY l.created_at DESC 
            LIMIT ?
        `;
        const [rows] = await this.db.query(query, [limit]);
        return rows;
    }

    async filterLogs(params) {
        let query = `
            SELECT l.*, u.name as user_name, u.photo_path 
            FROM ${this.tableName} l
            LEFT JOIN users u ON l.user_id = u.id
            WHERE 1=1
        `;
        const queryParams = [];

        if (params.log_type) {
            query += ` AND l.log_type = ?`;
            queryParams.push(params.log_type);
        }

        if (params.user_id) {
            query += ` AND l.user_id = ?`;
            queryParams.push(params.user_id);
        }

        if (params.severity) {
            query += ` AND l.severity = ?`;
            queryParams.push(params.severity);
        }

        if (params.source) {
            query += ` AND l.source = ?`;
            queryParams.push(params.source);
        }

        if (params.search) {
            query += ` AND (l.action LIKE ? OR u.name LIKE ? OR l.source LIKE ?)`;
            queryParams.push(`%${params.search}%`, `%${params.search}%`, `%${params.search}%`);
        }

        if (params.date_from) {
            query += ` AND l.created_at >= ?`;
            queryParams.push(params.date_from);
        }

        if (params.date_to) {
            query += ` AND l.created_at <= ?`;
            queryParams.push(params.date_to + ' 23:59:59');
        }

        query += ` ORDER BY l.created_at DESC LIMIT ? OFFSET ?`;
        const limit = parseInt(params.limit) || 50;
        const offset = parseInt(params.offset) || 0;
        queryParams.push(limit, offset);

        const [rows] = await this.db.query(query, queryParams);
        return rows;
    }

    async countLogs(params) {
        let query = `
            SELECT COUNT(*) as total 
            FROM ${this.tableName} l
            LEFT JOIN users u ON l.user_id = u.id
            WHERE 1=1
        `;
        const queryParams = [];

        if (params.log_type) {
            query += ` AND l.log_type = ?`;
            queryParams.push(params.log_type);
        }

        if (params.user_id) {
            query += ` AND l.user_id = ?`;
            queryParams.push(params.user_id);
        }

        if (params.severity) {
            query += ` AND l.severity = ?`;
            queryParams.push(params.severity);
        }

        if (params.source) {
            query += ` AND l.source = ?`;
            queryParams.push(params.source);
        }

        if (params.search) {
            query += ` AND (l.action LIKE ? OR u.name LIKE ? OR l.source LIKE ?)`;
            queryParams.push(`%${params.search}%`, `%${params.search}%`, `%${params.search}%`);
        }

        if (params.date_from) {
            query += ` AND l.created_at >= ?`;
            queryParams.push(params.date_from);
        }

        if (params.date_to) {
            query += ` AND l.created_at <= ?`;
            queryParams.push(params.date_to + ' 23:59:59');
        }

        const [rows] = await this.db.query(query, queryParams);
        return rows[0].total;
    }
}
