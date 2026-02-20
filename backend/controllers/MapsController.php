<?php
/**
 * Move API - Maps Controller
 */

require_once '../services/ProxyService.php';

class MapsController
{
    private $proxy;

    public function __construct()
    {
        $this->proxy = new ProxyService();
    }

    /**
     * Autocomplete address
     */
    public function autocomplete()
    {
        $text = isset($_GET['text']) ? $_GET['text'] : '';
        if (empty($text)) {
            echo json_encode(["features" => []]);
            return;
        }

        echo $this->proxy->geocode($text);
    }

    /**
     * Get route geometry and stats
     */
    public function route()
    {
        $data = json_decode(file_get_contents("php://input"), true);
        if (!isset($data['coordinates']) || count($data['coordinates']) < 2) {
            http_response_code(400);
            echo json_encode(["message" => "At least 2 points required."]);
            return;
        }

        echo $this->proxy->getRoute($data['coordinates']);
    }
}
