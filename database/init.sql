-- Move Logistics Application - Database Schema
-- Version: 1.0

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

-- 5. Quotations
CREATE TABLE IF NOT EXISTS `quotations` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `folio` VARCHAR(20) NOT NULL UNIQUE,
  `user_id` INT,
  `vehicle_id` INT,
  `origin_address` TEXT NOT NULL,
  `destination_address` TEXT NOT NULL,
  `google_maps_link` TEXT,
  `num_trayectos` INT DEFAULT 1,
  `num_casetas` INT DEFAULT 0,
  `costo_casetas_unit` DECIMAL(10,2) DEFAULT 0,
  `gas_price_applied` DECIMAL(10,2),
  `factor_maniobra_applied` DECIMAL(10,2),
  `factor_trafico_applied` DECIMAL(10,2),
  `distance_total` DECIMAL(10,2),
  `time_total` INT, -- in minutes
  `costo_logistico_redondeado` DECIMAL(10,2),
  `subtotal` DECIMAL(10,2),
  `iva` DECIMAL(10,2),
  `total` DECIMAL(10,2),
  `status` ENUM('pendiente', 'en_proceso', 'completada', 'cancelada') DEFAULT 'pendiente',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`),
  FOREIGN KEY (`vehicle_id`) REFERENCES `vehicles`(`id`)
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
  `service_type` ENUM('interconexion', 'mantenimiento', 'comida', 'hospedaje'),
  `cost` DECIMAL(10,2) NOT NULL,
  `time_minutes` INT DEFAULT 0,
  FOREIGN KEY (`quotation_id`) REFERENCES `quotations`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 6. Logs & Auditing
CREATE TABLE IF NOT EXISTS `logs` (
  `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
  `log_type` ENUM('system', 'config', 'business', 'auth') NOT NULL,
  `user_id` INT,
  `action` VARCHAR(255) NOT NULL,
  `details` JSON,
  `ip_address` VARCHAR(45),
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Folio Counter Table (to ensure concurrency safety)
CREATE TABLE IF NOT EXISTS `folio_counters` (
  `year_month` VARCHAR(4) PRIMARY KEY, -- YYMM
  `last_count` INT DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Seed Basic Roles
INSERT IGNORE INTO `roles` (`name`, `description`) VALUES 
('admin', 'Control total del sistema'),
('supervisor', 'Gestión de flota y parámetros globales'),
('operador', 'Generación de cotizaciones');

-- Seed Basic Permissions
INSERT IGNORE INTO `permissions` (`slug`, `name`) VALUES 
('create_quotation', 'Crear Cotización'),
('view_history', 'Ver Historial'),
('manage_fleet', 'Gestionar Flota'),
('edit_settings', 'Editar Parámetros'),
('manage_users', 'Gestionar Usuarios');
