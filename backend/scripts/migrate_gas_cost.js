import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASS || '',
    database: process.env.DB_NAME || 'linher_move'
};

async function migrate() {
    try {
        const connection = await mysql.createConnection(dbConfig);
        console.log('Connected to database.');

        const columnsToAdd = [
            { name: 'origin_lat', type: 'DECIMAL(10,8)' },
            { name: 'origin_lng', type: 'DECIMAL(11,8)' },
            { name: 'destination_lat', type: 'DECIMAL(10,8)' },
            { name: 'destination_lng', type: 'DECIMAL(11,8)' },
            { name: 'time_traffic_min', type: 'INT' },
            { name: 'time_services_min', type: 'INT' },
            { name: 'gas_liters', type: 'DECIMAL(10,2)' },
            { name: 'gas_cost', type: 'DECIMAL(12,2)' }
        ];

        const [existingColumns] = await connection.query('SHOW COLUMNS FROM quotations');
        const columnNames = existingColumns.map(c => c.Field);

        for (const col of columnsToAdd) {
            if (!columnNames.includes(col.name)) {
                console.log(`Adding column ${col.name}...`);
                await connection.query(`ALTER TABLE quotations ADD COLUMN ${col.name} ${col.type}`);
            }
        }

        console.log('Migration completed successfully.');
        await connection.end();
    } catch (error) {
        console.error('Migration failed:', error);
    }
}

migrate();
