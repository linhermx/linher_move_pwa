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

    async saveRefreshToken(userId, token, expiresAtIso) {
        const query = `
            INSERT INTO refresh_tokens (user_id, token, expires_at)
            VALUES (?, ?, ?)
        `;
        await this.db.query(query, [userId, token, expiresAtIso]);
    }

    async findRefreshToken(token) {
        const query = `
            SELECT id, user_id, token, expires_at
            FROM refresh_tokens
            WHERE token = ?
            LIMIT 1
        `;
        const [rows] = await this.db.query(query, [token]);
        return rows[0] || null;
    }

    async deleteRefreshToken(token) {
        const query = 'DELETE FROM refresh_tokens WHERE token = ?';
        const [result] = await this.db.query(query, [token]);
        return result.affectedRows > 0;
    }

    async deleteExpiredRefreshTokens() {
        await this.db.query('DELETE FROM refresh_tokens WHERE expires_at < NOW()');
    }
}
