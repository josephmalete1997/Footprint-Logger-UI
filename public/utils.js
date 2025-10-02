function formatDate(dateString) {
    try {
        return new Date(dateString).toLocaleDateString();
    } catch (error) {
        console.error('Error formatting date:', error);
        return 'Invalid date';
    }
}

function calculatePercentage(value, total) {
    try {
        return total > 0 ? ((value / total) * 100).toFixed(1) : '0.0';
    } catch (error) {
        console.error('Error calculating percentage:', error);
        return '0.0';
    }
}

function formatCO2(value) {
    try {
        return parseFloat(value).toFixed(2);
    } catch (error) {
        console.error('Error formatting CO2 value:', error);
        return '0.00';
    }
} 