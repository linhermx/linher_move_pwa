-- Core seed for clean production bootstrap
-- This file should only contain mandatory baseline records.

USE linher_move;

-- Seed basic roles
INSERT IGNORE INTO `roles` (`id`, `name`, `description`) VALUES
(1, 'admin', 'Control total del sistema'),
(2, 'supervisor', 'Gestion de flota y parametros globales'),
(3, 'operador', 'Generacion de cotizaciones');

-- Seed basic permissions
INSERT IGNORE INTO `permissions` (`slug`, `name`) VALUES
('create_quotation', 'Crear Cotizacion'),
('view_history', 'Ver Historial'),
('manage_fleet', 'Gestionar Flota'),
('edit_settings', 'Editar Parametros'),
('manage_users', 'Gestionar Usuarios'),
('manage_services', 'Gestionar Servicios'),
('manage_backups', 'Gestionar Respaldos'),
('view_reports', 'Ver Reportes'),
('export_reports', 'Exportar Reportes');

-- Seed role permissions
-- Admin: all permissions
INSERT IGNORE INTO `role_permissions` (`role_id`, `permission_id`)
SELECT 1, id FROM `permissions`;

-- Supervisor: operational permissions
INSERT IGNORE INTO `role_permissions` (`role_id`, `permission_id`)
SELECT 2, id
FROM `permissions`
WHERE slug IN ('create_quotation', 'view_history', 'manage_fleet', 'manage_services', 'view_reports');

-- Operator: quotation/history permissions
INSERT IGNORE INTO `role_permissions` (`role_id`, `permission_id`)
SELECT 3, id
FROM `permissions`
WHERE slug IN ('create_quotation', 'view_history');

-- Seed mandatory system settings
INSERT IGNORE INTO `global_settings` (`setting_key`, `setting_value`, `description`) VALUES
('gasoline_price', '26.00', 'Precio base gasolina por litro'),
('maneuver_factor', '1.2', 'Factor de maniobra'),
('traffic_factor', '1.15', 'Factor de trafico'),
('base_efficiency', '1.0', 'Factor base de eficiencia'),
('lodging_tier1_cost', '1500', 'Costo hospedaje nivel 1'),
('lodging_tier2_cost', '2400', 'Costo hospedaje nivel 2'),
('lodging_tier3_cost', '3600', 'Costo hospedaje nivel 3'),
('meal_tier1_cost', '200', 'Costo alimentos nivel 1'),
('meal_tier2_cost', '300', 'Costo alimentos nivel 2'),
('meal_tier3_cost', '500', 'Costo alimentos nivel 3'),
('lodging_tier1_hours', '6', 'Umbral horas hospedaje nivel 1'),
('lodging_tier2_hours', '11', 'Umbral horas hospedaje nivel 2'),
('lodging_tier3_hours', '17', 'Umbral horas hospedaje nivel 3'),
('meal_tier1_hours', '8', 'Umbral horas alimentos nivel 1'),
('meal_tier2_hours', '12', 'Umbral horas alimentos nivel 2'),
('default_origin_address', 'Puebla, Pue., Mexico', 'Origen por defecto'),
('default_origin_lat', '18.968434', 'Latitud origen por defecto'),
('default_origin_lng', '-98.188468', 'Longitud origen por defecto'),
('backups_enabled', 'false', 'Enable automated backups from the server scheduler'),
('backup_frequency', 'daily', 'Automatic backup frequency: daily or weekly');

-- Seed default admin user (Password: admin123)
-- Keep this credential temporary and rotate in deployment hardening.
INSERT IGNORE INTO `users` (`id`, `name`, `email`, `password`, `role_id`, `status`) VALUES
(1, 'Administrador LINHER', 'programador@linher.com.mx', 'admin123', 1, 'active');
