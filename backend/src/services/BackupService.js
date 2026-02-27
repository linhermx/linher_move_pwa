import { exec } from 'child_process';
import path from 'path';
import fs from 'fs';
import archiver from 'archiver';
import { fileURLToPath } from 'url';
import pool from '../config/db.js';
import { promisify } from 'util';

const execPromise = promisify(exec);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const BackupService = {
    async generateLocalBackup(operatorId = null) {
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

            // 5. Retention Policy (keep last 7)
            await this.applyRetentionPolicy();

            return { id: result.insertId, filename: path.basename(zipFile) };
        } catch (error) {
            console.error('Backup Error:', error);
            if (fs.existsSync(sqlFile)) fs.unlinkSync(sqlFile);
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
