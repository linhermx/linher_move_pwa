import { exec } from 'child_process';
import path from 'path';
import fs from 'fs';
import archiver from 'archiver';
import { fileURLToPath } from 'url';
import pool from '../config/db.js';
import { promisify } from 'util';
import { DropboxService } from './DropboxService.js';
import { SystemLogger } from '../utils/Logger.js';
import { sanitizeForLog } from '../utils/RequestContext.js';

const execPromise = promisify(exec);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const logger = new SystemLogger(pool);

export const BackupService = {
    async generateLocalBackup(operatorId = null, requestContext = {}) {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const backupName = `backup_${timestamp}`;
        const backupDir = path.join(__dirname, '../../backups', backupName);
        const zipFile = `${backupDir}.zip`;
        const sqlFile = path.join(__dirname, '../../backups', `${backupName}.sql`);

        try {
            // 1. Create SQL Dump
            // Assuming XAMPP default path for mysqldump on Windows
            const mysqlDumpPath = 'C:\\xampp\\mysql\\bin\\mysqldump.exe';
            const { DB_HOST, DB_USER, DB_PASS, DB_NAME } = process.env;

            // Note: DB_PASS might be empty
            const passArg = DB_PASS ? `-p${DB_PASS}` : '';
            const dumpCmd = `"${mysqlDumpPath}" -h ${DB_HOST} -u ${DB_USER} ${passArg} ${DB_NAME} > "${sqlFile}"`;

            await execPromise(dumpCmd);

            // 2. Create ZIP archive (SQL + Uploads)
            const output = fs.createWriteStream(zipFile);
            const archive = archiver('zip', { zlib: { level: 9 } });

            const archivePromise = new Promise((resolve, reject) => {
                output.on('close', resolve);
                archive.on('error', reject);
            });

            archive.pipe(output);

            // Add SQL file
            archive.file(sqlFile, { name: 'database.sql' });

            // Add Uploads folder
            const uploadsDir = path.join(__dirname, '../../uploads');
            if (fs.existsSync(uploadsDir)) {
                archive.directory(uploadsDir, 'uploads');
            }

            await archive.finalize();
            await archivePromise;

            // 3. Clean up temporary SQL file
            fs.unlinkSync(sqlFile);

            // 4. Record in DB
            const stats = fs.statSync(zipFile);
            const [result] = await pool.query(
                'INSERT INTO backups (filename, size_bytes, type, status, operator_id) VALUES (?, ?, ?, ?, ?)',
                [path.basename(zipFile), stats.size, 'local', 'success', operatorId]
            );

            await logger.system(operatorId, 'BACKUP_CREATED', {
                filename: path.basename(zipFile),
                size_bytes: stats.size,
                type: 'local',
                ...sanitizeForLog(requestContext)
            });

            // 5. Retention Policy (keep last 7)
            await this.applyRetentionPolicy();

            // 6. Cloud Sync (Optional)
            try {
                const oauthStatus = await DropboxService.getStatus();
                if (oauthStatus.connected) {
                    console.log(`[Backup] Syncing ${path.basename(zipFile)} to Dropbox...`);
                    const dropboxResponse = await DropboxService.uploadFile(zipFile);

                    if (dropboxResponse && dropboxResponse.id) {
                        await pool.query(
                            'INSERT INTO backups (filename, size_bytes, type, status, operator_id) VALUES (?, ?, ?, ?, ?)',
                            [path.basename(zipFile), stats.size, 'dropbox', 'success', operatorId]
                        );
                        await DropboxService.recordSyncSuccess();
                        await logger.system(operatorId, 'BACKUP_SYNC_SUCCESS', {
                            filename: path.basename(zipFile),
                            provider: 'dropbox',
                            external_id: dropboxResponse.id,
                            ...sanitizeForLog(requestContext)
                        });
                        console.log(`[Backup] Cloud sync successful: ${dropboxResponse.id}`);
                    }
                }
            } catch (cloudErr) {
                console.error('[Backup] Cloud sync failed:', cloudErr.message);
                await logger.error(operatorId, 'DROPBOX_SYNC_ERROR', {
                    filename: path.basename(zipFile),
                    provider: 'dropbox',
                    ...sanitizeForLog(requestContext),
                    error: sanitizeForLog(cloudErr)
                }, null, { severity: 'error', source: 'integration' });
            }

            return { id: result.insertId, filename: path.basename(zipFile) };
        } catch (error) {
            console.error('Backup Error:', error);
            if (fs.existsSync(sqlFile)) fs.unlinkSync(sqlFile);
            await logger.error(operatorId, 'BACKUP_CREATE_ERROR', {
                provider: 'local',
                ...sanitizeForLog(requestContext),
                error: sanitizeForLog(error)
            }, null, { severity: 'critical', source: 'backup' });
            throw error;
        }
    },

    async applyRetentionPolicy() {
        const [rows] = await pool.query(
            'SELECT id, filename FROM backups WHERE type = "local" ORDER BY created_at DESC LIMIT 100 OFFSET 7'
        );

        for (const row of rows) {
            const filePath = path.join(__dirname, '../../backups', row.filename);
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
            }
            await pool.query('DELETE FROM backups WHERE id = ?', [row.id]);
        }
    },

    async restoreBackup(backupId) {
        // Implementation for restore will involve unzipping and executing SQL
        // This is a complex operation and should be handled with care.
        // For now, let's provide the basic structure.
        throw new Error('Restore functionality is under development for safety reasons.');
    }
};
