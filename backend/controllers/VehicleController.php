<?php
/**
 * Move API - Vehicle Controller
 */

require_once '../models/VehicleModel.php';

class VehicleController
{
    private $db;
    private $vehicle;

    public function __construct($db)
    {
        $this->db = $db;
        $this->vehicle = new VehicleModel($db);
    }

    /**
     * List all vehicles
     */
    public function list()
    {
        $stmt = $this->vehicle->getAll();
        $vehicles = $stmt->fetchAll(PDO::FETCH_ASSOC);

        http_response_code(200);
        echo json_encode($vehicles);
    }

    /**
     * Create a vehicle
     */
    public function create()
    {
        $data = json_decode(file_get_contents("php://input"), true);

        if (
        !empty($data['name']) &&
        !empty($data['rendimiento_teorico']) &&
        !empty($data['rendimiento_real'])
        ) {
            if ($this->vehicle->create($data)) {
                http_response_code(201);
                echo json_encode(["message" => "Vehicle created successfully."]);
            }
            else {
                http_response_code(503);
                echo json_encode(["message" => "Unable to create vehicle."]);
            }
        }
        else {
            http_response_code(400);
            echo json_encode(["message" => "Incomplete data."]);
        }
    }

    /**
     * Get single vehicle
     */
    public function show($id)
    {
        $item = $this->vehicle->getById($id);
        if ($item) {
            http_response_code(200);
            echo json_encode($item);
        }
        else {
            http_response_code(404);
            echo json_encode(["message" => "Vehicle not found."]);
        }
    }
}
