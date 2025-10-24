const API_BASE = 'https://footprint-logger-ui-bvhx.onrender.com';
let carbonData = {};
let weeklyChart = null;
let categoryChart = null;
let socket = null;

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

        // Initialize WebSocket
        initializeWebSocket();

        // Set up form
        const today = new Date().toISOString().split('T')[0];
        document.getElementById('activity-date').value = today;

        // Set up event listeners
        document.getElementById('activity-form').addEventListener('submit', addActivity);
        document.getElementById('activity-category').addEventListener('change', updateActivityTypes);
        document.getElementById('activity-type').addEventListener('change', updateUnitLabel);
        document.getElementById('filter-category').addEventListener('change', filterActivities);

        // Load data
        await loadDashboardData();
        await loadActivities();
        await loadLeaderboard();
        await loadCurrentInsight();
        await loadWeeklyGoal();
        await loadGoalHistory();

        // Initialize form
        populateCategories();
        updateActivityTypes();

    } catch (error) {
        console.error('Dashboard initialization error:', error);
        showToast('Failed to load dashboard. Please refresh the page.', 'error');
    } finally {
        hideLoading();
    }
}

// ============================================
// WEBSOCKET FUNCTIONALITY
// ============================================

function initializeWebSocket() {
    const token = localStorage.getItem('token');
    const WS_URL = API_BASE.replace('/api', '').replace('https://', 'wss://').replace('http://', 'ws://');

    socket = io(WS_URL, {
        auth: { token },
        transports: ['websocket', 'polling']
    });

    socket.on('connect', () => {
        console.log('✅ WebSocket connected');
        updateConnectionStatus(true);
        showToast('Connected to live updates', 'success');
    });

    socket.on('disconnect', () => {
        console.log('❌ WebSocket disconnected');
        updateConnectionStatus(false);
    });

    socket.on('connect_error', (error) => {
        console.error('WebSocket connection error:', error);
        updateConnectionStatus(false);
    });

    socket.on('new_insight', (insight) => {
        console.log('📊 New insight received:', insight);
        displayRealtimeInsight(insight);
        updateCurrentInsight(insight);
    });

    socket.on('goal_completed', (data) => {
        console.log('🎉 Goal completed:', data);
        showToast(data.message, 'success');
        confettiEffect();
        loadWeeklyGoal();
        loadGoalHistory();
    });

    socket.on('new_goal', (data) => {
        console.log('🎯 New goal created:', data);
        showToast(data.message, 'info');
        loadWeeklyGoal();
    });

    socket.on('error', (error) => {
        console.error('WebSocket error:', error);
    });
}

function updateConnectionStatus(connected) {
    const statusEl = document.getElementById('ws-status');
    const textEl = document.getElementById('ws-text');

    if (statusEl && textEl) {
        if (connected) {
            statusEl.style.color = '#48bb78';
            textEl.textContent = 'Live';
        } else {
            statusEl.style.color = '#f56565';
            textEl.textContent = 'Offline';
        }
    }
}

// ============================================
// INSIGHT FUNCTIONALITY
// ============================================

function displayRealtimeInsight(insight) {
    if (!insight.hasData) return;

    const alert = document.getElementById('insight-alert');
    if (!alert) return;

    document.getElementById('alert-title').textContent = 'New Insight Available!';
    document.getElementById('alert-message').textContent =
        `Your highest emissions are from ${insight.highestCategory} (${insight.highestEmission} kg CO₂)`;
    document.getElementById('alert-tip').textContent = insight.tip;
    document.getElementById('alert-reduction').textContent = insight.potentialReduction;

    alert.classList.add('show');

    // Auto-hide after 10 seconds
    setTimeout(() => {
        alert.classList.remove('show');
    }, 10000);
}

function closeInsightAlert() {
    const alert = document.getElementById('insight-alert');
    if (alert) {
        alert.classList.remove('show');
    }
}

async function loadCurrentInsight() {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE}/insights/current`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        const insight = await response.json();
        updateCurrentInsight(insight);
    } catch (error) {
        console.error('Error loading insight:', error);
    }
}

function updateCurrentInsight(insight) {
    const container = document.getElementById('current-insight');
    if (!container) return;

    if (!insight.hasData) {
        container.innerHTML = `
            <div class="insight-empty">
                <i class="fa-solid fa-inbox"></i>
                <p>No insights yet. Start logging activities to get personalized tips!</p>
            </div>
        `;
        return;
    }

    const categoryBreakdown = insight.categoryBreakdown || insight.categoryEmissions || {};
    const breakdownEntries = Object.entries(categoryBreakdown);

    container.innerHTML = `
        <div class="insight-main">
            <div class="insight-category">
                <span class="category-badge ${insight.highestCategory}">
                    ${getCategoryIcon(insight.highestCategory)}
                    ${insight.highestCategory}
                </span>
                <span class="insight-emission">${insight.highestEmission} kg CO₂</span>
            </div>
            <p class="insight-text">${insight.tip}</p>
            <div class="insight-action">
                <strong>Recommended Action:</strong> ${insight.action}
            </div>
            <div class="insight-impact">
                <i class="fa-solid fa-leaf"></i>
                Potential reduction: <strong>${insight.potentialReduction} kg CO₂/week</strong>
            </div>
        </div>
        ${breakdownEntries.length > 0 ? `
            <div class="insight-breakdown">
                <h4>Category Emissions:</h4>
                <div class="category-list">
                    ${breakdownEntries
                .sort((a, b) => b[1] - a[1])
                .map(([cat, value]) => `
                            <div class="category-item">
                                <span>${getCategoryIcon(cat)} ${cat}</span>
                                <span>${value.toFixed(2)} kg</span>
                            </div>
                        `).join('')}
                </div>
            </div>
        ` : ''}
    `;
}

async function refreshInsight() {
    try {
        showLoading();
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE}/insights/generate`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        const insight = await response.json();
        updateCurrentInsight(insight);
        showToast('Insight refreshed!', 'success');
        hideLoading();
    } catch (error) {
        console.error('Error refreshing insight:', error);
        showToast('Failed to refresh insight', 'error');
        hideLoading();
    }
}

function getCategoryIcon(category) {
    const icons = {
        transport: '<i class="fa-solid fa-car"></i>',
        food: '<i class="fa-solid fa-utensils"></i>',
        energy: '<i class="fa-solid fa-bolt"></i>',
        other: '<i class="fa-solid fa-box"></i>'
    };
    return icons[category] || '<i class="fa-solid fa-circle"></i>';
}

// ============================================
// WEEKLY GOAL FUNCTIONALITY
// ============================================

async function loadWeeklyGoal() {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE}/goals/current`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        const data = await response.json();

        const goalSection = document.getElementById('weekly-goal-section');
        if (!goalSection) return;

        if (!data.hasGoal) {
            goalSection.style.display = 'none';
            return;
        }

        const goal = data.goal;
        goalSection.style.display = 'block';

        // Update goal info
        document.getElementById('goal-category').textContent =
            goal.category.charAt(0).toUpperCase() + goal.category.slice(1);
        document.getElementById('goal-target').textContent =
            `${goal.targetReduction.toFixed(2)} kg`;
        document.getElementById('goal-baseline').textContent =
            `${goal.baselineEmission.toFixed(2)} kg`;
        document.getElementById('goal-current').textContent =
            `${goal.currentEmission.toFixed(2)} kg`;
        document.getElementById('goal-tip-text').textContent = goal.tip;

        // Update progress
        const progress = Math.min(100, Math.max(0, data.progress));
        const progressFill = document.getElementById('goal-progress');
        if (progressFill) {
            progressFill.style.width = `${progress}%`;
            const progressText = document.getElementById('goal-progress-text');
            if (progressText) {
                progressText.textContent = `${progress.toFixed(0)}%`;
            }
        }

        // Update status
        const statusEl = document.getElementById('goal-status');
        if (statusEl) {
            statusEl.textContent = goal.status.charAt(0).toUpperCase() + goal.status.slice(1);
            statusEl.className = `goal-status ${goal.status}`;
        }

        const daysEl = document.getElementById('days-remaining');
        if (daysEl) {
            daysEl.textContent = `${data.daysRemaining} days remaining`;
        }

    } catch (error) {
        console.error('Error loading goal:', error);
    }
}

async function loadGoalHistory() {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE}/goals/history`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        const data = await response.json();
        const container = document.getElementById('goal-history');

        if (!container) return;

        if (!data.goals || data.goals.length === 0) {
            container.innerHTML = '<p style="text-align: center; color: #666; padding: 20px;">No goal history yet.</p>';
            return;
        }

        container.innerHTML = `
            <div class="goal-stats">
                <div class="goal-stat">
                    <div class="goal-stat-value">${data.stats.completed}</div>
                    <div class="goal-stat-label">Completed</div>
                </div>
                <div class="goal-stat">
                    <div class="goal-stat-value">${data.stats.active}</div>
                    <div class="goal-stat-label">Active</div>
                </div>
                <div class="goal-stat">
                    <div class="goal-stat-value">${data.stats.total}</div>
                    <div class="goal-stat-label">Total</div>
                </div>
            </div>
            <div class="goal-history-list">
                ${data.goals.map(goal => `
                    <div class="goal-history-item ${goal.status}">
                        <div class="goal-history-header">
                            <span class="goal-category-badge">${getCategoryIcon(goal.category)} ${goal.category}</span>
                            <span class="goal-status-badge ${goal.status}">${goal.status}</span>
                        </div>
                        <div class="goal-history-details">
                            <div>Target: ${goal.targetReduction.toFixed(2)} kg reduction</div>
                            <div>Achieved: ${(goal.baselineEmission - goal.currentEmission).toFixed(2)} kg</div>
                        </div>
                        <div class="goal-history-date">
                            ${new Date(goal.weekStart).toLocaleDateString()} - ${new Date(goal.weekEnd).toLocaleDateString()}
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    } catch (error) {
        console.error('Error loading goal history:', error);
    }
}

// ============================================
// EXISTING FUNCTIONALITY (ENHANCED)
// ============================================

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

            // Update insight and goal if available
            if (stats.insight) {
                updateCurrentInsight(stats.insight);
            }
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
                borderColor: '#667eea',
                backgroundColor: 'rgba(102, 126, 234, 0.1)',
                tension: 0.4,
                fill: true,
                pointBackgroundColor: '#667eea',
                pointBorderColor: '#fff',
                pointBorderWidth: 2,
                pointRadius: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    display: true,
                    position: 'top'
                },
                tooltip: {
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    padding: 12,
                    titleColor: '#fff',
                    bodyColor: '#fff',
                    callbacks: {
                        label: function (context) {
                            return `${context.parsed.y.toFixed(2)} kg CO₂`;
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function (value) {
                            return value + ' kg';
                        }
                    }
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
        ctx.canvas.parentElement.innerHTML = '<p style="text-align: center; color: #666; padding: 40px;">No data available</p>';
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
                borderWidth: 3,
                borderColor: '#fff'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        padding: 15,
                        font: {
                            size: 12
                        }
                    }
                },
                tooltip: {
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    padding: 12,
                    callbacks: {
                        label: function (context) {
                            const label = context.label || '';
                            const value = context.parsed || 0;
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const percentage = ((value / total) * 100).toFixed(1);
                            return `${label}: ${value.toFixed(2)} kg (${percentage}%)`;
                        }
                    }
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
            showToast('Please fill in all fields correctly', 'warning');
            return;
        }

        showLoading();

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

        const data = await response.json();

        if (response.ok) {
            // Reset form
            document.getElementById('activity-form').reset();
            document.getElementById('activity-date').value = new Date().toISOString().split('T')[0];
            updateActivityTypes();

            // Reload data
            await Promise.all([
                loadDashboardData(),
                loadActivities(),
                loadWeeklyGoal()
            ]);

            // Show insight if available
            if (data.insight && data.insight.hasData) {
                displayRealtimeInsight(data.insight);
            }

            showToast('Activity added successfully!', 'success');
        } else {
            showToast(data.error || 'Failed to add activity', 'error');
        }

        hideLoading();
    } catch (error) {
        console.error('Error adding activity:', error);
        showToast('Failed to add activity. Please try again.', 'error');
        hideLoading();
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

    container.innerHTML = activities.map(activity => {
        const categoryIcon = getCategoryIcon(activity.category);
        const date = new Date(activity.date).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });

        return `
            <div class="activity-item">
                <div class="activity-icon">
                    ${categoryIcon}
                </div>
                <div class="activity-info">
                    <h4>${activity.label}</h4>
                    <div class="activity-details">
                        <span><i class="fa-solid fa-calendar"></i> ${date}</span>
                        <span><i class="fa-solid fa-ruler"></i> ${activity.amount} ${activity.unit}</span>
                        <span class="category-tag ${activity.category}">${activity.category}</span>
                    </div>
                </div>
                <div class="activity-right">
                    <div class="activity-emission">${activity.co2Emission.toFixed(2)} kg CO₂</div>
                    <button onclick="deleteActivity('${activity._id}')" class="delete-btn" title="Delete activity">
                        <i class="fa-solid fa-trash"></i>
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

async function deleteActivity(id) {
    if (!confirm('Are you sure you want to delete this activity?')) {
        return;
    }

    try {
        showLoading();
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE}/activities/${id}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (response.ok) {
            await Promise.all([
                loadDashboardData(),
                loadActivities(),
                loadWeeklyGoal()
            ]);
            showToast('Activity deleted successfully', 'success');
        } else {
            showToast('Failed to delete activity', 'error');
        }
        hideLoading();
    } catch (error) {
        console.error('Error deleting activity:', error);
        showToast('Failed to delete activity. Please try again.', 'error');
        hideLoading();
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
        container.innerHTML = '<p style="text-align: center; color: #666; padding: 20px;">No data available yet.</p>';
        return;
    }

    const medals = ['🥇', '🥈', '🥉'];

    container.innerHTML = leaderboard.map((user, index) => {
        const medal = index < 3 ? medals[index] : `#${index + 1}`;

        return `
            <div class="leaderboard-item ${index < 3 ? 'top-three' : ''}">
                <div class="leaderboard-left">
                    <span class="leaderboard-rank">${medal}</span>
                    <div class="leaderboard-user">
                        <strong>${user.username}</strong>
                        <small>${user.activityCount} activities</small>
                    </div>
                </div>
                <div class="leaderboard-emissions">
                    ${user.totalEmissions} kg CO₂
                </div>
            </div>
        `;
    }).join('');
}

function filterActivities() {
    loadActivities();
}

function logout() {
    if (confirm('Are you sure you want to logout?')) {
        // Close WebSocket connection
        if (socket) {
            socket.disconnect();
        }

        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/';
    }
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

function showLoading() {
    const loading = document.getElementById('loading');
    if (loading) {
        loading.classList.remove('hidden');
    }
}

function hideLoading() {
    const loading = document.getElementById('loading');
    if (loading) {
        loading.classList.add('hidden');
    }
}

function showToast(message, type = 'info') {
    let container = document.getElementById('toast-container');

    // Create container if it doesn't exist
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        container.className = 'toast-container';
        document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;

    const icon = {
        success: '<i class="fa-solid fa-check-circle"></i>',
        error: '<i class="fa-solid fa-times-circle"></i>',
        warning: '<i class="fa-solid fa-exclamation-triangle"></i>',
        info: '<i class="fa-solid fa-info-circle"></i>'
    }[type] || '<i class="fa-solid fa-info-circle"></i>';

    toast.innerHTML = `
        ${icon}
        <span>${message}</span>
    `;

    container.appendChild(toast);

    // Animate in
    setTimeout(() => toast.classList.add('show'), 10);

    // Remove after 4 seconds
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}

function confettiEffect() {
    // Simple confetti effect (you can enhance this with a library like canvas-confetti)
    const colors = ['#f56565', '#48bb78', '#4299e1', '#ed8936', '#9f7aea', '#ed64a6'];
    const confettiCount = 50;

    for (let i = 0; i < confettiCount; i++) {
        const confetti = document.createElement('div');
        confetti.className = 'confetti';
        confetti.style.left = Math.random() * 100 + '%';
        confetti.style.background = colors[Math.floor(Math.random() * colors.length)];
        confetti.style.animationDelay = Math.random() * 0.5 + 's';
        document.body.appendChild(confetti);

        setTimeout(() => confetti.remove(), 3000);
    }
}

// ============================================
// KEYBOARD SHORTCUTS
// ============================================

document.addEventListener('keydown', (e) => {
    // Ctrl/Cmd + K to focus on activity form
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        document.getElementById('activity-category').focus();
    }

    // Ctrl/Cmd + R to refresh insights
    if ((e.ctrlKey || e.metaKey) && e.key === 'r') {
        e.preventDefault();
        refreshInsight();
    }
});

// ============================================
// AUTO-REFRESH (Optional)
// ============================================

// Auto-refresh dashboard data every 5 minutes
setInterval(() => {
    console.log('Auto-refreshing dashboard data...');
    loadDashboardData();
    loadWeeklyGoal();
}, 5 * 60 * 1000);

// ============================================
// SERVICE WORKER (Optional - for PWA)
// ============================================

if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
            .then(registration => console.log('ServiceWorker registered'))
            .catch(err => console.log('ServiceWorker registration failed'));
    });
}