import pool from '../src/config/db.js';

const defaultSettings = [
    { key: 'gasoline_price', value: '24.50' },
    { key: 'maneuver_factor', value: '1.2' },
    { key: 'traffic_factor', value: '1.5' },
    { key: 'base_efficiency', value: '1.0' },
    // Lodging
    { key: 'lodging_tier1_cost', value: '1500' },
    { key: 'lodging_tier2_cost', value: '2400' },
    { key: 'lodging_tier3_cost', value: '3600' },
    // Meals
    { key: 'meal_tier1_cost', value: '200' },
    { key: 'meal_tier2_cost', value: '300' },
    { key: 'meal_tier3_cost', value: '500' },
    // Thresholds
    { key: 'lodging_tier1_hours', value: '6' },
    { key: 'lodging_tier2_hours', value: '11' },
    { key: 'lodging_tier3_hours', value: '17' },
    { key: 'meal_tier1_hours', value: '8' },
    { key: 'meal_tier2_hours', value: '12' },
    // Default Origin (Linher HQ)
    { key: 'default_origin_address', value: 'Puebla, Pue., México' },
    { key: 'default_origin_lat', value: '19.0414' },
    { key: 'default_origin_lng', value: '-98.2063' }
];

async function initSettings() {
    try {
        console.log('Iniciando configuración de ajustes...');

        // Cleanup old Spanish keys
        const oldKeys = [
            'factor_maniobra', 'factor_trafico', 'eficiencia_base',
            'hospedaje_tier1_hours', 'hospedaje_tier2_hours', 'hospedaje_tier3_hours',
            'viaticos_tier1_hours', 'viaticos_tier2_hours'
        ];
        await pool.query('DELETE FROM global_settings WHERE setting_key IN (?)', [oldKeys]);
        console.log('- Claves antiguas en español eliminadas.');

        for (const setting of defaultSettings) {
            // Usar INSERT ... ON DUPLICATE KEY UPDATE para evitar errores si ya existen
            const query = `
                INSERT INTO global_settings (setting_key, setting_value) 
                VALUES (?, ?) 
                ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)
            `;
            await pool.query(query, [setting.key, setting.value]);
            console.log(`- Configurado: ${setting.key} = ${setting.value}`);
        }

        console.log('¡Configuración completada con éxito!');
        process.exit(0);
    } catch (error) {
        console.error('Error inicializando ajustes:', error);
        process.exit(1);
    }
}

initSettings();
