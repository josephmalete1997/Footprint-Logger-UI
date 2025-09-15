const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');

const app = express();

// Middleware
app.use(bodyParser.json());
app.use(cors());
app.use(express.static('public'));

// Sample route
app.get('/api/hello', (req, res) => {
  res.json({ message: 'Hello, world!' });
});

// Start the server
const PORT = process.env.PORT || 3000;