import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

async function initDB() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASS || '',
        multipleStatements: true
    });

    console.log('Connected to MySQL server.');

    const dbName = process.env.DB_NAME || 'linher_move';
    await connection.query(`CREATE DATABASE IF NOT EXISTS ${dbName}`);
    await connection.query(`USE ${dbName}`);
    console.log(`Database "${dbName}" ensured.`);

    const sqlPath = path.join(__dirname, '../../database/init.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    console.log('Executing init.sql...');
    await connection.query(sql);
    console.log('Database initialized successfully.');

    await connection.end();
}

initDB().catch(err => {
    console.error('Error initializing database:', err);
    process.exit(1);
});
