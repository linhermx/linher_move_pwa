import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASS || process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'linher_move',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
};

const INDEXES = [
    { table: 'quotations', name: 'idx_quotations_created_at', columns: 'created_at' },
    { table: 'quotations', name: 'idx_quotations_status_created_at', columns: 'status, created_at' },
    { table: 'quotations', name: 'idx_quotations_user_created_at', columns: 'user_id, created_at' }
];

const indexExists = async (connection, tableName, indexName) => {
    const [rows] = await connection.query(
        'SHOW INDEX FROM ?? WHERE Key_name = ?',
        [tableName, indexName]
    );
    return rows.length > 0;
};

async function migrateQuoteTypeIndexes() {
    const pool = mysql.createPool(dbConfig);
    const connection = await pool.getConnection();

    try {
        console.log('Starting quote type performance index migration...');

        for (const indexDefinition of INDEXES) {
            const exists = await indexExists(connection, indexDefinition.table, indexDefinition.name);
            if (exists) {
                console.log(`Index already exists: ${indexDefinition.name}`);
                continue;
            }

            await connection.query(
                `ALTER TABLE \`${indexDefinition.table}\` ADD INDEX \`${indexDefinition.name}\` (${indexDefinition.columns})`
            );
            console.log(`Index created: ${indexDefinition.name}`);
        }

        console.log('Quote type performance index migration completed.');
    } catch (error) {
        console.error('Quote type index migration failed:', error);
        process.exitCode = 1;
    } finally {
        connection.release();
        await pool.end();
    }
}

migrateQuoteTypeIndexes();
