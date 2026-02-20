export class CalculationMotor {
    /**
     * Calculate all cost parameters for a quotation
     * 
     * @param {Object} inputs {distance, time, gas_price, unit_mpg, num_legs, num_tolls, cost_per_toll, factor_maniobra, factor_trafico, service_costs, service_time}
     * @returns {Object} breakdown
     */
    static calculate(inputs) {
        // 1. Inputs assignment with defaults
        const oneWayDist = parseFloat(inputs.distance || 0);
        const oneWayTime = parseInt(inputs.time || 0); // minutes
        const numLegs = parseInt(inputs.num_legs || 1);
        const numTolls = parseInt(inputs.num_tolls || 0);
        const costPerToll = parseFloat(inputs.cost_per_toll || 0);
        const unitMpg = parseFloat(inputs.unit_mpg || 1);
        const gasPrice = parseFloat(inputs.gas_price || 0);

        const factorManiobra = parseFloat(inputs.factor_maniobra || 1.2);
        const factorTrafico = parseFloat(inputs.factor_trafico || 1.5);

        const serviceCosts = parseFloat(inputs.service_costs || 0);
        const serviceTime = parseInt(inputs.service_time || 0); // minutes

        // 2. Calculations
        // Total Distance & Time
        const totalDist = oneWayDist * numLegs;
        const totalTimeBasic = oneWayTime * numLegs;

        // Tolls
        const totalTollCost = numTolls * costPerToll;

        // Gas
        const safeUnitMpg = unitMpg <= 0 ? 1 : unitMpg;
        const gasConsumption = totalDist / safeUnitMpg;
        const totalGasCost = gasConsumption * gasPrice;

        // Logistics Cost (raw)
        const rawLogisticsCost = (totalGasCost + totalTollCost) * factorManiobra;

        // Logistics Cost (rounded UP to nearest 100)
        const roundedLogisticsCost = Math.ceil(rawLogisticsCost / 100) * 100;

        // Subtotal
        const subtotal = roundedLogisticsCost + serviceCosts;

        // IVA (16%)
        const iva = subtotal * 0.16;

        // Total (rounded UP to integer)
        const total = Math.ceil(subtotal + iva);

        // Time with Traffic
        const timeWithTraffic = totalTimeBasic * factorTrafico;

        // Total Time with Services
        const totalTimeWithServices = timeWithTraffic + serviceTime;

        return {
            distance_total: parseFloat(totalDist.toFixed(2)),
            gas_consumption: parseFloat(gasConsumption.toFixed(2)),
            gas_cost: parseFloat(totalGasCost.toFixed(2)),
            toll_cost: parseFloat(totalTollCost.toFixed(2)),
            logistics_cost_raw: parseFloat(rawLogisticsCost.toFixed(2)),
            logistics_cost_rounded: roundedLogisticsCost,
            subtotal: parseFloat(subtotal.toFixed(2)),
            iva: parseFloat(iva.toFixed(2)),
            total: total,
            time_total_minutes: totalTimeWithServices,
            time_formatted: this.formatMinutes(totalTimeWithServices)
        };
    }

    static formatMinutes(minutes) {
        const hours = Math.floor(minutes / 60);
        const min = Math.round(minutes % 60);
        return (hours > 0 ? `${hours}h ` : "") + `${min}min`;
    }
}
