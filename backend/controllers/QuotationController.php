<?php
/**
 * Move API - Quotation Controller
 */

require_once '../models/QuotationModel.php';
require_once '../utils/CalculationMotor.php';

class QuotationController
{
    private $db;
    private $quote;

    public function __construct($db)
    {
        $this->db = $db;
        $this->quote = new QuotationModel($db);
    }

    /**
     * Create quote (Calculates and Saves)
     */
    public function create()
    {
        $data = json_decode(file_get_contents("php://input"), true);

        if (empty($data['origin_address']) || empty($data['destination_address'])) {
            http_response_code(400);
            echo json_encode(["message" => "Origin and Destination required."]);
            return;
        }

        // 1. Run Calculation Motor
        $calcInputs = [
            "distance" => $data['distance'],
            "time" => $data['time'],
            "gas_price" => $data['gas_price'],
            "unit_mpg" => $data['unit_mpg'],
            "num_legs" => $data['num_legs'],
            "num_tolls" => $data['num_tolls'],
            "cost_per_toll" => $data['cost_per_toll'],
            "factor_maniobra" => $data['factor_maniobra'],
            "factor_trafico" => $data['factor_trafico'],
            "service_costs" => $data['service_costs'],
            "service_time" => $data['service_time']
        ];

        $results = CalculationMotor::calculate($calcInputs);

        // 2. Prepare for saving
        $data['folio'] = $this->quote->generateFolio($data['user_id'], $this->db);
        $data['distance_total'] = $results['distance_total'];
        $data['time_total'] = $results['time_total_minutes'];
        $data['costo_logistico_redondeado'] = $results['logistics_cost_rounded'];
        $data['subtotal'] = $results['subtotal'];
        $data['iva'] = $results['iva'];
        $data['total'] = $results['total'];

        // 3. Save to DB
        $id = $this->quote->createQuote($data);

        if ($id) {
            // Save stops if any
            if (!empty($data['stops'])) {
                $this->quote->addStops($id, $data['stops']);
            }

            http_response_code(201);
            echo json_encode([
                "message" => "Quote created successfully.",
                "id" => $id,
                "folio" => $data['folio'],
                "results" => $results
            ]);
        }
        else {
            http_response_code(500);
            echo json_encode(["message" => "Failed to save quote."]);
        }
    }

    /**
     * List my quotes
     */
    public function list()
    {
        $stmt = $this->quote->getAll();
        $quotes = $stmt->fetchAll(PDO::FETCH_ASSOC);
        echo json_encode($quotes);
    }
}
