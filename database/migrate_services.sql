-- Migration: Dynamic Services
-- Date: 2026-02-20

USE linher_move;

-- 1. Create services table
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

-- 2. Seed default services
INSERT IGNORE INTO `services` (`name`, `cost`, `time_minutes`, `description`) VALUES 
('Interconexión', 200.00, 30, 'Costo por maniobras de interconexión'),
('Mantenimiento', 500.00, 60, 'Mantenimiento preventivo en sitio'),
('Comida', 150.00, 45, 'Apoyo para alimentos del operador'),
('Hospedaje', 800.00, 480, 'Costo por noche de hospedaje');

-- 3. Prepare quotation_services for the new structure
-- Add service_id column
ALTER TABLE `quotation_services` ADD COLUMN `service_id` INT AFTER `quotation_id`;
ALTER TABLE `quotation_services` ADD CONSTRAINT `fk_quotation_services_service` FOREIGN KEY (`service_id`) REFERENCES `services`(`id`);

-- Note: We keep service_type for now to avoid breaking existing data, 
-- but we should plan to deprecate it.
