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
            severity: 'info',
            user_id: userId,
            action,
            details,
            source: 'auth',
            ip_address: ip
        });
    }

    /**
     * Log a configuration/settings change
     */
    async config(userId, action, details, ip = null) {
        return this.model.create({
            log_type: 'config',
            severity: 'info',
            user_id: userId,
            action,
            details,
            source: 'settings',
            ip_address: ip
        });
    }

    /**
     * Log a business transaction (Quotations, Fleet, etc)
     */
    async business(userId, action, details, ip = null) {
        return this.model.create({
            log_type: 'business',
            severity: 'info',
            user_id: userId,
            action,
            details,
            source: 'business',
            ip_address: ip
        });
    }

    /**
     * Log a system operation
     */
    async system(userId, action, details, ip = null) {
        return this.model.create({
            log_type: 'system',
            severity: 'info',
            user_id: userId,
            action,
            details,
            source: 'system',
            ip_address: ip
        });
    }

    /**
     * Log an application error with severity and source metadata
     */
    async error(userId, action, details, ip = null, options = {}) {
        return this.model.create({
            log_type: 'error',
            severity: options.severity || 'error',
            user_id: userId,
            action,
            details,
            source: options.source || 'server',
            ip_address: ip
        });
    }
}
