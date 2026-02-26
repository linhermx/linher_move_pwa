import { LogModel } from '../models/LogModel.js';

/**
 * Utility for easy auditing across the application
 */
export class SystemLogger {
    constructor(db) {
        this.model = new LogModel(db);
    }

    /**
     * Log an authentication event
     */
    async auth(userId, action, details, ip = null) {
        return this.model.create({
            log_type: 'auth',
            user_id: userId,
            action,
            details,
            ip_address: ip
        });
    }

    /**
     * Log a configuration/settings change
     */
    async config(userId, action, details, ip = null) {
        return this.model.create({
            log_type: 'config',
            user_id: userId,
            action,
            details,
            ip_address: ip
        });
    }

    /**
     * Log a business transaction (Quotations, Fleet, etc)
     */
    async business(userId, action, details, ip = null) {
        return this.model.create({
            log_type: 'business',
            user_id: userId,
            action,
            details,
            ip_address: ip
        });
    }

    /**
     * Log a system operation
     */
    async system(userId, action, details, ip = null) {
        return this.model.create({
            log_type: 'system',
            user_id: userId,
            action,
            details,
            ip_address: ip
        });
    }
}
