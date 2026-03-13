import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import archiver from 'archiver';
import { fileURLToPath } from 'url';
import pool from '../config/db.js';
import { DropboxService } from './DropboxService.js';
import { SystemLogger } from '../utils/Logger.js';
import { sanitizeForLog } from '../utils/RequestContext.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const logger = new SystemLogger(pool);
const projectRootDir = path.join(__dirname, '../../');
const backupsRootDir = path.join(projectRootDir, 'backups');
const uploadsRootDir = path.join(projectRootDir, 'uploads');

const ensureDirectory = (targetPath) => {
    if (!fs.existsSync(targetPath)) {
        fs.mkdirSync(targetPath, { recursive: true });
    }
};

const resolveMysqlDumpPath = () => {
    const configuredPath = process.env.MYSQLDUMP_PATH?.trim();
    if (configuredPath) {
        return configuredPath;
    }

    const xamppDefaultPath = 'C:\\xampp\\mysql\\bin\\mysqldump.exe';
    if (process.platform === 'win32' && fs.existsSync(xamppDefaultPath)) {
        return xamppDefaultPath;
    }

    return 'mysqldump';
};

const runMysqlDump = ({ dumpBinary, host, user, password, database, outputFile }) => (
    new Promise((resolve, reject) => {
        const args = ['-h', host, '-u', user];
        if (password) {
            args.push(`-p${password}`);
        }
        args.push(database);

        const dumpProcess = spawn(dumpBinary, args, {
            cwd: projectRootDir,
            shell: false,
            stdio: ['ignore', 'pipe', 'pipe']
        });

        const outputStream = fs.createWriteStream(outputFile);
        let stderrOutput = '';
        let dumpExited = false;
        let streamFinished = false;
        let dumpExitCode = 0;

        const cleanup = (error) => {
            outputStream.destroy();
            reject(error);
        };

        const maybeResolve = () => {
            if (!dumpExited || !streamFinished) {
                return;
            }

            if (dumpExitCode === 0) {
                resolve();
                return;
            }

            const safeError = new Error(
                `mysqldump failed with code ${dumpExitCode}${stderrOutput ? `: ${stderrOutput.trim()}` : ''}`
            );
            reject(safeError);
        };

        dumpProcess.on('error', (error) => cleanup(error));
        outputStream.on('error', (error) => cleanup(error));

        dumpProcess.stderr.on('data', (chunk) => {
            stderrOutput += chunk.toString();
        });

        outputStream.on('finish', () => {
            streamFinished = true;
            maybeResolve();
        });

        dumpProcess.on('close', (code) => {
            dumpExitCode = Number(code || 0);
            dumpExited = true;
            maybeResolve();
        });

        dumpProcess.stdout.pipe(outputStream);
    })
);

export const BackupService = {
    async generateLocalBackup(operatorId = null, requestContext = {}) {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const backupName = `backup_${timestamp}`;
        ensureDirectory(backupsRootDir);

        const zipFile = path.join(backupsRootDir, `${backupName}.zip`);
        const sqlFile = path.join(backupsRootDir, `${backupName}.sql`);
        const triggerSource = requestContext.source === 'cron' ? 'automated' : 'manual';
        const skipCloudSync = Boolean(requestContext.skip_cloud_sync);

        try {
            // 1. Create SQL Dump
            const mysqlDumpPath = resolveMysqlDumpPath();
            const { DB_HOST, DB_USER, DB_PASS, DB_NAME } = process.env;

            if (!DB_USER || !DB_NAME) {
                throw new Error('Missing DB_USER or DB_NAME for backup generation');
            }

            await runMysqlDump({
                dumpBinary: mysqlDumpPath,
                host: DB_HOST || 'localhost',
                user: DB_USER,
                password: DB_PASS || '',
                database: DB_NAME,
                outputFile: sqlFile
            });

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
            if (fs.existsSync(uploadsRootDir)) {
                archive.directory(uploadsRootDir, 'uploads');
            }

            await archive.finalize();
            await archivePromise;

            // 3. Clean up temporary SQL file
            fs.unlinkSync(sqlFile);

            // 4. Record in DB
            const stats = fs.statSync(zipFile);
            const [result] = await pool.query(
                'INSERT INTO backups (filename, size_bytes, type, status, trigger_source, operator_id) VALUES (?, ?, ?, ?, ?, ?)',
                [path.basename(zipFile), stats.size, 'local', 'success', triggerSource, operatorId]
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
            if (!skipCloudSync) {
                try {
                    const oauthStatus = await DropboxService.getStatus();
                    if (oauthStatus.connected) {
                        console.log(`[Backup] Syncing ${path.basename(zipFile)} to Dropbox...`);
                        const dropboxResponse = await DropboxService.uploadFile(zipFile);

                        if (dropboxResponse && dropboxResponse.id) {
                            await pool.query(
                                'INSERT INTO backups (filename, size_bytes, type, status, trigger_source, operator_id) VALUES (?, ?, ?, ?, ?, ?)',
                                [path.basename(zipFile), stats.size, 'dropbox', 'success', triggerSource, operatorId]
                            );

                            try {
                                await DropboxService.applyRetentionPolicy();
                            } catch (retentionError) {
                                await logger.error(operatorId, 'DROPBOX_RETENTION_ERROR', {
                                    filename: path.basename(zipFile),
                                    provider: 'dropbox',
                                    ...sanitizeForLog(requestContext),
                                    error: sanitizeForLog(retentionError)
                                }, null, { severity: 'warning', source: 'integration' });
                            }

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
        ensureDirectory(backupsRootDir);

        const [rows] = await pool.query(
            'SELECT id, filename FROM backups WHERE type = "local" ORDER BY created_at DESC LIMIT 100 OFFSET 7'
        );

        for (const row of rows) {
            const filePath = path.join(backupsRootDir, row.filename);
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
