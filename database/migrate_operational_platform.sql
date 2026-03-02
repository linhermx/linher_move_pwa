ALTER TABLE `logs`
  MODIFY COLUMN `log_type` ENUM('system', 'config', 'business', 'auth', 'error') NOT NULL;

ALTER TABLE `logs`
  ADD COLUMN IF NOT EXISTS `severity` ENUM('info', 'warning', 'error', 'critical') NOT NULL DEFAULT 'info' AFTER `log_type`,
  ADD COLUMN IF NOT EXISTS `source` VARCHAR(100) NOT NULL DEFAULT 'server' AFTER `action`;

ALTER TABLE `backups`
  MODIFY COLUMN `type` ENUM('local', 'dropbox', 'google_drive') DEFAULT 'local';

CREATE TABLE IF NOT EXISTS `integration_connections` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `provider` VARCHAR(50) NOT NULL UNIQUE,
  `status` ENUM('connected', 'disconnected', 'error') DEFAULT 'disconnected',
  `account_email` VARCHAR(255) NULL,
  `account_name` VARCHAR(255) NULL,
  `access_token` TEXT NULL,
  `refresh_token` TEXT NULL,
  `token_expires_at` DATETIME NULL,
  `connected_by_user_id` INT NULL,
  `last_sync_at` DATETIME NULL,
  `last_error_at` DATETIME NULL,
  `last_error_message` TEXT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`connected_by_user_id`) REFERENCES `users`(`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `integration_oauth_states` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `provider` VARCHAR(50) NOT NULL,
  `state_token` VARCHAR(255) NOT NULL UNIQUE,
  `operator_id` INT NULL,
  `expires_at` DATETIME NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`operator_id`) REFERENCES `users`(`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
