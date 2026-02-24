import pool from '../src/config/db.js';

const defaultSettings = [
    { key: 'gasoline_price', value: '24.50' },
    { key: 'factor_maniobra', value: '1.2' },
    { key: 'factor_trafico', value: '1.5' },
    { key: 'eficiencia_base', value: '1.0' },
    // Hospedaje (Ida)
    { key: 'lodging_tier1_cost', value: '1500' }, // +6h
    { key: 'lodging_tier2_cost', value: '2400' }, // +11h
    { key: 'lodging_tier3_cost', value: '3600' }, // +17h
    // Alimentos (Total/Lodging)
    { key: 'meal_tier1_cost', value: '200' }, // +8h jornada
    { key: 'meal_tier2_cost', value: '300' }, // +12h total
    { key: 'meal_tier3_cost', value: '500' }, // con hospedaje
    // Umbrales
    { key: 'hospedaje_tier1_hours', value: '6' },
    { key: 'hospedaje_tier2_hours', value: '11' },
    { key: 'hospedaje_tier3_hours', value: '17' },
    { key: 'viaticos_tier1_hours', value: '8' },
    { key: 'viaticos_tier2_hours', value: '12' }
];

async function initSettings() {
    try {
        console.log('Iniciando configuración de ajustes...');

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
