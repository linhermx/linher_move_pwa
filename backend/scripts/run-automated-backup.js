import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { BackupSchedulerService } from '../src/services/BackupSchedulerService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

const args = process.argv.slice(2);
const force = args.includes('--force');
const skipCloudSync = args.includes('--skip-cloud');

try {
    const execution = await BackupSchedulerService.runScheduledBackupCycle({
        force,
        skipCloudSync,
        requestId: force ? 'manual-automation-test' : 'manual-automation-check'
    });

    console.log(JSON.stringify({
        executed: execution.executed,
        reason: execution.reason,
        settings: execution.settings,
        result: execution.result || null,
        skip_cloud_sync: skipCloudSync
    }, null, 2));

    process.exit(0);
} catch (error) {
    console.error('Automated backup execution failed:', error.message);
    process.exit(1);
}
