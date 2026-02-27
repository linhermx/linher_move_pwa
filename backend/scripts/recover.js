import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

async function recover() {
    const pool = mysql.createPool({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'linher_move',
    });

    try {
        console.log('Recovering missing columns from quotations...');

        // Let's check if the columns exist in quotations
        const [cols] = await pool.query("SHOW COLUMNS FROM quotations LIKE 'origin_lat'");
        if (cols.length > 0) {
            console.log('Columns exist! Moving them to quotation_routes and quotation_costs...');

            // Move lat/lng and times to quotation_routes
            await pool.query(`
                UPDATE quotation_routes qr
                JOIN quotations q ON qr.quotation_id = q.id
                SET qr.origin_lat = q.origin_lat,
                    qr.origin_lng = q.origin_lng,
                    qr.destination_lat = q.destination_lat,
                    qr.destination_lng = q.destination_lng,
                    qr.time_traffic_min = q.time_traffic_min,
                    qr.time_services_min = q.time_services_min
            `);

            // Move gas_liters and gas_cost to quotation_costs
            await pool.query(`
                UPDATE quotation_costs qc
                JOIN quotations q ON qc.quotation_id = q.id
                SET qc.gas_liters = q.gas_liters,
                    qc.gas_cost = q.gas_cost
            `);

            console.log('Successfully recovered data into new tables.');

            // Now drop them from quotations to clean up fully
            await pool.query(`
                ALTER TABLE quotations
                DROP COLUMN origin_lat,
                DROP COLUMN origin_lng,
                DROP COLUMN destination_lat,
                DROP COLUMN destination_lng,
                DROP COLUMN time_traffic_min,
                DROP COLUMN time_services_min,
                DROP COLUMN gas_liters,
                DROP COLUMN gas_cost
            `).catch(e => console.log('Could not drop some columns, maybe already dropped.', e.message));

            console.log('Dropped legacy columns from quotations.');
        } else {
            console.log('Legacy columns do not exist in quotations anymore.');
        }
    } catch (e) {
        console.error(e);
    } finally {
        pool.end();
        process.exit(0);
    }
}
recover();
