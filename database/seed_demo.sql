-- Optional demo seed
-- This file is intended for local development/testing only.

USE linher_move;

INSERT IGNORE INTO `services` (`id`, `name`, `cost`, `time_minutes`, `description`) VALUES
(1, 'Interconexion', 200.00, 30, 'Costo por maniobras de interconexion'),
(2, 'Mantenimiento', 500.00, 60, 'Mantenimiento preventivo en sitio'),
(3, 'Comida', 150.00, 45, 'Apoyo para alimentos del operador'),
(4, 'Hospedaje', 800.00, 480, 'Costo por noche de hospedaje'),
(5, 'Maniobra Carga/Descarga', 1200.00, 120, 'Servicio profesional de carga y descarga');
