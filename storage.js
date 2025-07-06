function getActivitiesFromStorage() {
    try {
        const activities = localStorage.getItem(STORAGE_KEY);
        return activities ? JSON.parse(activities) : [];
    } catch (error) {
        console.error('Error reading from storage:', error);
        return [];
    }
}

function saveActivityToStorage(activity) {
    try {
        const activities = getActivitiesFromStorage();
        activities.push(activity);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(activities));
    } catch (error) {
        console.error('Error saving to storage:', error);
        throw error;
    }
}

function removeActivityFromStorage(id) {
    try {
        let activities = getActivitiesFromStorage();
        activities = activities.filter(activity => activity.id !== id);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(activities));
    } catch (error) {
        console.error('Error removing from storage:', error);
        throw error;
    }
}

function clearAllActivities() {
    try {
        localStorage.removeItem(STORAGE_KEY);
    } catch (error) {
        console.error('Error clearing storage:', error);
        throw error;
    }
} 