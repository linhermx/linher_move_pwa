import { BaseModel } from './BaseModel.js';

export class AuthModel extends BaseModel {
    constructor(db) {
        super('users', db);
    }

    async findByEmail(email) {
        const query = `
            SELECT u.*, r.name as role_name 
            FROM ${this.tableName} u
            LEFT JOIN roles r ON u.role_id = r.id
            WHERE u.email = ? AND u.status = 'active'
        `;
        const [rows] = await this.db.query(query, [email]);
        return rows[0] || null;
    }
}
