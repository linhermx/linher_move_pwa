import pool from '../config/db.js';
import { BackupService } from './BackupService.js';

const parseBooleanSetting = (value) => (
    value === true
    || value === 'true'
    || value === 1
    || value === '1'
);

const getAutomationSettings = async () => {
    const [settingsRows] = await pool.query(
        `
            SELECT setting_key, setting_value
            FROM global_settings
            WHERE setting_key IN ('backups_enabled', 'backup_frequency')
        `
    );

    const settings = settingsRows.reduce((accumulator, setting) => {
        accumulator[setting.setting_key] = setting.setting_value;
        return accumulator;
    }, {});

    return {
        enabled: parseBooleanSetting(settings.backups_enabled),
        frequency: settings.backup_frequency || 'daily'
    };
};

export const BackupSchedulerService = {
    async getAutomationSettings() {
        return getAutomationSettings();
    },

    async runScheduledBackupCycle(options = {}) {
        const now = options.now instanceof Date ? options.now : new Date();
        const force = Boolean(options.force);
        const skipCloudSync = Boolean(options.skipCloudSync);
        const settings = await getAutomationSettings();

        if (!settings.enabled) {
            return {
                executed: false,
                reason: 'disabled',
                settings
            };
        }

        const isMidnightWindow = now.getHours() === 0 && now.getMinutes() === 0;
        const isWeeklyDue = settings.frequency === 'weekly' && isMidnightWindow && now.getDay() === 0;
        const isDailyDue = settings.frequency === 'daily' && isMidnightWindow;

        if (!force && !isDailyDue && !isWeeklyDue) {
            return {
                executed: false,
                reason: 'not_due',
                settings
            };
        }

        const result = await BackupService.generateLocalBackup(null, {
            request_id: options.requestId || (force ? 'manual-automation-test' : 'cron-backup'),
            source: 'cron',
            frequency: settings.frequency,
            skip_cloud_sync: skipCloudSync
        });

        return {
            executed: true,
            reason: force ? 'forced' : 'scheduled',
            settings,
            result
        };
    }
};
