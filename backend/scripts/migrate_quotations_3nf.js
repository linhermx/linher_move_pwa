import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../../.env') });

const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'linher_move',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
};

async function migrate() {
    console.log('--- Iniciando Migración a 3FN para la tabla Quotations ---');
    const pool = mysql.createPool(dbConfig);
    const connection = await pool.getConnection();

    try {
        await connection.beginTransaction();

        // 1. Crear las nuevas tablas si no existen
        console.log('1. Creando nuevas tablas 3FN si no existen...');
        await connection.query(`
            CREATE TABLE IF NOT EXISTS \`quotation_routes\` (
              \`quotation_id\` INT PRIMARY KEY,
              \`origin_address\` TEXT NOT NULL,
              \`destination_address\` TEXT NOT NULL,
              \`origin_lat\` DECIMAL(10,8),
              \`origin_lng\` DECIMAL(11,8),
              \`destination_lat\` DECIMAL(10,8),
              \`destination_lng\` DECIMAL(11,8),
              \`google_maps_link\` TEXT,
              \`distance_total\` DECIMAL(10,2) DEFAULT 0,
              \`time_total\` INT DEFAULT 0,
              \`time_traffic_min\` INT DEFAULT 0,
              \`time_services_min\` INT DEFAULT 0,
              FOREIGN KEY (\`quotation_id\`) REFERENCES \`quotations\`(\`id\`) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        `);

        await connection.query(`
            CREATE TABLE IF NOT EXISTS \`quotation_costs\` (
              \`quotation_id\` INT PRIMARY KEY,
              \`toll_cost\` DECIMAL(10,2) DEFAULT 0,
              \`lodging_cost\` DECIMAL(10,2) DEFAULT 0,
              \`meal_cost\` DECIMAL(10,2) DEFAULT 0,
              \`gas_liters\` DECIMAL(10,2) DEFAULT 0,
              \`gas_cost\` DECIMAL(10,2) DEFAULT 0,
              \`logistics_cost_raw\` DECIMAL(10,2) DEFAULT 0,
              \`logistics_cost_rounded\` DECIMAL(10,2) DEFAULT 0,
              \`subtotal\` DECIMAL(10,2) DEFAULT 0,
              \`iva\` DECIMAL(10,2) DEFAULT 0,
              \`total\` DECIMAL(10,2) DEFAULT 0,
              FOREIGN KEY (\`quotation_id\`) REFERENCES \`quotations\`(\`id\`) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        `);

        await connection.query(`
            CREATE TABLE IF NOT EXISTS \`quotation_parameters\` (
              \`quotation_id\` INT PRIMARY KEY,
              \`num_legs\` INT DEFAULT 1,
              \`num_tolls\` INT DEFAULT 0,
              \`toll_unit_cost\` DECIMAL(10,2) DEFAULT 0,
              \`gas_price_applied\` DECIMAL(10,2) DEFAULT 0,
              \`maneuver_factor_applied\` DECIMAL(10,2) DEFAULT 1,
              \`traffic_factor_applied\` DECIMAL(10,2) DEFAULT 1,
              FOREIGN KEY (\`quotation_id\`) REFERENCES \`quotations\`(\`id\`) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        `);

        // 2. Revisar si la tabla original quotes todavía tiene columnas viejas para migrar datos
        const [columns] = await connection.query("SHOW COLUMNS FROM `quotations` LIKE 'origin_address'");

        if (columns.length > 0) {
            console.log('2. Migrando datos a las nuevas tablas...');

            // a) Migrar Routes
            await connection.query(`
                INSERT IGNORE INTO quotation_routes (
                    quotation_id, origin_address, destination_address, google_maps_link,
                    distance_total, time_total
                )
                SELECT id, origin_address, destination_address, google_maps_link,
                       distance_total, time_total
                FROM quotations
            `);

            // b) Migrar Costs
            await connection.query(`
                INSERT IGNORE INTO quotation_costs (
                    quotation_id, toll_cost, lodging_cost, meal_cost, logistics_cost_raw,
                    logistics_cost_rounded, subtotal, iva, total
                )
                SELECT id, toll_cost, lodging_cost, meal_cost, logistics_cost_raw,
                       costo_logistico_redondeado, subtotal, iva, total
                FROM quotations
            `);

            // c) Migrar Parameters
            await connection.query(`
                INSERT IGNORE INTO quotation_parameters (
                    quotation_id, num_legs, num_tolls, toll_unit_cost, gas_price_applied,
                    maneuver_factor_applied, traffic_factor_applied
                )
                SELECT id, num_trayectos, num_casetas, costo_casetas_unit, gas_price_applied,
                       factor_maniobra_applied, factor_trafico_applied
                FROM quotations
            `);

            console.log('3. Datos migrados exitosamente. Eliminando columnas viejas de la tabla quotations...');

            // Eliminar las columnas viejas
            await connection.query(`
                ALTER TABLE \`quotations\`
                DROP COLUMN IF EXISTS \`origin_address\`,
                DROP COLUMN IF EXISTS \`destination_address\`,
                DROP COLUMN IF EXISTS \`google_maps_link\`,
                DROP COLUMN IF EXISTS \`num_trayectos\`,
                DROP COLUMN IF EXISTS \`num_casetas\`,
                DROP COLUMN IF EXISTS \`costo_casetas_unit\`,
                DROP COLUMN IF EXISTS \`gas_price_applied\`,
                DROP COLUMN IF EXISTS \`factor_maniobra_applied\`,
                DROP COLUMN IF EXISTS \`factor_trafico_applied\`,
                DROP COLUMN IF EXISTS \`distance_total\`,
                DROP COLUMN IF EXISTS \`time_total\`,
                DROP COLUMN IF EXISTS \`toll_cost\`,
                DROP COLUMN IF EXISTS \`lodging_cost\`,
                DROP COLUMN IF EXISTS \`meal_cost\`,
                DROP COLUMN IF EXISTS \`logistics_cost_raw\`,
                DROP COLUMN IF EXISTS \`costo_logistico_redondeado\`,
                DROP COLUMN IF EXISTS \`subtotal\` ,
                DROP COLUMN IF EXISTS \`iva\`,
                DROP COLUMN IF EXISTS \`total\`
            `);

            console.log('Columnas eliminadas. Tabla quotations limpiada (3FN).');
        } else {
            console.log('-> Las columnas viejas ya no existen. Parece que la base de datos ya está en 3FN.');
        }

        await connection.commit();
        console.log('--- Migración completada exitosamente ---');
    } catch (error) {
        await connection.rollback();
        console.error('ERROR durante la migración:', error);
    } finally {
        connection.release();
        process.exit();
    }
}

migrate();
