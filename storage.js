function getActivitiesFromStorage() {
    const activities = localStorage.getItem(STORAGE_KEY);
    return activities ? JSON.parse(activities) : [];
}

function saveActivityToStorage(activity) {
    const activities = getActivitiesFromStorage();
    activities.push(activity);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(activities));
}

function removeActivityFromStorage(id) {
    let activities = getActivitiesFromStorage();
    activities = activities.filter(activity => activity.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(activities));
}

function clearAllActivities() {
    localStorage.removeItem(STORAGE_KEY);
} 