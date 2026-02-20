<?php
/**
 * Move API - Global Entry point
 */

header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Max-Age: 3600");
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once 'core/Config.php';
require_once 'core/Database.php';
require_once 'controllers/VehicleController.php';
require_once 'controllers/SettingsController.php';
require_once 'controllers/MapsController.php';
require_once 'controllers/QuotationController.php';
require_once 'utils/CalculationMotor.php';

$database = new Database();
$db = $database->getConnection();

// Simple Router (Placeholder)
$uri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$uri = explode('/', $uri);

if (!isset($uri[3]) || $uri[1] !== 'api' || $uri[2] !== 'v1') {
    http_response_code(404);
    echo json_encode(["message" => "Endpoint not found."]);
    exit();
}

$resource = $uri[3];
$id = isset($uri[4]) ? $uri[4] : null;

// Basic router skeleton
switch ($resource) {
    case 'health':
        echo json_encode(["status" => "ok", "message" => "Move API is running."]);
        break;
    case 'settings':
        $controller = new SettingsController($db);
        if ($_SERVER['REQUEST_METHOD'] === 'GET')
            $controller->index();
        if ($_SERVER['REQUEST_METHOD'] === 'POST')
            $controller->update();
        break;
    case 'vehicles':
        $controller = new VehicleController($db);
        if ($_SERVER['REQUEST_METHOD'] === 'GET') {
            if ($id)
                $controller->show($id);
            else
                $controller->list();
        }
        if ($_SERVER['REQUEST_METHOD'] === 'POST')
            $controller->create();
        break;
    case 'maps':
        $controller = new MapsController();
        if ($uri[4] === 'autocomplete')
            $controller->autocomplete();
        if ($uri[4] === 'route')
            $controller->route();
        break;
    case 'quotations':
        $controller = new QuotationController($db);
        if ($_SERVER['REQUEST_METHOD'] === 'GET')
            $controller->list();
        if ($_SERVER['REQUEST_METHOD'] === 'POST')
            $controller->create();
        break;
    default:
        http_response_code(404);
        echo json_encode(["message" => "Resource not found."]);
        break;
}
