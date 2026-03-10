import { BaseModel } from './BaseModel.js';

const ALLOWED_STATUSES = new Set(['in_progress', 'skipped', 'completed']);

export class OnboardingStateModel extends BaseModel {
    constructor(db) {
        super('user_onboarding_states', db);
    }

    async getByUserId(userId) {
        const [rows] = await this.db.query(
            `
                SELECT user_id, version, status, updated_at, created_at
                FROM ${this.tableName}
                WHERE user_id = ?
                LIMIT 1
            `,
            [userId]
        );

        return rows[0] || null;
    }

    async upsertByUserId({ userId, version, status }) {
        if (!ALLOWED_STATUSES.has(status)) {
            throw new Error('INVALID_ONBOARDING_STATUS');
        }

        await this.db.query(
            `
                INSERT INTO ${this.tableName} (user_id, version, status)
                VALUES (?, ?, ?)
                ON DUPLICATE KEY UPDATE
                    version = VALUES(version),
                    status = VALUES(status),
                    updated_at = CURRENT_TIMESTAMP
            `,
            [userId, version || null, status]
        );

        return this.getByUserId(userId);
    }
}
