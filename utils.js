function formatDate(dateString) {
    return new Date(dateString).toLocaleDateString();
}

function calculatePercentage(value, total) {
    return total > 0 ? ((value / total) * 100).toFixed(1) : '0.0';
}

function formatCO2(value) {
    return parseFloat(value).toFixed(2);
} 