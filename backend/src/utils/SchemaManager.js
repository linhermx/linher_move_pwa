const columnExists = async (db, tableName, columnName) => {
    const [rows] = await db.query(
        `
            SELECT 1
            FROM information_schema.COLUMNS
            WHERE TABLE_SCHEMA = DATABASE()
              AND TABLE_NAME = ?
              AND COLUMN_NAME = ?
            LIMIT 1
        `,
        [tableName, columnName]
    );

    return rows.length > 0;
};

const tableExists = async (db, tableName) => {
    const [rows] = await db.query(
        `
            SELECT 1
            FROM information_schema.TABLES
            WHERE TABLE_SCHEMA = DATABASE()
              AND TABLE_NAME = ?
            LIMIT 1
        `,
        [tableName]
    );

    return rows.length > 0;
};

export const ensureOperationalSchema = async (db) => {
    await db.query(`
        CREATE TABLE IF NOT EXISTS logs (
            id BIGINT AUTO_INCREMENT PRIMARY KEY,
            log_type ENUM('system', 'config', 'business', 'auth', 'error') NOT NULL,
            severity ENUM('info', 'warning', 'error', 'critical') NOT NULL DEFAULT 'info',
            user_id INT NULL,
            action VARCHAR(255) NOT NULL,
            source VARCHAR(100) NOT NULL DEFAULT 'server',
            details JSON NULL,
            ip_address VARCHAR(45) NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    await db.query(`
        CREATE TABLE IF NOT EXISTS backups (
            id INT AUTO_INCREMENT PRIMARY KEY,
            filename VARCHAR(255) NOT NULL,
            size_bytes BIGINT NOT NULL,
            type ENUM('local', 'dropbox', 'google_drive') DEFAULT 'local',
            status ENUM('success', 'failed', 'pending') DEFAULT 'pending',
            operator_id INT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (operator_id) REFERENCES users(id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    await db.query(`
        CREATE TABLE IF NOT EXISTS integration_connections (
            id INT AUTO_INCREMENT PRIMARY KEY,
            provider VARCHAR(50) NOT NULL UNIQUE,
            status ENUM('connected', 'disconnected', 'error') DEFAULT 'disconnected',
            account_email VARCHAR(255) NULL,
            account_name VARCHAR(255) NULL,
            access_token TEXT NULL,
            refresh_token TEXT NULL,
            token_expires_at DATETIME NULL,
            connected_by_user_id INT NULL,
            last_sync_at DATETIME NULL,
            last_error_at DATETIME NULL,
            last_error_message TEXT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            FOREIGN KEY (connected_by_user_id) REFERENCES users(id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    await db.query(`
        CREATE TABLE IF NOT EXISTS integration_oauth_states (
            id INT AUTO_INCREMENT PRIMARY KEY,
            provider VARCHAR(50) NOT NULL,
            state_token VARCHAR(255) NOT NULL UNIQUE,
            operator_id INT NULL,
            expires_at DATETIME NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (operator_id) REFERENCES users(id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    if (await tableExists(db, 'logs')) {
        await db.query(`
            ALTER TABLE logs
            MODIFY COLUMN log_type ENUM('system', 'config', 'business', 'auth', 'error') NOT NULL
        `);
    }

    if (!(await columnExists(db, 'logs', 'severity'))) {
        await db.query(`
            ALTER TABLE logs
            ADD COLUMN severity ENUM('info', 'warning', 'error', 'critical') NOT NULL DEFAULT 'info' AFTER log_type
        `);
    }

    if (!(await columnExists(db, 'logs', 'source'))) {
        await db.query(`
            ALTER TABLE logs
            ADD COLUMN source VARCHAR(100) NOT NULL DEFAULT 'server' AFTER action
        `);
    }

    await db.query(`
        ALTER TABLE backups
        MODIFY COLUMN type ENUM('local', 'dropbox', 'google_drive') DEFAULT 'local'
    `);

    if (!(await columnExists(db, 'backups', 'trigger_source'))) {
        await db.query(`
            ALTER TABLE backups
            ADD COLUMN trigger_source ENUM('manual', 'automated') NOT NULL DEFAULT 'manual' AFTER status
        `);
    }

    await db.query(`
        INSERT IGNORE INTO global_settings (setting_key, setting_value, description)
        VALUES
            ('backups_enabled', 'false', 'Enable automated backups from the server scheduler'),
            ('backup_frequency', 'daily', 'Automatic backup frequency: daily or weekly')
    `);
};
