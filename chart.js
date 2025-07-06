/**
 * Update the emissions chart with activity data
 * @param {Array} activities - List of activities
 */
function updateChart(activities) {
    try {
        const emissionsByCategory = {};
        
        // Initialize all categories with zero emissions
        CATEGORIES.forEach(category => {
            emissionsByCategory[category] = 0;
        });
        
        // Sum up emissions by category
        activities.forEach(activity => {
            emissionsByCategory[activity.category] += activity.co2Emission;
        });
        
        // Destroy previous chart instance if it exists
        if (window.emissionsChartInstance) {
            window.emissionsChartInstance.destroy();
        }
        
        // Create new chart
        const ctx = document.getElementById('emissions-chart').getContext('2d');
        window.emissionsChartInstance = new Chart(ctx, {
            type: 'pie',
            data: {
                labels: Object.values(CATEGORY_LABELS),
                datasets: [{
                    data: [
                        emissionsByCategory.transport,
                        emissionsByCategory.food,
                        emissionsByCategory.energy,
                        emissionsByCategory.other
                    ],
                    backgroundColor: [
                        getComputedStyle(document.documentElement).getPropertyValue('--transport-color'),
                        getComputedStyle(document.documentElement).getPropertyValue('--food-color'),
                        getComputedStyle(document.documentElement).getPropertyValue('--energy-color'),
                        getComputedStyle(document.documentElement).getPropertyValue('--other-color')
                    ]
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom'
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const value = formatCO2(context.raw);
                                const total = activities.reduce((total, activity) => total + activity.co2Emission, 0);
                                const percentage = calculatePercentage(context.raw, total);
                                return `${context.label}: ${value} kg CO2 (${percentage}%)`;
                            }
                        }
                    }
                }
            }
        });
    } catch (error) {
        console.error('Error updating chart:', error);
    }
} 