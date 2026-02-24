import pool from '../src/config/db.js';

async function checkSettings() {
    try {
        const [rows] = await pool.query('SELECT * FROM global_settings');
        console.log('Current Settings:');
        console.table(rows);
        process.exit(0);
    } catch (error) {
        console.error('Error fetching settings:', error);
        process.exit(1);
    }
}

checkSettings();
