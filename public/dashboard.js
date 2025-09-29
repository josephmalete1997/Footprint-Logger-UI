const API_BASE = 'https://fantastic-goggles-j64x64qqw7v3596-3000.app.github.dev/api';
let carbonData = {};
let weeklyChart = null;
let categoryChart = null;

// Check authentication
document.addEventListener('DOMContentLoaded', async () => {
    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    
    if (!token) {
        window.location.href = '/';
        return;
    }
    
    // Display username
    document.getElementById('username-display').textContent = `Welcome, ${user.username}!`;
    
    // Initialize dashboard
    await initializeDashboard();
});

async function initializeDashboard() {
    try {
        showLoading();
        
        // Load carbon data
        await loadCarbonData();
        
        // Set up form
        const today = new Date().toISOString().split('T')[0];
        document.getElementById('activity-date').value = today;
        
        // Set up event listeners
        document.getElementById('activity-form').addEventListener('submit', addActivity);
        document.getElementById('activity-category').addEventListener('change', updateActivityTypes);
        document.getElementById('activity-type').addEventListener('change', updateUnitLabel);
        document.getElementById('filter-category').addEventListener('change', filterActivities);
        document.getElementById('clear-data').addEventListener('click', confirmClearData);
        
        // Load data
        await loadDashboardData();
        await loadActivities();
        await loadLeaderboard();
        
        // Initialize form
        populateCategories();
        updateActivityTypes();
        
    } catch (error) {
        console.error('Dashboard initialization error:', error);
        alert('Failed to load dashboard. Please refresh the page.');
    } finally {
        hideLoading();
    }
}

async function loadCarbonData() {
    try {
        const response = await fetch(`${API_BASE}/carbon-data`);
        carbonData = await response.json();
    } catch (error) {
        console.error('Error loading carbon data:', error);
    }
}

async function loadDashboardData() {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE}/dashboard/stats`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (response.ok) {
            const stats = await response.json();
            updateDashboardStats(stats);
        }
    } catch (error) {
        console.error('Error loading dashboard stats:', error);
    }
}

function updateDashboardStats(stats) {
    document.getElementById('user-total').textContent = `${stats.userTotal.toFixed(2)} kg`;
    document.getElementById('global-average').textContent = `${stats.globalAverage.toFixed(2)} kg`;
    
    const weekTotal = stats.weeklyData.reduce((sum, day) => sum + day.dailyTotal, 0);
    document.getElementById('week-total').textContent = `${weekTotal.toFixed(2)} kg`;
    
    const activityCount = stats.categoryBreakdown.reduce((sum, cat) => sum + cat.count, 0);
    document.getElementById('activity-count').textContent = activityCount;
    
    // Update charts
    updateWeeklyChart(stats.weeklyData);
    updateCategoryChart(stats.categoryBreakdown);
}

function updateWeeklyChart(weeklyData) {
    const ctx = document.getElementById('weekly-chart').getContext('2d');
    
    if (weeklyChart) {
        weeklyChart.destroy();
    }
    
    // Prepare data for last 7 days
    const last7Days = [];
    const emissions = [];
    
    for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateString = date.toISOString().split('T')[0];
        
        last7Days.push(date.toLocaleDateString('en-US', { weekday: 'short' }));
        
        const dayData = weeklyData.find(d => d._id === dateString);
        emissions.push(dayData ? dayData.dailyTotal : 0);
    }
    
    weeklyChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: last7Days,
            datasets: [{
                label: 'CO2 Emissions (kg)',
                data: emissions,
                borderColor: '#4CAF50',
                backgroundColor: 'rgba(76, 175, 80, 0.1)',
                tension: 0.4,
                fill: true
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    });
}

function updateCategoryChart(categoryBreakdown) {
    const ctx = document.getElementById('category-chart').getContext('2d');
    
    if (categoryChart) {
        categoryChart.destroy();
    }
    
    if (categoryBreakdown.length === 0) {
        return;
    }
    
    const colors = ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40'];
    
    categoryChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: categoryBreakdown.map(cat => cat._id.charAt(0).toUpperCase() + cat._id.slice(1)),
            datasets: [{
                data: categoryBreakdown.map(cat => cat.total),
                backgroundColor: colors.slice(0, categoryBreakdown.length),
                borderWidth: 2,
                borderColor: '#fff'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom'
                }
            }
        }
    });
}

function populateCategories() {
    const categorySelect = document.getElementById('activity-category');
    const filterSelect = document.getElementById('filter-category');
    
    categorySelect.innerHTML = '<option value="">Select Category</option>';
    filterSelect.innerHTML = '<option value="all">All Categories</option>';
    
    Object.keys(carbonData).forEach(category => {
        const option1 = document.createElement('option');
        option1.value = category;
        option1.textContent = category.charAt(0).toUpperCase() + category.slice(1);
        categorySelect.appendChild(option1);
        
        const option2 = document.createElement('option');
        option2.value = category;
        option2.textContent = category.charAt(0).toUpperCase() + category.slice(1);
        filterSelect.appendChild(option2);
    });
}

function updateActivityTypes() {
    const category = document.getElementById('activity-category').value;
    const activitySelect = document.getElementById('activity-type');
    
    activitySelect.innerHTML = '<option value="">Select Activity</option>';
    
    if (category && carbonData[category]) {
        Object.keys(carbonData[category]).forEach(activity => {
            const option = document.createElement('option');
            option.value = activity;
            option.textContent = carbonData[category][activity].label;
            activitySelect.appendChild(option);
        });
    }
    
    updateUnitLabel();
}

function updateUnitLabel() {
    const category = document.getElementById('activity-category').value;
    const activityType = document.getElementById('activity-type').value;
    const unitLabel = document.getElementById('unit-label');
    
    if (category && activityType && carbonData[category] && carbonData[category][activityType]) {
        const unit = carbonData[category][activityType].unit.split(' per ')[1];
        unitLabel.textContent = `Enter amount in ${unit}`;
    } else {
        unitLabel.textContent = 'Enter amount';
    }
}

async function addActivity(e) {
    e.preventDefault();
    
    try {
        const category = document.getElementById('activity-category').value;
        const activityType = document.getElementById('activity-type').value;
        const amount = parseFloat(document.getElementById('activity-amount').value);
        const date = document.getElementById('activity-date').value;
        
        if (!category || !activityType || isNaN(amount) || !date) {
            alert('Please fill in all fields correctly');
            return;
        }
        
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE}/activities`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                category,
                activityType,
                amount,
                date
            })
        });
        
        if (response.ok) {
            // Reset form
            document.getElementById('activity-form').reset();
            document.getElementById('activity-date').value = new Date().toISOString().split('T')[0];
            updateActivityTypes();
            
            // Reload data
            await loadDashboardData();
            await loadActivities();
            
            alert('Activity added successfully!');
        } else {
            const error = await response.json();
            alert(error.error || 'Failed to add activity');
        }
    } catch (error) {
        console.error('Error adding activity:', error);
        alert('Failed to add activity. Please try again.');
    }
}

async function loadActivities() {
    try {
        const token = localStorage.getItem('token');
        const filterCategory = document.getElementById('filter-category').value;
        
        let url = `${API_BASE}/activities`;
        if (filterCategory !== 'all') {
            url += `?category=${filterCategory}`;
        }
        
        const response = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (response.ok) {
            const activities = await response.json();
            displayActivities(activities);
        }
    } catch (error) {
        console.error('Error loading activities:', error);
    }
}

function displayActivities(activities) {
    const container = document.getElementById('activities-list');
    
    if (activities.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: #666; padding: 20px;">No activities found. Add your first activity above!</p>';
        return;
    }
    
    container.innerHTML = activities.map(activity => `
        <div class="activity-item">
            <div class="activity-info">
                <h4>${activity.label}</h4>
                <div class="activity-details">
                    ${activity.amount} ${activity.unit} on ${new Date(activity.date).toLocaleDateString()}
                </div>
            </div>
            <div style="text-align: right;">
                <div class="activity-emission">${activity.co2Emission.toFixed(2)} kg CO2</div>
                <button onclick="deleteActivity('${activity._id}')" class="delete-btn">Delete</button>
            </div>
        </div>
    `).join('');
}

async function deleteActivity(id) {
    if (!confirm('Are you sure you want to delete this activity?')) {
        return;
    }
    
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE}/activities/${id}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (response.ok) {
            await loadDashboardData();
            await loadActivities();
        } else {
            alert('Failed to delete activity');
        }
    } catch (error) {
        console.error('Error deleting activity:', error);
        alert('Failed to delete activity. Please try again.');
    }
}

async function loadLeaderboard() {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE}/dashboard/leaderboard`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (response.ok) {
            const leaderboard = await response.json();
            displayLeaderboard(leaderboard);
        }
    } catch (error) {
        console.error('Error loading leaderboard:', error);
    }
}

function displayLeaderboard(leaderboard) {
    const container = document.getElementById('leaderboard');
    
    if (leaderboard.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: #666;">No data available yet.</p>';
        return;
    }
    
    container.innerHTML = leaderboard.map((user, index) => `
        <div class="leaderboard-item">
            <div>
                <span class="leaderboard-rank">#${index + 1}</span>
                <strong>${user.username}</strong>
            </div>
            <div class="leaderboard-emissions">
                ${user.totalEmissions} kg CO2
                <br>
                <small>${user.activityCount} activities</small>
            </div>
        </div>
    `).join('');
}

function filterActivities() {
    loadActivities();
}

async function confirmClearData() {
    if (!confirm('Are you sure you want to delete ALL your activities? This cannot be undone!')) {
        return;
    }
    
    try {
        showLoading();
        const token = localStorage.getItem('token');
        
        // Get all activities first
        const response = await fetch(`${API_BASE}/activities`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (response.ok) {
            const activities = await response.json();
            
            // Delete each activity
            for (const activity of activities) {
                await fetch(`${API_BASE}/activities/${activity._id}`, {
                    method: 'DELETE',
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });
            }
            
            // Reload data
            await loadDashboardData();
            await loadActivities();
            await loadLeaderboard();
            
            alert('All activities have been deleted.');
        }
    } catch (error) {
        console.error('Error clearing data:', error);
        alert('Failed to clear data. Please try again.');
    } finally {
        hideLoading();
    }
}

function logout() {
    if (confirm('Are you sure you want to logout?')) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/';
    }
}

function showLoading() {
    document.getElementById('loading').classList.remove('hidden');
}

function hideLoading() {
    document.getElementById('loading').classList.add('hidden');
}