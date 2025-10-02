function updateChart(activities) {
    try {
        console.log('Updating chart with', activities.length, 'activities');
        const emissionsByCategory = {};
        
        CATEGORIES.forEach(category => {
            emissionsByCategory[category] = 0;
        });
        
        activities.forEach(activity => {
            if (emissionsByCategory[activity.category] !== undefined) {
                emissionsByCategory[activity.category] += activity.co2Emission;
            }
        });
        
        console.log('Emissions by category:', emissionsByCategory);
        
        if (window.emissionsChartInstance) {
            window.emissionsChartInstance.destroy();
        }
        
        const labels = [];
        const data = [];
        const backgroundColors = [];
        
        CATEGORIES.forEach((category, index) => {
            labels.push(CATEGORY_LABELS[category]);
            data.push(emissionsByCategory[category]);
            
            const colorVarName = `--${category}-color`;
            const color = getComputedStyle(document.documentElement).getPropertyValue(colorVarName) || '#cccccc';
            backgroundColors.push(color);
        });
        
        console.log('Chart labels:', labels);
        console.log('Chart data:', data);
        console.log('Chart colors:', backgroundColors);
        
        const ctx = document.getElementById('emissions-chart').getContext('2d');
        window.emissionsChartInstance = new Chart(ctx, {
            type: 'pie',
            data: {
                labels: labels,
                datasets: [{
                    data: data,
                    backgroundColor: backgroundColors
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            padding: 20,
                            boxWidth: 15
                        }
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
        
        console.log('Chart created successfully');
    } catch (error) {
        console.error('Error updating chart:', error);
    }
} 