import { BaseModel } from './BaseModel.js';

const ALLOWED_STATUS_FILTERS = new Set(['active', 'inactive']);

const buildModelError = (code, message) => {
    const error = new Error(message);
    error.code = code;
    return error;
};

export class UserModel extends BaseModel {
    constructor(db) {
        super('users', db);
    }

    async getAllWithRoles(filters = {}) {
        let query = `
            SELECT u.*, r.name as role_name 
            FROM ${this.tableName} u
            LEFT JOIN roles r ON u.role_id = r.id
            WHERE 1=1
        `;
        const params = [];

        if (filters.search) {
            query += " AND (u.name LIKE ? OR u.email LIKE ?)";
            params.push(`%${filters.search}%`, `%${filters.search}%`);
        }

        if (ALLOWED_STATUS_FILTERS.has(filters.status)) {
            query += " AND u.status = ?";
            params.push(filters.status);
        }

        query += " ORDER BY u.created_at DESC";

        if (filters.limit !== undefined && filters.offset !== undefined) {
            query += " LIMIT ? OFFSET ?";
            params.push(parseInt(filters.limit), parseInt(filters.offset));
        }

        const [rows] = await this.db.query(query, params);
        return rows;
    }

    async countUsers(filters = {}) {
        let query = `
            SELECT COUNT(*) as total 
            FROM ${this.tableName} u
            WHERE 1=1
        `;
        const params = [];

        if (filters.search) {
            query += " AND (u.name LIKE ? OR u.email LIKE ?)";
            params.push(`%${filters.search}%`, `%${filters.search}%`);
        }

        if (ALLOWED_STATUS_FILTERS.has(filters.status)) {
            query += " AND u.status = ?";
            params.push(filters.status);
        }

        const [rows] = await this.db.query(query, params);
        return rows[0].total;
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

    async hasRelatedRecords(userId) {
        const [rows] = await this.db.query(
            `
                SELECT
                    (
                        SELECT COUNT(*)
                        FROM quotations q
                        WHERE q.user_id = ?
                           OR q.assigned_user_id = ?
                           OR q.completed_by_user_id = ?
                    ) AS quotations_count,
                    (
                        SELECT COUNT(*)
                        FROM logs l
                        WHERE l.user_id = ?
                    ) AS logs_count,
                    (
                        SELECT COUNT(*)
                        FROM backups b
                        WHERE b.operator_id = ?
                    ) AS backups_count,
                    (
                        SELECT COUNT(*)
                        FROM integration_connections ic
                        WHERE ic.connected_by_user_id = ?
                    ) AS integration_connections_count,
                    (
                        SELECT COUNT(*)
                        FROM integration_oauth_states ios
                        WHERE ios.operator_id = ?
                    ) AS oauth_states_count
            `,
            [userId, userId, userId, userId, userId, userId, userId]
        );

        const counts = rows[0] || {};
        const totalRelations = Object.values(counts).reduce((sum, value) => sum + Number(value || 0), 0);

        return {
            hasRelations: totalRelations > 0,
            counts
        };
    }

    async offboardUserWithReassignment({ targetUserId, replacementUserId, actorUserId, reason }) {
        const connection = await this.db.getConnection();
        await connection.beginTransaction();

        try {
            if (Number(targetUserId) === Number(replacementUserId)) {
                throw buildModelError('OFFBOARD_INVALID_REPLACEMENT', 'El usuario de reemplazo debe ser distinto.');
            }

            const [targetRows] = await connection.query(
                `
                    SELECT id, name, role_id, status
                    FROM users
                    WHERE id = ?
                    FOR UPDATE
                `,
                [targetUserId]
            );

            if (targetRows.length === 0) {
                throw buildModelError('OFFBOARD_TARGET_NOT_FOUND', 'Usuario objetivo no encontrado.');
            }

            const targetUser = targetRows[0];
            if (targetUser.status !== 'active') {
                throw buildModelError('OFFBOARD_TARGET_INACTIVE', 'El usuario ya se encuentra inactivo.');
            }

            if (Number(targetUser.role_id) === 1) {
                const [adminRows] = await connection.query(
                    `
                        SELECT COUNT(*) AS active_admins
                        FROM users
                        WHERE role_id = 1
                          AND status = 'active'
                          AND id <> ?
                    `,
                    [targetUserId]
                );

                if (Number(adminRows[0]?.active_admins || 0) < 1) {
                    throw buildModelError('OFFBOARD_LAST_ADMIN', 'No puedes dar de baja al ultimo administrador activo.');
                }
            }

            const [replacementRows] = await connection.query(
                `
                    SELECT id, name, status
                    FROM users
                    WHERE id = ?
                    FOR UPDATE
                `,
                [replacementUserId]
            );

            if (replacementRows.length === 0) {
                throw buildModelError('OFFBOARD_REPLACEMENT_NOT_FOUND', 'Usuario de reemplazo no encontrado.');
            }

            const replacementUser = replacementRows[0];
            if (replacementUser.status !== 'active') {
                throw buildModelError('OFFBOARD_REPLACEMENT_INACTIVE', 'El usuario de reemplazo debe estar activo.');
            }

            const [quoteRows] = await connection.query(
                `
                    SELECT id
                    FROM quotations
                    WHERE status IN ('pendiente', 'en_proceso')
                      AND (
                        assigned_user_id = ?
                        OR (assigned_user_id IS NULL AND user_id = ?)
                      )
                    FOR UPDATE
                `,
                [targetUserId, targetUserId]
            );

            const quoteIds = quoteRows.map((row) => row.id);

            if (quoteIds.length > 0) {
                await connection.query(
                    `
                        UPDATE quotations
                        SET assigned_user_id = ?
                        WHERE id IN (?)
                    `,
                    [replacementUserId, quoteIds]
                );

                const reassignmentReason = reason && String(reason).trim() !== '' ? String(reason).trim() : null;
                const values = quoteIds.map((quoteId) => (
                    [quoteId, targetUserId, replacementUserId, actorUserId, reassignmentReason]
                ));

                await connection.query(
                    `
                        INSERT INTO quotation_reassignments
                        (quotation_id, from_user_id, to_user_id, reassigned_by_user_id, reason)
                        VALUES ?
                    `,
                    [values]
                );
            }

            await connection.query(
                `
                    UPDATE users
                    SET status = 'inactive'
                    WHERE id = ?
                `,
                [targetUserId]
            );

            await connection.commit();

            return {
                targetUser,
                replacementUser,
                reassignedCount: quoteIds.length
            };
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
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
