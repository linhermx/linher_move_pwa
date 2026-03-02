import mysql from 'mysql2/promise';
import fs from 'fs';
import fsp from 'fs/promises';
import os from 'os';
import path from 'path';
import dotenv from 'dotenv';
import { exec as execCallback } from 'child_process';
import { promisify } from 'util';
import { fileURLToPath } from 'url';
import { ensureOperationalSchema } from '../src/utils/SchemaManager.js';

const execPromise = promisify(execCallback);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

const projectRoot = path.join(__dirname, '..');
const backupsDir = path.join(projectRoot, 'backups');
const uploadsTargetDir = path.join(projectRoot, 'uploads');

const args = process.argv.slice(2);
const positionalArgs = args.filter((arg) => !arg.startsWith('--'));
const requestedPath = positionalArgs[0] || null;
const replaceUploads = !args.includes('--merge-uploads');
const skipUploads = args.includes('--skip-uploads');
const skipDatabase = args.includes('--skip-db');

const resolveMysqlBinary = () => {
    const configuredPath = process.env.MYSQL_PATH?.trim();
    if (configuredPath) {
        return configuredPath;
    }

    const xamppDefaultPath = 'C:\\xampp\\mysql\\bin\\mysql.exe';
    if (process.platform === 'win32' && fs.existsSync(xamppDefaultPath)) {
        return xamppDefaultPath;
    }

    return 'mysql';
};

const quote = (value) => `"${String(value).replace(/"/g, '\\"')}"`;
const quotePowerShellLiteral = (value) => `'${String(value).replace(/'/g, "''")}'`;

const resolveZipPath = async () => {
    if (requestedPath) {
        return path.isAbsolute(requestedPath)
            ? requestedPath
            : path.resolve(process.cwd(), requestedPath);
    }

    const files = await fsp.readdir(backupsDir);
    const zipFiles = await Promise.all(
        files
            .filter((file) => file.toLowerCase().endsWith('.zip'))
            .map(async (file) => {
                const fullPath = path.join(backupsDir, file);
                const stats = await fsp.stat(fullPath);
                return { fullPath, mtimeMs: stats.mtimeMs };
            })
    );

    if (!zipFiles.length) {
        throw new Error('No local backup zip files were found.');
    }

    zipFiles.sort((a, b) => b.mtimeMs - a.mtimeMs);
    return zipFiles[0].fullPath;
};

const extractArchive = async (zipPath, destinationDir) => {
    if (process.platform === 'win32') {
        const command = `powershell -NoProfile -Command "Expand-Archive -LiteralPath ${quotePowerShellLiteral(zipPath)} -DestinationPath ${quotePowerShellLiteral(destinationDir)} -Force"`;
        await execPromise(command);
        return;
    }

    await execPromise(`unzip -o ${quote(zipPath)} -d ${quote(destinationDir)}`);
};

const copyDirectoryContents = async (sourceDir, targetDir) => {
    await fsp.mkdir(targetDir, { recursive: true });
    await fsp.cp(sourceDir, targetDir, { recursive: true, force: true });
};

const recreateDirectory = async (directoryPath) => {
    await fsp.rm(directoryPath, { recursive: true, force: true });
    await fsp.mkdir(directoryPath, { recursive: true });
};

const importDatabase = async (sqlFilePath) => {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASS || '',
        multipleStatements: true
    });

    const dbName = process.env.DB_NAME || 'linher_move';
    await connection.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\``);
    await connection.end();

    const mysqlBinary = resolveMysqlBinary();
    const host = process.env.DB_HOST || 'localhost';
    const user = process.env.DB_USER || 'root';
    const passwordArg = process.env.DB_PASS ? `-p${process.env.DB_PASS}` : '';
    const importCommand = `${quote(mysqlBinary)} -h ${host} -u ${user} ${passwordArg} ${dbName} < ${quote(sqlFilePath)}`;

    await execPromise(importCommand);
};

const reapplyOperationalSchema = async () => {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASS || '',
        database: process.env.DB_NAME || 'linher_move'
    });

    try {
        await ensureOperationalSchema(connection);
    } finally {
        await connection.end();
    }
};

const main = async () => {
    const zipPath = await resolveZipPath();
    const tempDir = await fsp.mkdtemp(path.join(os.tmpdir(), 'linher-restore-'));

    try {
        console.log(`Using backup: ${zipPath}`);
        await extractArchive(zipPath, tempDir);

        const sqlFilePath = path.join(tempDir, 'database.sql');
        const uploadsSourceDir = path.join(tempDir, 'uploads');

        if (!skipDatabase) {
            if (!fs.existsSync(sqlFilePath)) {
                throw new Error('database.sql was not found inside the backup archive.');
            }

            console.log('Restoring database...');
            await importDatabase(sqlFilePath);
            await reapplyOperationalSchema();
            console.log('Database restored successfully.');
        }

        if (!skipUploads && fs.existsSync(uploadsSourceDir)) {
            console.log(`${replaceUploads ? 'Replacing' : 'Merging'} uploads directory...`);
            if (replaceUploads) {
                await recreateDirectory(uploadsTargetDir);
            } else {
                await fsp.mkdir(uploadsTargetDir, { recursive: true });
            }

            await copyDirectoryContents(uploadsSourceDir, uploadsTargetDir);
            console.log('Uploads restored successfully.');
        }

        console.log(JSON.stringify({
            backup: zipPath,
            database_restored: !skipDatabase,
            uploads_restored: !skipUploads && fs.existsSync(uploadsSourceDir),
            uploads_mode: skipUploads ? 'skipped' : (replaceUploads ? 'replace' : 'merge')
        }, null, 2));
    } finally {
        await fsp.rm(tempDir, { recursive: true, force: true });
    }
};

main().catch((error) => {
    console.error('Backup restore failed:', error.message);
    process.exit(1);
});
