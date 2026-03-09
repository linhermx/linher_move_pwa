import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

const args = new Set(process.argv.slice(2));
const applyChanges = args.has('--apply');
const verifyOnly = args.has('--verify-only');
const clearCatalogs = args.has('--clear-catalogs');
const clearNonAdminUsers = args.has('--clear-non-admin-users');
const singleAdmin = args.has('--single-admin');
const normalizeCoreIds = args.has('--normalize-core-ids');
const pruneNonAdminUsers = clearNonAdminUsers || singleAdmin;
const reseedCore = !args.has('--skip-core-reseed');

if (applyChanges && verifyOnly) {
    console.error('Use either --apply or --verify-only, not both.');
    process.exit(1);
}

if (normalizeCoreIds && !reseedCore) {
    console.error('--normalize-core-ids requires core reseed. Remove --skip-core-reseed.');
    process.exit(1);
}

const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASS || '',
    database: process.env.DB_NAME || 'linher_move',
    multipleStatements: true
};

const BASE_TRANSIENT_TABLES = [
    'quotation_services',
    'quotation_stops',
    'quotation_parameters',
    'quotation_costs',
    'quotation_routes',
    'quotation_reassignments',
    'quotations',
    'folio_counters',
    'logs',
    'backups',
    'integration_oauth_states',
    'integration_connections'
];

const OPTIONAL_CATALOG_TABLES = [
    'vehicles',
    'services'
];

const CORE_BASELINE_TABLES = [
    'user_permissions',
    'role_permissions',
    'users',
    'permissions',
    'global_settings',
    'roles'
];

const REQUIRED_PERMISSION_SLUGS = [
    'create_quotation',
    'view_history',
    'manage_fleet',
    'edit_settings',
    'manage_users',
    'manage_services',
    'manage_backups',
    'view_reports',
    'export_reports'
];

const REQUIRED_SETTING_KEYS = [
    'gasoline_price',
    'maneuver_factor',
    'traffic_factor',
    'base_efficiency',
    'lodging_tier1_cost',
    'lodging_tier2_cost',
    'lodging_tier3_cost',
    'meal_tier1_cost',
    'meal_tier2_cost',
    'meal_tier3_cost',
    'lodging_tier1_hours',
    'lodging_tier2_hours',
    'lodging_tier3_hours',
    'meal_tier1_hours',
    'meal_tier2_hours',
    'default_origin_address',
    'default_origin_lat',
    'default_origin_lng',
    'backups_enabled',
    'backup_frequency'
];

const getTargetTables = () => (
    clearCatalogs
        ? [...BASE_TRANSIENT_TABLES, ...OPTIONAL_CATALOG_TABLES]
        : [...BASE_TRANSIENT_TABLES]
);

const runCoreSeed = async (connection) => {
    const seedCorePath = path.join(__dirname, '../../database/seed_core.sql');
    const seedCoreSql = fs.readFileSync(seedCorePath, 'utf8');
    await connection.query(seedCoreSql);
};

const countRows = async (connection, tableName) => {
    const [rows] = await connection.query(`SELECT COUNT(*) AS total FROM \`${tableName}\``);
    return Number(rows[0]?.total || 0);
};

const getCounts = async (connection, tableNames) => {
    const counts = {};
    for (const tableName of tableNames) {
        counts[tableName] = await countRows(connection, tableName);
    }
    return counts;
};

const getMissingPermissions = async (connection) => {
    const [rows] = await connection.query(
        'SELECT slug FROM permissions WHERE slug IN (?)',
        [REQUIRED_PERMISSION_SLUGS]
    );
    const present = new Set(rows.map((row) => row.slug));
    return REQUIRED_PERMISSION_SLUGS.filter((slug) => !present.has(slug));
};

const getMissingSettings = async (connection) => {
    const [rows] = await connection.query(
        'SELECT setting_key FROM global_settings WHERE setting_key IN (?)',
        [REQUIRED_SETTING_KEYS]
    );
    const present = new Set(rows.map((row) => row.setting_key));
    return REQUIRED_SETTING_KEYS.filter((key) => !present.has(key));
};

const verifyState = async (connection, tableNames) => {
    const counts = await getCounts(connection, tableNames);
    const [adminRows] = await connection.query(`
        SELECT COUNT(*) AS total
        FROM users u
        LEFT JOIN roles r ON r.id = u.role_id
        WHERE u.status = 'active'
          AND (u.role_id = 1 OR LOWER(COALESCE(r.name, '')) = 'admin')
    `);
    const [userRows] = await connection.query('SELECT COUNT(*) AS total FROM users');
    const [roleRows] = await connection.query('SELECT COUNT(*) AS total FROM roles');
    const missingPermissions = await getMissingPermissions(connection);
    const missingSettings = await getMissingSettings(connection);

    const transientTablesAreClean = tableNames.every((tableName) => counts[tableName] === 0);
    const activeAdmins = Number(adminRows[0]?.total || 0);
    const totalUsers = Number(userRows[0]?.total || 0);
    const roleCount = Number(roleRows[0]?.total || 0);
    const adminBaselineOk = singleAdmin
        ? (activeAdmins === 1 && totalUsers === 1)
        : activeAdmins > 0;

    const verification = {
        transient_tables: counts,
        active_admins: activeAdmins,
        total_users: totalUsers,
        role_count: roleCount,
        missing_permissions: missingPermissions,
        missing_settings: missingSettings,
        clear_catalogs_applied: clearCatalogs,
        clear_non_admin_users_applied: pruneNonAdminUsers,
        single_admin_applied: singleAdmin,
        normalize_core_ids_applied: normalizeCoreIds,
        core_seed_reapplied: reseedCore,
        ok: (
            transientTablesAreClean
            && adminBaselineOk
            && roleCount >= 3
            && missingPermissions.length === 0
            && missingSettings.length === 0
        )
    };

    return verification;
};

const applySanitization = async (connection, tableNames) => {
    await connection.beginTransaction();
    try {
        await connection.query('SET FOREIGN_KEY_CHECKS = 0');

        for (const tableName of tableNames) {
            await connection.query(`TRUNCATE TABLE \`${tableName}\``);
        }

        if (normalizeCoreIds) {
            for (const tableName of CORE_BASELINE_TABLES) {
                await connection.query(`TRUNCATE TABLE \`${tableName}\``);
            }
        }

        if (reseedCore) {
            await runCoreSeed(connection);
        }

        if (singleAdmin) {
            let keeperUserId = null;

            const [adminCandidates] = await connection.query(`
                SELECT u.id
                FROM users u
                LEFT JOIN roles r ON r.id = u.role_id
                WHERE (u.role_id = 1 OR LOWER(COALESCE(r.name, '')) = 'admin')
                ORDER BY (u.id = 1) DESC, u.id ASC
                LIMIT 1
            `);
            keeperUserId = adminCandidates[0]?.id || null;

            if (!keeperUserId) {
                await connection.query(`
                    INSERT INTO users (name, email, password, role_id, status)
                    VALUES (?, ?, ?, ?, ?)
                    ON DUPLICATE KEY UPDATE
                        name = VALUES(name),
                        password = VALUES(password),
                        role_id = VALUES(role_id),
                        status = VALUES(status)
                `, ['Administrador LINHER', 'programador@linher.com.mx', 'admin123', 1, 'active']);

                const [reloadedCandidates] = await connection.query(`
                    SELECT u.id
                    FROM users u
                    LEFT JOIN roles r ON r.id = u.role_id
                    WHERE (u.role_id = 1 OR LOWER(COALESCE(r.name, '')) = 'admin')
                    ORDER BY (u.id = 1) DESC, u.id ASC
                    LIMIT 1
                `);
                keeperUserId = reloadedCandidates[0]?.id || null;
            }

            if (!keeperUserId) {
                throw new Error('Unable to ensure a single admin account.');
            }

            await connection.query('DELETE FROM user_permissions WHERE user_id <> ?', [keeperUserId]);
            await connection.query('DELETE FROM users WHERE id <> ?', [keeperUserId]);
        } else if (pruneNonAdminUsers) {
            await connection.query(`
                DELETE u
                FROM users u
                LEFT JOIN roles r ON r.id = u.role_id
                WHERE NOT (u.role_id = 1 OR LOWER(COALESCE(r.name, '')) = 'admin')
            `);
            await connection.query(`
                DELETE FROM user_permissions
                WHERE user_id NOT IN (SELECT id FROM users)
            `);
        }

        await connection.query('SET FOREIGN_KEY_CHECKS = 1');
        await connection.commit();
    } catch (error) {
        await connection.rollback();
        try {
            await connection.query('SET FOREIGN_KEY_CHECKS = 1');
        } catch {
            // No-op: best effort restore of FK checks.
        }
        throw error;
    }
};

const main = async () => {
    const tableNames = getTargetTables();
    const connection = await mysql.createConnection(dbConfig);

    try {
        if (!applyChanges && !verifyOnly) {
            const counts = await getCounts(connection, tableNames);
            console.log(JSON.stringify({
                mode: 'dry-run',
                message: 'No changes applied. Use --apply to execute sanitization.',
                target_tables: tableNames,
                current_counts: counts,
                options: {
                    clear_catalogs: clearCatalogs,
                    clear_non_admin_users: pruneNonAdminUsers,
                    single_admin: singleAdmin,
                    normalize_core_ids: normalizeCoreIds,
                    core_seed_reapplied_on_apply: reseedCore
                }
            }, null, 2));
            return;
        }

        if (applyChanges) {
            await applySanitization(connection, tableNames);
        }

        const verification = await verifyState(connection, tableNames);
        console.log(JSON.stringify({
            mode: applyChanges ? 'apply' : 'verify-only',
            verification
        }, null, 2));

        if (!verification.ok) {
            process.exitCode = 1;
        }
    } finally {
        await connection.end();
    }
};

main().catch((error) => {
    console.error('Delivery DB sanitization failed:', error.message);
    process.exit(1);
});
