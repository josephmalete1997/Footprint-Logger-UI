/**
 * Format a date string to a localized date
 * @param {string} dateString - ISO date string
 * @returns {string} Formatted date
 */
function formatDate(dateString) {
    try {
        return new Date(dateString).toLocaleDateString();
    } catch (error) {
        console.error('Error formatting date:', error);
        return 'Invalid date';
    }
}

/**
 * Calculate percentage of a value from a total
 * @param {number} value - The value
 * @param {number} total - The total
 * @returns {string} Percentage with one decimal place
 */
function calculatePercentage(value, total) {
    try {
        return total > 0 ? ((value / total) * 100).toFixed(1) : '0.0';
    } catch (error) {
        console.error('Error calculating percentage:', error);
        return '0.0';
    }
}

/**
 * Format CO2 value to 2 decimal places
 * @param {number} value - CO2 value
 * @returns {string} Formatted value
 */
function formatCO2(value) {
    try {
        return parseFloat(value).toFixed(2);
    } catch (error) {
        console.error('Error formatting CO2 value:', error);
        return '0.00';
    }
} 