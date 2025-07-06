# Footprint Logger UI

A web application that helps users track their daily carbon footprint by logging activities that contribute to CO2 emissions.

## Features

- Log daily activities across different categories (transport, food, energy, etc.)
- Automatically calculate CO2 emissions based on activity type and amount
- View a running total of your carbon footprint
- Visualize your emissions with a pie chart showing breakdown by category
- Filter activities by category
- Data persists between sessions using localStorage

## Technologies Used

- HTML5
- CSS3
- JavaScript (ES6+)
- Chart.js for data visualization
- Font Awesome for icons
- LocalStorage API for data persistence

## Project Structure

- `index.html` - Main HTML file
- `styles.css` - CSS styling
- `constants.js` - Constants and configuration
- `data.js` - Carbon footprint data
- `utils.js` - Utility functions
- `storage.js` - LocalStorage operations
- `ui.js` - UI-related functionality
- `chart.js` - Chart visualization
- `app.js` - Main application logic

## How to Use

1. Open `index.html` in your web browser
2. Select a category and activity type from the dropdown menus
3. Enter the amount (e.g., kilometers traveled, kilograms of food consumed)
4. Add the activity to your log
5. View your total carbon footprint and breakdown in the charts
6. Filter activities by category using the dropdown in the Activity Log section

## Data Sources

The CO2 emission values used in this application are approximations based on various environmental research. They are intended to provide a general understanding of relative carbon impacts rather than precise measurements.

## Future Improvements

- User accounts and cloud data storage
- Custom activity types and emission values
- Historical data tracking and trends
- Suggestions for reducing carbon footprint
- Social sharing features

## License

This project is open source and available under the [MIT License](LICENSE).

## Author

Created for an environmental group project. 