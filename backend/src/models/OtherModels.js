import { BaseModel } from './BaseModel.js';

export class VehicleModel extends BaseModel {
    constructor(db) {
        super('vehicles', db);
    }

    async create(data) {
        const query = `INSERT INTO ${this.tableName} (name, plate, rendimiento_teorico, rendimiento_real, photo_path, status) VALUES (?, ?, ?, ?, ?, ?)`;
        const params = [
            data.name,
            data.plate,
            data.rendimiento_teorico,
            data.rendimiento_real,
            data.photo_path,
            data.status || 'available'
        ];
        const [result] = await this.db.query(query, params);
        return result.insertId;
    }
}

export class SettingsModel extends BaseModel {
    constructor(db) {
        super('global_settings', db);
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
