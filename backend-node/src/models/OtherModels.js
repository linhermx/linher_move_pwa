import { BaseModel } from './BaseModel.js';

export class VehicleModel extends BaseModel {
    constructor(db) {
        super('vehicles', db);
    }

    async create(data) {
        const query = `INSERT INTO ${this.tableName} (name, type, mpg, capacity, status) VALUES (?, ?, ?, ?, ?)`;
        const params = [data.name, data.type, data.mpg, data.capacity, data.status || 'available'];
        const [result] = await this.db.query(query, params);
        return result.insertId;
    }
}

export class SettingsModel extends BaseModel {
    constructor(db) {
        super('app_settings', db);
    }

    async getByKey(key) {
        const [rows] = await this.db.query(`SELECT * FROM ${this.tableName} WHERE setting_key = ?`, [key]);
        return rows[0] || null;
    }

    async updateSetting(key, value) {
        const query = `UPDATE ${this.tableName} SET setting_value = ? WHERE setting_key = ?`;
        const [result] = await this.db.query(query, [value, key]);
        return result.affectedRows > 0;
    }
}
