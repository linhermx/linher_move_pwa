import { CalculationMotor } from './src/utils/CalculationMotor.js';

const testCases = [
    {
        name: 'Jornada corta (3h ida, 6h total)',
        inputs: {
            distance: 180, time: 180, num_legs: 2,
            gas_price: 24.50, unit_mpg: 1.0, factor_trafico: 1.0,
            hospedaje_tier1_hours: 6, lodging_tier1_cost: 1500,
            viaticos_tier1_hours: 8, meal_tier1_cost: 200,
            viaticos_tier2_hours: 12, meal_tier2_cost: 300,
            meal_tier3_cost: 500
        },
        expected: { lodging: 0, meal: 0 }
    },
    {
        name: 'Más de 8h jornada (4.5h ida, 9h total)',
        inputs: {
            distance: 270, time: 270, num_legs: 2,
            gas_price: 24.50, unit_mpg: 1.0, factor_trafico: 1.0,
            hospedaje_tier1_hours: 6, lodging_tier1_cost: 1500,
            viaticos_tier1_hours: 8, meal_tier1_cost: 200,
            viaticos_tier2_hours: 12, meal_tier2_cost: 300,
            meal_tier3_cost: 500
        },
        expected: { lodging: 0, meal: 200 }
    },
    {
        name: 'Más de 12h total (7h ida, 14h total, SIN factor tráfico)',
        inputs: {
            distance: 420, time: 420, num_legs: 2,
            gas_price: 24.50, unit_mpg: 1.0, factor_trafico: 1.0,
            hospedaje_tier1_hours: 8, lodging_tier1_cost: 1500, // Ajustado para que no dispare hotel aún
            viaticos_tier1_hours: 8, meal_tier1_cost: 200,
            viaticos_tier2_hours: 12, meal_tier2_cost: 300,
            meal_tier3_cost: 500
        },
        expected: { lodging: 0, meal: 300 }
    },
    {
        name: 'Tier 1 Hospedaje (>6h ida)',
        inputs: {
            distance: 400, time: 400, num_legs: 2,
            gas_price: 24.50, unit_mpg: 1.0, factor_trafico: 1.0,
            hospedaje_tier1_hours: 6, lodging_tier1_cost: 1500,
            meal_tier3_cost: 500
        },
        expected: { lodging: 1500, meal: 500 }
    },
    {
        name: 'Tier 2 Hospedaje (>11h ida)',
        inputs: {
            distance: 700, time: 700, num_legs: 2,
            gas_price: 24.50, unit_mpg: 1.0, factor_trafico: 1.0,
            hospedaje_tier1_hours: 6, lodging_tier1_cost: 1500,
            hospedaje_tier2_hours: 11, lodging_tier2_cost: 2400,
            meal_tier3_cost: 500
        },
        expected: { lodging: 2400, meal: 500 }
    },
    {
        name: 'Tier 3 Hospedaje (>17h ida)',
        inputs: {
            distance: 1100, time: 1100, num_legs: 2,
            gas_price: 24.50, unit_mpg: 1.0, factor_trafico: 1.0,
            hospedaje_tier1_hours: 6, lodging_tier1_cost: 1500,
            hospedaje_tier2_hours: 11, lodging_tier2_cost: 2400,
            hospedaje_tier3_hours: 17, lodging_tier3_cost: 3600,
            meal_tier3_cost: 500
        },
        expected: { lodging: 3600, meal: 500 }
    }
];

let allOk = true;
testCases.forEach(tc => {
    const result = CalculationMotor.calculate(tc.inputs);
    const lodgingOk = result.lodging_cost === tc.expected.lodging;
    const mealOk = result.meal_cost === tc.expected.meal;

    if (!lodgingOk || !mealOk) allOk = false;

    console.log(`Test: ${tc.name}`);
    console.log(`- Lodging: ${result.lodging_cost} ${lodgingOk ? '✅' : '❌'}`);
    console.log(`- Meal: ${result.meal_cost} ${mealOk ? '✅' : '❌'}`);
});

if (allOk) {
    console.log('\n>>> TODO CORRECTO: El motor cumple la lógica de logística.');
    process.exit(0);
} else {
    console.log('\n>>> ERROR: Fallaron algunas pruebas.');
    process.exit(1);
}
