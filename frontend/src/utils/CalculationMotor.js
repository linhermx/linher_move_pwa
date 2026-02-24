export class CalculationMotor {
    /**
     * Calculate all cost parameters for a quotation
     * 
     * @param {Object} inputs {distance, time, gas_price, unit_mpg, num_legs, num_tolls, cost_per_toll, maneuver_factor, traffic_factor, service_costs, service_time}
     * @returns {Object} breakdown
     */
    static calculate(inputs) {
        // 1. Inputs assignment with defaults
        const distIda = parseFloat(inputs.distance || 0);
        const tiempoIda = parseInt(inputs.time || 0); // minutes
        const numTrayectos = parseInt(inputs.num_legs || 1);

        const numCasetasIda = parseInt(inputs.num_tolls || 0);
        const costoPorCaseta = parseFloat(inputs.cost_per_toll || 0);

        const rendUnidad = parseFloat(inputs.unit_mpg || 1);
        const precioGasolina = parseFloat(inputs.gas_price || 0);

        const factorManiobra = parseFloat(inputs.maneuver_factor || 1.2);
        const factorTrafico = parseFloat(inputs.traffic_factor || 1.15);

        const serviceCosts = parseFloat(inputs.service_costs || 0);
        const serviceTime = parseInt(inputs.service_time || 0); // minutes

        // 2. Calculations (Follow 12 steps)

        // 1) Distancia total = distancia ida * número de trayectos
        const distanciaTotal = distIda * numTrayectos;

        // 2) Tiempo total = tiempo ida * número de trayectos
        const tiempoTotalBase = tiempoIda * numTrayectos;

        // 3) Costo de casetas = número de casetas * costo por caseta * numTrayectos
        // Nota: numCasetasIda * costoPorCaseta es por trayecto
        const costoCasetasTotal = numCasetasIda * costoPorCaseta * numTrayectos;

        // 4) Consumo de gasolina = distancia total / rendimiento real
        const consumoGasolina = rendUnidad > 0 ? distanciaTotal / rendUnidad : 0;

        // 5) Costo gasolina = consumo gasolina * precio gasolina
        const costoGasolina = consumoGasolina * precioGasolina;

        // 6) Costo logístico sin redondeo = (costo gasolina + costo casetas) * factor maniobra
        const costoLogisticoSinRedondeo = (costoGasolina + costoCasetasTotal) * factorManiobra;

        // 7) Redondeo a 100 hacia arriba
        const costoLogisticoRedondeado = Math.ceil(costoLogisticoSinRedondeo / 100) * 100;

        // 11) Tiempo con tráfico = tiempo total * factor tráfico
        const tiempoConTrafico = tiempoTotalBase * factorTrafico;

        // 12) Tiempo total con servicios = tiempo con tráfico + tiempo servicio
        const tiempoTotalConServicios = tiempoConTrafico + serviceTime;

        // 3. Conditional Expenses (Lodging & Meals) - Keep same tiered logic or adjust if needed?
        // Let's use the tiers as automated for now but based on ONE WAY or TOTAL as previously defined.
        let lodgingCost = 0;
        const oswTier3 = parseInt(inputs.lodging_tier3_hours || 17) * 60;
        const oswTier2 = parseInt(inputs.lodging_tier2_hours || 11) * 60;
        const oswTier1 = parseInt(inputs.lodging_tier1_hours || 6) * 60;

        if (tiempoIda > oswTier3) {
            lodgingCost = parseFloat(inputs.lodging_tier3_cost || 0);
        } else if (tiempoIda > oswTier2) {
            lodgingCost = parseFloat(inputs.lodging_tier3_cost || 0); // Corrected to use tier3 etc as per original logic if requested, or tier 2
            lodgingCost = parseFloat(inputs.lodging_tier2_cost || 0);
        } else if (tiempoIda > oswTier1) {
            lodgingCost = parseFloat(inputs.lodging_tier1_cost || 0);
        }

        let mealCost = 0;
        const totalTier2 = parseInt(inputs.meal_tier2_hours || 12) * 60;
        const totalTier1 = parseInt(inputs.meal_tier1_hours || 8) * 60;

        if (lodgingCost > 0) {
            mealCost = parseFloat(inputs.meal_tier3_cost || 0);
        } else if (tiempoTotalConServicios > totalTier2) {
            mealCost = parseFloat(inputs.meal_tier2_cost || 0);
        } else if (tiempoTotalConServicios > totalTier1) {
            mealCost = parseFloat(inputs.meal_tier1_cost || 0);
        }

        // 8) Subtotal = costo logístico + interconexión + mantenimiento + comida + hospedaje
        const subtotal = costoLogisticoRedondeado + serviceCosts + lodgingCost + mealCost;

        // 9) IVA = Subtotal * 0.16
        const iva = subtotal * 0.16;

        // 10) Total = Subtotal + IVA (rounded up)
        const total = Math.ceil(subtotal + iva);

        // 11) Return breakdown
        return {
            distancia_ida: distIda,
            distancia_total: parseFloat(distanciaTotal.toFixed(2)),
            tiempo_ida_min: tiempoIda,
            tiempo_total_min: tiempoTotalBase,
            tiempo_con_trafico_min: Math.round(tiempoConTrafico),
            tiempo_con_servicios_min: Math.round(tiempoTotalConServicios),
            gasolina_litros: parseFloat(consumoGasolina.toFixed(2)),
            gas_cost: parseFloat(costoGasolina.toFixed(2)),
            toll_cost: parseFloat(costoCasetasTotal.toFixed(2)),
            lodging_cost: lodgingCost,
            meal_cost: mealCost,
            logistics_cost_raw: parseFloat(costoLogisticoSinRedondeo.toFixed(2)),
            logistics_cost_rounded: costoLogisticoRedondeado,
            subtotal: subtotal,
            iva: parseFloat(iva.toFixed(2)),
            total: total,
            time_formatted: this.formatMinutes(tiempoTotalConServicios),
            tiempo_total_viaje_formatted: this.formatMinutes(tiempoTotalBase * factorTrafico) // For verification with excel
        };
    }

    static formatMinutes(minutes) {
        const hours = Math.floor(minutes / 60);
        const min = Math.round(minutes % 60);
        return (hours > 0 ? `${hours}h ` : "") + `${min}min`;
    }
}
