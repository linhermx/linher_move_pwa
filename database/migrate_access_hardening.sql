-- Migration: Access hardening and reports RBAC defaults
-- Date: 2026-03-06

USE linher_move;

INSERT IGNORE INTO `permissions` (`slug`, `name`) VALUES
('view_reports', 'Ver Reportes'),
('export_reports', 'Exportar Reportes');

INSERT IGNORE INTO `role_permissions` (`role_id`, `permission_id`)
SELECT 1, id
FROM `permissions`
WHERE `slug` IN ('view_reports', 'export_reports');

INSERT IGNORE INTO `role_permissions` (`role_id`, `permission_id`)
SELECT 2, id
FROM `permissions`
WHERE `slug` IN ('view_reports');

DELETE up
FROM `user_permissions` up
JOIN `users` u ON u.id = up.user_id
JOIN `permissions` p ON p.id = up.permission_id
WHERE u.role_id <> 1
  AND p.slug IN ('manage_users', 'manage_backups');
