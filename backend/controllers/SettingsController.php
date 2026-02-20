<?php
/**
 * Move API - Settings Controller
 */

require_once '../models/SettingsModel.php';

class SettingsController
{
    private $db;
    private $settings;

    public function __construct($db)
    {
        $this->db = $db;
        $this->settings = new SettingsModel($db);
    }

    /**
     * Get all settings
     */
    public function index()
    {
        $data = $this->settings->getAllAsMap();
        http_response_code(200);
        echo json_encode($data);
    }

    /**
     * Bulk update settings
     */
    public function update()
    {
        $data = json_decode(file_get_contents("php://input"), true);

        if (is_array($data)) {
            $success = true;
            foreach ($data as $key => $value) {
                if (!$this->settings->set($key, $value)) {
                    $success = false;
                }
            }

            if ($success) {
                http_response_code(200);
                echo json_encode(["message" => "Settings updated successfully."]);
            }
            else {
                http_response_code(500);
                echo json_encode(["message" => "Failed to update some settings."]);
            }
        }
        else {
            http_response_code(400);
            echo json_encode(["message" => "Invalid data format."]);
        }
    }
}
