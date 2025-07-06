/**
 * Main application script that initializes and coordinates the carbon footprint tracker
 */

// DOM Elements
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

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  try {
    // Set today's date as default
    const today = new Date().toISOString().split('T')[0];
    dateInput.value = today;
    
    // Load existing activities
    loadActivities();
    
    // Set up event listeners
    categorySelect.addEventListener('change', updateActivityTypes);
    activityTypeSelect.addEventListener('change', updateUnitLabel);
    activityForm.addEventListener('submit', addActivity);
    filterCategorySelect.addEventListener('change', filterActivities);
    clearDataButton.addEventListener('click', confirmClearData);
    
    // Initialize activity types dropdown
    updateActivityTypes();
  } catch (error) {
    console.error('Initialization error:', error);
  }
});

/**
 * Add a new activity from the form
 * @param {Event} e - Form submit event
 */
function addActivity(e) {
  e.preventDefault();
  
  try {
    const category = categorySelect.value;
    const activityType = activityTypeSelect.value;
    const amount = parseFloat(amountInput.value);
    const date = dateInput.value;
    
    if (!category || !activityType || isNaN(amount) || !date) {
      alert('Please fill in all fields correctly');
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
    
    activityForm.reset();
    dateInput.value = new Date().toISOString().split('T')[0];
    updateActivityTypes();
    
    loadActivities();
  } catch (error) {
    console.error('Error adding activity:', error);
    alert('Failed to add activity. Please try again.');
  }
}

/**
 * Load and display activities from storage
 */
function loadActivities() {
  try {
    const activities = getActivitiesFromStorage();
    const filterCategory = filterCategorySelect.value;
    
    displayActivities(activities, filterCategory);
    updateTotalEmissions(activities);
    updateChart(activities);
  } catch (error) {
    console.error('Error loading activities:', error);
  }
}

/**
 * Delete an activity by ID
 * @param {number} id - Activity ID
 */
function deleteActivity(id) {
  try {
    removeActivityFromStorage(id);
    loadActivities();
  } catch (error) {
    console.error('Error deleting activity:', error);
    alert('Failed to delete activity. Please try again.');
  }
}

/**
 * Filter activities by category
 */
function filterActivities() {
  loadActivities();
}

/**
 * Confirm before clearing all data
 */
function confirmClearData() {
  try {
    if (confirm('Are you sure you want to delete all activities?')) {
      clearAllActivities();
      loadActivities();
    }
  } catch (error) {
    console.error('Error clearing data:', error);
    alert('Failed to clear data. Please try again.');
  }
} 