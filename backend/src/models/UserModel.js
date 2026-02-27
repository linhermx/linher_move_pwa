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
        delete user.password; // Segruidad

        // Role permissions
        const rolePermQuery = `
            SELECT p.slug
            FROM role_permissions rp
            JOIN permissions p ON rp.permission_id = p.id
            WHERE rp.role_id = ?
        `;
        const [rolePerms] = await this.db.query(rolePermQuery, [user.role_id]);
        user.role_permissions = rolePerms.map(p => p.slug);

        // Individual permissions
        const userPermQuery = `
            SELECT p.slug
            FROM user_permissions up
            JOIN permissions p ON up.permission_id = p.id
            WHERE up.user_id = ? AND up.granted = 1
        `;
        const [userPerms] = await this.db.query(userPermQuery, [id]);
        user.individual_permissions = userPerms.map(p => p.slug);

        // Consolidated permissions (Role + Individual)
        user.permissions = Array.from(new Set([...user.role_permissions, ...user.individual_permissions]));

        return user;
    }

    async getPermissionsByRole(roleId) {
        const query = `
            SELECT p.slug
            FROM role_permissions rp
            JOIN permissions p ON rp.permission_id = p.id
            WHERE rp.role_id = ?
        `;
        const [rows] = await this.db.query(query, [roleId]);
        return rows.map(r => r.slug);
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
        const fields = [];
        const params = [];

        if (data.name !== undefined) {
            fields.push('name = ?');
            params.push(data.name);
        }
        if (data.email !== undefined) {
            fields.push('email = ?');
            params.push(data.email);
        }
        if (data.role_id !== undefined) {
            fields.push('role_id = ?');
            params.push(data.role_id);
        }
        if (data.status !== undefined) {
            fields.push('status = ?');
            params.push(data.status);
        }
        if (data.password !== undefined) {
            fields.push('password = ?');
            params.push(data.password);
        }
        if (data.photo_path !== undefined) {
            fields.push('photo_path = ?');
            params.push(data.photo_path);
        }

        if (fields.length === 0) return true; // Nothing to update

        const query = `UPDATE ${this.tableName} SET ${fields.join(', ')} WHERE id = ?`;
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
