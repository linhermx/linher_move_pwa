-- Move Logistics Application - Database Schema
-- Version: 1.1 (Unified)

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
SET time_zone = "+00:00";

-- 1. Roles & Permissions
CREATE TABLE IF NOT EXISTS `roles` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(50) NOT NULL UNIQUE,
  `description` TEXT,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `permissions` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `slug` VARCHAR(100) NOT NULL UNIQUE,
  `name` VARCHAR(100) NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 2. Users
CREATE TABLE IF NOT EXISTS `users` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(100) NOT NULL,
  `email` VARCHAR(100) NOT NULL UNIQUE,
  `password` VARCHAR(255) NOT NULL,
  `role_id` INT,
  `photo_path` VARCHAR(255),
  `status` ENUM('active', 'inactive') DEFAULT 'active',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`role_id`) REFERENCES `roles`(`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `user_permissions` (
  `user_id` INT,
  `permission_id` INT,
  `granted` BOOLEAN DEFAULT TRUE,
  PRIMARY KEY (`user_id`, `permission_id`),
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`),
  FOREIGN KEY (`permission_id`) REFERENCES `permissions`(`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 3. Fleet
CREATE TABLE IF NOT EXISTS `vehicles` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(100) NOT NULL,
  `plate` VARCHAR(20) UNIQUE,
  `rendimiento_teorico` DECIMAL(10,2) NOT NULL,
  `rendimiento_real` DECIMAL(10,2) NOT NULL,
  `photo_path` VARCHAR(255),
  `status` ENUM('available', 'in_route', 'maintenance') DEFAULT 'available',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 4. Settings
CREATE TABLE IF NOT EXISTS `global_settings` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `setting_key` VARCHAR(50) NOT NULL UNIQUE,
  `setting_value` VARCHAR(255) NOT NULL,
  `description` TEXT,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 5. Services (Catalog)
CREATE TABLE IF NOT EXISTS `services` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(100) NOT NULL,
  `cost` DECIMAL(10,2) NOT NULL DEFAULT 0,
  `time_minutes` INT NOT NULL DEFAULT 0,
  `description` TEXT,
  `status` ENUM('active', 'inactive') DEFAULT 'active',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 6. Quotations
CREATE TABLE IF NOT EXISTS `quotations` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `folio` VARCHAR(20) NOT NULL UNIQUE,
  `user_id` INT,
  `vehicle_id` INT,
  `status` ENUM('pendiente', 'en_proceso', 'completada', 'cancelada') DEFAULT 'pendiente',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`),
  FOREIGN KEY (`vehicle_id`) REFERENCES `vehicles`(`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `quotation_routes` (
  `quotation_id` INT PRIMARY KEY,
  `origin_address` TEXT NOT NULL,
  `destination_address` TEXT NOT NULL,
  `origin_lat` DECIMAL(10,8),
  `origin_lng` DECIMAL(11,8),
  `destination_lat` DECIMAL(10,8),
  `destination_lng` DECIMAL(11,8),
  `google_maps_link` TEXT,
  `distance_total` DECIMAL(10,2) DEFAULT 0,
  `time_total` INT DEFAULT 0,
  `time_traffic_min` INT DEFAULT 0,
  `time_services_min` INT DEFAULT 0,
  FOREIGN KEY (`quotation_id`) REFERENCES `quotations`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `quotation_costs` (
  `quotation_id` INT PRIMARY KEY,
  `toll_cost` DECIMAL(10,2) DEFAULT 0,
  `lodging_cost` DECIMAL(10,2) DEFAULT 0,
  `meal_cost` DECIMAL(10,2) DEFAULT 0,
  `gas_liters` DECIMAL(10,2) DEFAULT 0,
  `gas_cost` DECIMAL(10,2) DEFAULT 0,
  `logistics_cost_raw` DECIMAL(10,2) DEFAULT 0,
  `logistics_cost_rounded` DECIMAL(10,2) DEFAULT 0,
  `subtotal` DECIMAL(10,2) DEFAULT 0,
  `iva` DECIMAL(10,2) DEFAULT 0,
  `total` DECIMAL(10,2) DEFAULT 0,
  FOREIGN KEY (`quotation_id`) REFERENCES `quotations`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `quotation_parameters` (
  `quotation_id` INT PRIMARY KEY,
  `num_legs` INT DEFAULT 1,
  `num_tolls` INT DEFAULT 0,
  `toll_unit_cost` DECIMAL(10,2) DEFAULT 0,
  `gas_price_applied` DECIMAL(10,2) DEFAULT 0,
  `maneuver_factor_applied` DECIMAL(10,2) DEFAULT 1,
  `traffic_factor_applied` DECIMAL(10,2) DEFAULT 1,
  FOREIGN KEY (`quotation_id`) REFERENCES `quotations`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `quotation_stops` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `quotation_id` INT,
  `address` TEXT NOT NULL,
  `order_index` INT NOT NULL,
  FOREIGN KEY (`quotation_id`) REFERENCES `quotations`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `quotation_services` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `quotation_id` INT,
  `service_id` INT,
  `cost` DECIMAL(10,2) NOT NULL,
  `time_minutes` INT DEFAULT 0,
  FOREIGN KEY (`quotation_id`) REFERENCES `quotations`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`service_id`) REFERENCES `services`(`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 7. Logs & Auditing
CREATE TABLE IF NOT EXISTS `logs` (
  `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
  `log_type` ENUM('system', 'config', 'business', 'auth', 'error') NOT NULL,
  `severity` ENUM('info', 'warning', 'error', 'critical') NOT NULL DEFAULT 'info',
  `user_id` INT,
  `action` VARCHAR(255) NOT NULL,
  `source` VARCHAR(100) NOT NULL DEFAULT 'server',
  `details` JSON,
  `ip_address` VARCHAR(45),
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 8. Folio Counter Table (to ensure concurrency safety)
CREATE TABLE IF NOT EXISTS `folio_counters` (
  `year_month` VARCHAR(4) PRIMARY KEY, -- YYMM
  `last_count` INT DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 10. Backup Management
CREATE TABLE IF NOT EXISTS `backups` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `filename` VARCHAR(255) NOT NULL,
  `size_bytes` BIGINT NOT NULL,
  `type` ENUM('local', 'dropbox', 'google_drive') DEFAULT 'local',
  `status` ENUM('success', 'failed', 'pending') DEFAULT 'pending',
  `trigger_source` ENUM('manual', 'automated') NOT NULL DEFAULT 'manual',
  `operator_id` INT,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`operator_id`) REFERENCES `users`(`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `integration_connections` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `provider` VARCHAR(50) NOT NULL UNIQUE,
  `status` ENUM('connected', 'disconnected', 'error') DEFAULT 'disconnected',
  `account_email` VARCHAR(255),
  `account_name` VARCHAR(255),
  `access_token` TEXT,
  `refresh_token` TEXT,
  `token_expires_at` DATETIME,
  `connected_by_user_id` INT,
  `last_sync_at` DATETIME,
  `last_error_at` DATETIME,
  `last_error_message` TEXT,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`connected_by_user_id`) REFERENCES `users`(`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `integration_oauth_states` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `provider` VARCHAR(50) NOT NULL,
  `state_token` VARCHAR(255) NOT NULL UNIQUE,
  `operator_id` INT,
  `expires_at` DATETIME NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`operator_id`) REFERENCES `users`(`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 9. Seed Data
-- Seed Basic Roles
INSERT IGNORE INTO `roles` (`id`, `name`, `description`) VALUES 
(1, 'admin', 'Control total del sistema'),
(2, 'supervisor', 'Gestión de flota y parámetros globales'),
(3, 'operador', 'Generación de cotizaciones');

-- Seed Basic Permissions
INSERT IGNORE INTO `permissions` (`slug`, `name`) VALUES 
('create_quotation', 'Crear Cotización'),
('view_history', 'Ver Historial'),
('manage_fleet', 'Gestionar Flota'),
('edit_settings', 'Editar Parámetros'),
('manage_users', 'Gestionar Usuarios'),
('manage_services', 'Gestionar Servicios'),
('manage_backups', 'Gestionar Respaldos');

CREATE TABLE IF NOT EXISTS `role_permissions` (
  `role_id` INT,
  `permission_id` INT,
  PRIMARY KEY (`role_id`, `permission_id`),
  FOREIGN KEY (`role_id`) REFERENCES `roles`(`id`),
  FOREIGN KEY (`permission_id`) REFERENCES `permissions`(`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Seed Role Permissions
-- Admin (Everything)
INSERT IGNORE INTO `role_permissions` (`role_id`, `permission_id`) 
SELECT 1, id FROM `permissions`;

-- Supervisor (Quotes, History, Fleet, Services)
INSERT IGNORE INTO `role_permissions` (`role_id`, `permission_id`) 
SELECT 2, id FROM `permissions` WHERE slug IN ('create_quotation', 'view_history', 'manage_fleet', 'manage_services');

-- Operador (Quotes, History)
INSERT IGNORE INTO `role_permissions` (`role_id`, `permission_id`) 
SELECT 3, id FROM `permissions` WHERE slug IN ('create_quotation', 'view_history');

-- Seed Default Services
INSERT IGNORE INTO `services` (`id`, `name`, `cost`, `time_minutes`, `description`) VALUES 
(1, 'Interconexión', 200.00, 30, 'Costo por maniobras de interconexión'),
(2, 'Mantenimiento', 500.00, 60, 'Mantenimiento preventivo en sitio'),
(3, 'Comida', 150.00, 45, 'Apoyo para alimentos del operador'),
(4, 'Hospedaje', 800.00, 480, 'Costo por noche de hospedaje'),
(5, 'Maniobra Carga/Descarga', 1200.00, 120, 'Servicio profesional de carga y descarga');

INSERT IGNORE INTO `global_settings` (`setting_key`, `setting_value`, `description`) VALUES
('backups_enabled', 'false', 'Enable automated backups from the server scheduler'),
('backup_frequency', 'daily', 'Automatic backup frequency: daily or weekly');

-- Seed Default Admin User (Password: admin123)
-- Note: In a real app, use hashed passwords.
INSERT IGNORE INTO `users` (`id`, `name`, `email`, `password`, `role_id`, `status`) VALUES 
(1, 'Administrador Linher', 'admin@linher.com', 'admin123', 1, 'active');
