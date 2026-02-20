<?php
/**
 * Move API - Calculation Motor
 * Implements the exact formulas provided in requirements.
 */

class CalculationMotor
{
    /**
     * Calculate all cost parameters for a quotation
     * 
     * @param array $inputs [distance, time, fuel_price, unit_mpg, num_legs, num_tolls, cost_per_toll, factors, services]
     * @return array breakdown
     */
    public static function calculate($inputs)
    {
        // 1. Inputs assignment
        $one_way_dist = floatval($inputs['distance']);
        $one_way_time = intval($inputs['time']); // minutes
        $num_legs = intval($inputs['num_legs'] ?: 1);
        $num_tolls = intval($inputs['num_tolls'] ?: 0);
        $cost_per_toll = floatval($inputs['cost_per_toll'] ?: 0);
        $unit_mpg = floatval($inputs['unit_mpg']);
        $gas_price = floatval($inputs['gas_price']);

        $factor_maniobra = floatval($inputs['factor_maniobra'] ?: 1.2);
        $factor_trafico = floatval($inputs['factor_trafico'] ?: 1.5);

        $service_costs = floatval($inputs['service_costs'] ?: 0);
        $service_time = intval($inputs['service_time'] ?: 0); // minutes

        // 2. Calculations
        // Total Distance & Time
        $total_dist = $one_way_dist * $num_legs;
        $total_time_basic = $one_way_time * $num_legs;

        // Tolls
        $total_toll_cost = $num_tolls * $cost_per_toll;

        // Gas
        if ($unit_mpg <= 0)
            $unit_mpg = 1; // Avoid division by zero
        $gas_consumption = $total_dist / $unit_mpg;
        $total_gas_cost = $gas_consumption * $gas_price;

        // Logistics Cost (raw)
        $raw_logistics_cost = ($total_gas_cost + $total_toll_cost) * $factor_maniobra;

        // Logistics Cost (rounded UP to nearest 100)
        $rounded_logistics_cost = ceil($raw_logistics_cost / 100) * 100;

        // Subtotal
        $subtotal = $rounded_logistics_cost + $service_costs;

        // IVA
        $iva = $subtotal * 0.16;

        // Total (rounded UP to integer)
        $total = ceil($subtotal + $iva);

        // Time with Traffic
        $time_with_traffic = $total_time_basic * $factor_trafico;

        // Total Time with Services
        $total_time_with_services = $time_with_traffic + $service_time;

        return [
            "distance_total" => round($total_dist, 2),
            "gas_consumption" => round($gas_consumption, 2),
            "gas_cost" => round($total_gas_cost, 2),
            "toll_cost" => round($total_toll_cost, 2),
            "logistics_cost_raw" => round($raw_logistics_cost, 2),
            "logistics_cost_rounded" => $rounded_logistics_cost,
            "subtotal" => round($subtotal, 2),
            "iva" => round($iva, 2),
            "total" => $total,
            "time_total_minutes" => $total_time_with_services,
            "time_formatted" => self::formatMinutes($total_time_with_services)
        ];
    }

    private static function formatMinutes($minutes)
    {
        $hours = floor($minutes / 60);
        $min = $minutes % 60;
        return ($hours > 0 ? "{$hours}h " : "") . "{$min}min";
    }
}
