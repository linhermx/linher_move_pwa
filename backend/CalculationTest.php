<?php
/**
 * Move API - Calculation Test
 */

require_once 'utils/CalculationMotor.php';

function runTests()
{
    $scenarios = [
        "Scenario 1: Basic Round Trip" => [
            "distance" => 500,
            "time" => 300,
            "gas_price" => 20,
            "unit_mpg" => 5,
            "num_legs" => 1,
            "num_tolls" => 1,
            "cost_per_toll" => 100,
            "factor_maniobra" => 1.2,
            "factor_trafico" => 1.5,
            "service_costs" => 0,
            "service_time" => 0
        ]
    ];

    foreach ($scenarios as $name => $inputs) {
        echo "Running $name...\n";
        $result = CalculationMotor::calculate($inputs);
        print_r($result);

        // Expected for Scenario 1:
        // Gas: 100L * 20 = 2000
        // Toll: 100
        // Cost: (2000 + 100) * 1.2 = 2520
        // Rounded: 2600
        // Subtotal: 2600
        // IVA: 416
        // Total: 3016

        if ($result['total'] == 3016) {
            echo "PASS\n";
        }
        else {
            echo "FAIL: Expected 3016, got " . $result['total'] . "\n";
        }
        echo "------------------\n";
    }
}

// Check if run from CLI
if (php_sapi_name() === 'cli') {
    runTests();
}
