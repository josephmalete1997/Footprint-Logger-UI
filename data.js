const carbonData = {
    transport: {
        car: { value: 0.12, unit: 'kg per km', label: 'Car Travel' },
        bus: { value: 0.03, unit: 'kg per km', label: 'Bus Travel' },
        train: { value: 0.01, unit: 'kg per km', label: 'Train Travel' },
        plane: { value: 0.25, unit: 'kg per km', label: 'Air Travel' },
        bicycle: { value: 0, unit: 'kg per km', label: 'Cycling' },
        walking: { value: 0, unit: 'kg per km', label: 'Walking' }
    },
    food: {
        beef: { value: 27, unit: 'kg per kg', label: 'Beef Consumption' },
        lamb: { value: 39, unit: 'kg per kg', label: 'Lamb Consumption' },
        pork: { value: 12, unit: 'kg per kg', label: 'Pork Consumption' },
        chicken: { value: 6.9, unit: 'kg per kg', label: 'Chicken Consumption' },
        fish: { value: 6, unit: 'kg per kg', label: 'Fish Consumption' },
        dairy: { value: 1.9, unit: 'kg per kg', label: 'Dairy Products' },
        vegetables: { value: 0.4, unit: 'kg per kg', label: 'Vegetables' },
        fruits: { value: 0.5, unit: 'kg per kg', label: 'Fruits' }
    },
    energy: {
        electricity: { value: 0.5, unit: 'kg per kWh', label: 'Electricity Usage' },
        naturalGas: { value: 0.2, unit: 'kg per kWh', label: 'Natural Gas Usage' },
        lpg: { value: 0.25, unit: 'kg per kWh', label: 'LPG Usage' },
        wood: { value: 0.02, unit: 'kg per kg', label: 'Wood Burning' }
    },
    other: {
        waste: { value: 0.7, unit: 'kg per kg', label: 'Waste Production' },
        water: { value: 0.001, unit: 'kg per liter', label: 'Water Usage' },
        clothing: { value: 10, unit: 'kg per item', label: 'New Clothing Item' },
        electronics: { value: 100, unit: 'kg per item', label: 'New Electronic Device' }
    }
}; 