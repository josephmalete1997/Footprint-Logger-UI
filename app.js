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


const activityForm = document.getElementById('activity-form');
const categorySelect = document.getElementById('activity-category');
const activityTypeSelect = document.getElementById('activity-type');
const amountInput = document.getElementById('activity-amount');
const dateInput = document.getElementById('activity-date');
const unitLabel = document.getElementById('unit-label');
const activitiesList = document.getElementById('activities-list');
const totalCO2Element = document.getElementById('total-co2');
const filterCategorySelect = document.getElementById('filter-category');
const clearDataButton = document.getElementById('clear-data');
const emissionsChart = document.getElementById('emissions-chart');


document.addEventListener('DOMContentLoaded', () => {
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('activity-date').value = today;
    
    loadActivities();
    
    document.getElementById('activity-category').addEventListener('change', updateActivityTypes);
    document.getElementById('activity-type').addEventListener('change', updateUnitLabel);
    document.getElementById('activity-form').addEventListener('submit', addActivity);
    document.getElementById('filter-category').addEventListener('change', filterActivities);
    document.getElementById('clear-data').addEventListener('click', clearAllData);
    
    updateActivityTypes();
});


function updateActivityTypes() {
    const category = categorySelect.value;
    activityTypeSelect.innerHTML = '<option value="">Select an activity</option>';
    
    if (category) {
        const activities = carbonData[category];
        for (const [key, data] of Object.entries(activities)) {
            const option = document.createElement('option');
            option.value = key;
            option.textContent = data.label;
            activityTypeSelect.appendChild(option);
        }
    }
    
    updateUnitLabel();
}


function updateUnitLabel() {
    const category = categorySelect.value;
    const activityType = activityTypeSelect.value;
    
    if (category && activityType && carbonData[category][activityType]) {
        unitLabel.textContent = carbonData[category][activityType].unit.split(' per ')[1];
    } else {
        unitLabel.textContent = 'unit';
    }
}


function addActivity(e) {
    e.preventDefault();
    
    const category = document.getElementById('activity-category').value;
    const activityType = document.getElementById('activity-type').value;
    const amount = parseFloat(document.getElementById('activity-amount').value);
    const date = document.getElementById('activity-date').value;
    
    if (!category || !activityType || !amount || !date) {
        alert('Please fill in all fields');
        return;
    }
    
    const activityData = carbonData[category][activityType];
    const co2Emission = activityData.value * amount;
    
    const activity = {
        id: Date.now(),
        category,
        activityType,
        label: activityData.label,
        amount,
        unit: activityData.unit.split(' per ')[1],
        date,
        co2Emission
    };
    
    saveActivityToStorage(activity);
    
    document.getElementById('activity-form').reset();
    document.getElementById('activity-date').value = new Date().toISOString().split('T')[0];
    updateActivityTypes();
    
    loadActivities();
}


function loadActivities() {
    const activities = getActivitiesFromStorage();
    const filterCategory = document.getElementById('filter-category').value;
    
    displayActivities(activities, filterCategory);
    updateTotalEmissions(activities);
    updateChart(activities);
}


function createActivityElement(activity) {
    const activityElement = document.createElement('div');
    activityElement.classList.add('activity-item', activity.category);
    
    const formattedDate = new Date(activity.date).toLocaleDateString();
    
    activityElement.innerHTML = `
        <div class="activity-details">
            <h3>${activity.label}</h3>
            <p>${activity.amount} ${activity.unit} on ${formattedDate}</p>
        </div>
        <div class="activity-co2">
            ${activity.co2Emission.toFixed(2)} kg CO2
        </div>
        <button class="delete-btn" data-id="${activity.id}">
            <i class="fas fa-trash"></i>
        </button>
    `;
    

    const deleteBtn = activityElement.querySelector('.delete-btn');
    deleteBtn.addEventListener('click', () => deleteActivity(activity.id));
    
    return activityElement;
}


function deleteActivity(id) {
    removeActivityFromStorage(id);
    loadActivities();
}


function filterActivities() {
    loadActivities();
}


function updateTotalEmissions(activities) {
    const totalEmissions = activities.reduce((total, activity) => total + activity.co2Emission, 0);
    totalCO2Element.textContent = totalEmissions.toFixed(2);
}


function updateChart(activities) {

    const emissionsByCategory = {
        transport: 0,
        food: 0,
        energy: 0,
        other: 0
    };
    
    activities.forEach(activity => {
        emissionsByCategory[activity.category] += activity.co2Emission;
    });
    

    if (window.emissionsChartInstance) {
        window.emissionsChartInstance.destroy();
    }
    

    const ctx = emissionsChart.getContext('2d');
    window.emissionsChartInstance = new Chart(ctx, {
        type: 'pie',
        data: {
            labels: ['Transport', 'Food', 'Energy', 'Other'],
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
                            const value = context.raw.toFixed(2);
                            const percentage = ((context.raw / activities.reduce((total, activity) => total + activity.co2Emission, 0)) * 100).toFixed(1);
                            return `${context.label}: ${value} kg CO2 (${percentage}%)`;
                        }
                    }
                }
            }
        }
    });
    

    updateActivityTypeChart(activities);
}


function updateActivityTypeChart(activities) {

    const emissionsByType = {};
    
    activities.forEach(activity => {
        const type = activity.label;
        if (!emissionsByType[type]) {
            emissionsByType[type] = 0;
        }
        emissionsByType[type] += activity.co2Emission;
    });
    

    const sortedTypes = Object.entries(emissionsByType)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);
    
    const labels = sortedTypes.map(item => item[0]);
    const data = sortedTypes.map(item => item[1]);
    

}


function clearAllData() {
    if (confirm('Are you sure you want to clear all your activity data? This cannot be undone.')) {
        clearAllActivities();
        loadActivities();
    }
}


function getActivitiesFromStorage() {
    const activities = localStorage.getItem('footprintActivities');
    return activities ? JSON.parse(activities) : [];
}

function saveActivityToStorage(activity) {
    const activities = getActivitiesFromStorage();
    activities.push(activity);
    localStorage.setItem('footprintActivities', JSON.stringify(activities));
}

function removeActivityFromStorage(id) {
    let activities = getActivitiesFromStorage();
    activities = activities.filter(activity => activity.id !== id);
    localStorage.setItem('footprintActivities', JSON.stringify(activities));
}

function displayActivities(activities, filterCategory) {

    activitiesList.innerHTML = '';
    
    if (activities.length === 0) {
        activitiesList.innerHTML = '<p class="empty-state">No activities logged yet. Add your first activity above!</p>';
    } else {

        const filteredActivities = filterCategory === 'all' 
            ? activities 
            : activities.filter(activity => activity.category === filterCategory);
        

        if (filteredActivities.length === 0) {
            activitiesList.innerHTML = '<p class="empty-state">No activities found in this category.</p>';
        } else {
            filteredActivities.forEach(activity => {
                const activityElement = createActivityElement(activity);
                activitiesList.appendChild(activityElement);
            });
        }
    }
}

function clearAllActivities() {
    localStorage.removeItem('footprintActivities');
} 