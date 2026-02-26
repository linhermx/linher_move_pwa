import { BaseModel } from './BaseModel.js';

export class UserModel extends BaseModel {
    constructor(db) {
        super('users', db);
    }

    async getAllWithRoles() {
        const query = `
            SELECT u.*, r.name as role_name 
            FROM ${this.tableName} u
            LEFT JOIN roles r ON u.role_id = r.id
            ORDER BY u.created_at DESC
        `;
        const [rows] = await this.db.query(query);
        return rows;
    }

    async getByIdWithPermissions(id) {
        // Base user info
        const userQuery = `
            SELECT u.*, r.name as role_name 
            FROM ${this.tableName} u
            LEFT JOIN roles r ON u.role_id = r.id
            WHERE u.id = ? LIMIT 1
        `;
        const [users] = await this.db.query(userQuery, [id]);
        if (users.length === 0) return null;
        const user = users[0];

        // Individual permissions
        const permQuery = `
            SELECT p.slug
            FROM user_permissions up
            JOIN permissions p ON up.permission_id = p.id
            WHERE up.user_id = ? AND up.granted = 1
        `;
        const [perms] = await this.db.query(permQuery, [id]);
        user.individual_permissions = perms.map(p => p.slug);

        return user;
    }

    async create(data) {
        const query = `INSERT INTO ${this.tableName} (name, email, password, role_id, photo_path, status) VALUES (?, ?, ?, ?, ?, ?)`;
        const params = [
            data.name,
            data.email,
            data.password, // Ideally hashed, but following current pattern
            data.role_id,
            data.photo_path || null,
            data.status || 'active'
        ];
        const [result] = await this.db.query(query, params);
        return result.insertId;
    }

    async update(id, data) {
        let query = `UPDATE ${this.tableName} SET name = ?, email = ?, role_id = ?, status = ?`;
        let params = [data.name, data.email, data.role_id, data.status];

        if (data.password) {
            query += `, password = ?`;
            params.push(data.password);
        }

        if (data.photo_path) {
            query += `, photo_path = ?`;
            params.push(data.photo_path);
        }

        query += ` WHERE id = ?`;
        params.push(id);

        const [result] = await this.db.query(query, params);
        return result.affectedRows > 0;
    }

    async setPermissions(userId, permissionSlugs) {
        // First, clear existing individual permissions for this user
        await this.db.query('DELETE FROM user_permissions WHERE user_id = ?', [userId]);

        if (permissionSlugs && permissionSlugs.length > 0) {
            // Get permission IDs from slugs
            const [perms] = await this.db.query('SELECT id FROM permissions WHERE slug IN (?)', [permissionSlugs]);

            if (perms.length > 0) {
                const values = perms.map(p => [userId, p.id, 1]);
                await this.db.query('INSERT INTO user_permissions (user_id, permission_id, granted) VALUES ?', [values]);
            }
        }
        return true;
    }

    async getAllRoles() {
        const [rows] = await this.db.query('SELECT * FROM roles ORDER BY id ASC');
        return rows;
    }

    async getAllPermissions() {
        const [rows] = await this.db.query('SELECT * FROM permissions ORDER BY name ASC');
        return rows;
    }
}
