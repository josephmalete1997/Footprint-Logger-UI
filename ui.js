/**
 * Update activity types dropdown based on selected category
 */
function updateActivityTypes() {
    try {
        const category = document.getElementById('activity-category').value;
        const activityTypeSelect = document.getElementById('activity-type');
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
    } catch (error) {
        console.error('Error updating activity types:', error);
    }
}

/**
 * Update unit label based on selected activity type
 */
function updateUnitLabel() {
    try {
        const category = document.getElementById('activity-category').value;
        const activityType = document.getElementById('activity-type').value;
        const unitLabel = document.getElementById('unit-label');
        
        if (category && activityType && carbonData[category][activityType]) {
            unitLabel.textContent = carbonData[category][activityType].unit.split(' per ')[1];
        } else {
            unitLabel.textContent = 'unit';
        }
    } catch (error) {
        console.error('Error updating unit label:', error);
    }
}

/**
 * Create DOM element for an activity
 * @param {Object} activity - Activity data
 * @returns {HTMLElement} Activity element
 */
function createActivityElement(activity) {
    try {
        const activityElement = document.createElement('div');
        activityElement.classList.add('activity-item', activity.category);
        
        const formattedDate = formatDate(activity.date);
        
        activityElement.innerHTML = `
            <div class="activity-details">
                <h3>${activity.label}</h3>
                <p>${activity.amount} ${activity.unit} on ${formattedDate}</p>
            </div>
            <div class="activity-co2">
                ${formatCO2(activity.co2Emission)} kg CO2
            </div>
            <button class="delete-btn" data-id="${activity.id}">
                <i class="fas fa-trash"></i>
            </button>
        `;
        
        const deleteBtn = activityElement.querySelector('.delete-btn');
        deleteBtn.addEventListener('click', () => deleteActivity(activity.id));
        
        return activityElement;
    } catch (error) {
        console.error('Error creating activity element:', error);
        return document.createElement('div'); // Return empty div as fallback
    }
}

/**
 * Update total emissions display
 * @param {Array} activities - List of activities
 */
function updateTotalEmissions(activities) {
    try {
        const totalEmissions = activities.reduce((total, activity) => total + activity.co2Emission, 0);
        document.getElementById('total-co2').textContent = formatCO2(totalEmissions);
    } catch (error) {
        console.error('Error updating total emissions:', error);
    }
}

/**
 * Display activities in the UI
 * @param {Array} activities - List of activities
 * @param {string} filterCategory - Category to filter by
 */
function displayActivities(activities, filterCategory = 'all') {
    try {
        const activitiesList = document.getElementById('activities-list');
        activitiesList.innerHTML = '';
        
        if (activities.length === 0) {
            activitiesList.innerHTML = '<p class="empty-state">No activities logged yet. Add your first activity above!</p>';
            return;
        }
        
        const filteredActivities = filterCategory === 'all' 
            ? activities 
            : activities.filter(activity => activity.category === filterCategory);
        
        if (filteredActivities.length === 0) {
            activitiesList.innerHTML = '<p class="empty-state">No activities found in this category.</p>';
            return;
        }
        
        filteredActivities.forEach(activity => {
            const activityElement = createActivityElement(activity);
            activitiesList.appendChild(activityElement);
        });
    } catch (error) {
        console.error('Error displaying activities:', error);
    }
} 