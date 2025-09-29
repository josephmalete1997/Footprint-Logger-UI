const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const path = require('path');
require('dotenv').config();

const app = express();

// Environment validation
if (!process.env.MONGODB_URI || !process.env.JWT_SECRET) {
  console.error('❌ Missing required environment variables:');
  console.error('   MONGODB_URI:', process.env.MONGODB_URI ? '✅ Set' : '❌ Missing');
  console.error('   JWT_SECRET:', process.env.JWT_SECRET ? '✅ Set' : '❌ Missing');
  console.error('\nPlease check your .env file!');
  process.exit(1);
}

// Middleware
app.use(express.json());
app.use(cors());
app.use(express.static('public'));

// Carbon data constants
const carbonData = {
  transport: {
    car: { value: 0.12, unit: 'kg per km', label: 'Car Travel' },
    bus: { value: 0.03, unit: 'kg per km', label: 'Bus Travel' },
    train: { value: 0.01, unit: 'kg per km', label: 'Train Travel' },
    plane: { value: 0.25, unit: 'kg per km', label: 'Air Travel' },
    bicycle: { value: 0, unit: 'kg per km', label: 'Cycling' },
    walking: { value: 0, unit: 'kg per km', label: 'Walking' }
  },
  food: {
    beef: { value: 27, unit: 'kg per kg', label: 'Beef Consumption' },
    lamb: { value: 39, unit: 'kg per kg', label: 'Lamb Consumption' },
    pork: { value: 12, unit: 'kg per kg', label: 'Pork Consumption' },
    chicken: { value: 6.9, unit: 'kg per kg', label: 'Chicken Consumption' },
    fish: { value: 6, unit: 'kg per kg', label: 'Fish Consumption' },
    dairy: { value: 1.9, unit: 'kg per kg', label: 'Dairy Products' },
    vegetables: { value: 0.4, unit: 'kg per kg', label: 'Vegetables' },
    fruits: { value: 0.5, unit: 'kg per kg', label: 'Fruits' }
  },
  energy: {
    electricity: { value: 0.5, unit: 'kg per kWh', label: 'Electricity Usage' },
    naturalGas: { value: 0.2, unit: 'kg per kWh', label: 'Natural Gas Usage' },
    lpg: { value: 0.25, unit: 'kg per kWh', label: 'LPG Usage' },
    wood: { value: 0.02, unit: 'kg per kg', label: 'Wood Burning' }
  },
  other: {
    waste: { value: 0.7, unit: 'kg per kg', label: 'Waste Production' },
    water: { value: 0.001, unit: 'kg per liter', label: 'Water Usage' },
    clothing: { value: 10, unit: 'kg per item', label: 'New Clothing Item' },
    electronics: { value: 100, unit: 'kg per item', label: 'New Electronic Device' }
  }
};

// MongoDB Schemas
const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true, trim: true },
  email: { type: String, required: true, unique: true, trim: true, lowercase: true },
  password: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  lastActive: { type: Date, default: Date.now }
});

const activitySchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  category: { type: String, required: true },
  activityType: { type: String, required: true },
  label: { type: String, required: true },
  amount: { type: Number, required: true },
  unit: { type: String, required: true },
  date: { type: Date, required: true },
  co2Emission: { type: Number, required: true },
  createdAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);
const Activity = mongoose.model('Activity', activitySchema);

// Authentication middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
};

// Routes
app.get('/', (req, res) => {
  res.json({ 
    message: 'Carbon Footprint Logger API',
    version: '1.0.0',
    endpoints: {
      auth: '/api/auth/register, /api/auth/login',
      activities: '/api/activities',
      dashboard: '/api/dashboard/stats, /api/dashboard/leaderboard'
    }
  });
});

app.get('/api/carbon-data', (req, res) => {
  res.json(carbonData);
});

// Auth Routes
app.post('/api/auth/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    const existingUser = await User.findOne({
      $or: [{ email }, { username }]
    });

    if (existingUser) {
      return res.status(400).json({ 
        error: 'User already exists with this email or username' 
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    
    const user = new User({
      username,
      email,
      password: hashedPassword
    });

    await user.save();

    const token = jwt.sign(
      { userId: user._id, username: user.username },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      message: 'User created successfully',
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Server error during registration' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const user = await User.findOne({ email });
    
    if (!user || !await bcrypt.compare(password, user.password)) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    user.lastActive = new Date();
    await user.save();

    const token = jwt.sign(
      { userId: user._id, username: user.username },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Server error during login' });
  }
});

// Protected Routes
app.get('/api/auth/verify', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select('-password');
    res.json({ user });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Activity Routes
app.post('/api/activities', authenticateToken, async (req, res) => {
  try {
    const { category, activityType, amount, date } = req.body;

    if (!category || !activityType || !amount || !date) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    if (!carbonData[category] || !carbonData[category][activityType]) {
      return res.status(400).json({ error: 'Invalid activity type' });
    }

    const activityData = carbonData[category][activityType];
    const co2Emission = activityData.value * amount;

    const activity = new Activity({
      userId: req.user.userId,
      category,
      activityType,
      label: activityData.label,
      amount,
      unit: activityData.unit.split(' per ')[1],
      date: new Date(date),
      co2Emission
    });

    await activity.save();
    res.status(201).json(activity);
  } catch (error) {
    console.error('Activity creation error:', error);
    res.status(500).json({ error: 'Failed to create activity' });
  }
});

app.get('/api/activities', authenticateToken, async (req, res) => {
  try {
    const { category, startDate, endDate } = req.query;
    
    let query = { userId: req.user.userId };
    
    if (category && category !== 'all') {
      query.category = category;
    }
    
    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate);
      if (endDate) query.date.$lte = new Date(endDate);
    }

    const activities = await Activity.find(query)
      .sort({ date: -1, createdAt: -1 });
      
    res.json(activities);
  } catch (error) {
    console.error('Activities fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch activities' });
  }
});

app.delete('/api/activities/:id', authenticateToken, async (req, res) => {
  try {
    const activity = await Activity.findOne({
      _id: req.params.id,
      userId: req.user.userId
    });

    if (!activity) {
      return res.status(404).json({ error: 'Activity not found' });
    }

    await Activity.deleteOne({ _id: req.params.id });
    res.json({ message: 'Activity deleted successfully' });
  } catch (error) {
    console.error('Activity deletion error:', error);
    res.status(500).json({ error: 'Failed to delete activity' });
  }
});

// Dashboard Stats Routes
app.get('/api/dashboard/stats', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    
    const userTotal = await Activity.aggregate([
      { $match: { userId: new mongoose.Types.ObjectId(userId) } },
      { $group: { _id: null, total: { $sum: '$co2Emission' } } }
    ]);

    const globalAvg = await Activity.aggregate([
      { $group: { _id: '$userId', userTotal: { $sum: '$co2Emission' } } },
      { $group: { _id: null, average: { $avg: '$userTotal' } } }
    ]);

    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    
    const weeklyData = await Activity.aggregate([
      {
        $match: {
          userId: new mongoose.Types.ObjectId(userId),
          date: { $gte: weekAgo }
        }
      },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$date' } },
          dailyTotal: { $sum: '$co2Emission' }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    const categoryBreakdown = await Activity.aggregate([
      { $match: { userId: new mongoose.Types.ObjectId(userId) } },
      {
        $group: {
          _id: '$category',
          total: { $sum: '$co2Emission' },
          count: { $sum: 1 }
        }
      }
    ]);

    res.json({
      userTotal: userTotal[0]?.total || 0,
      globalAverage: globalAvg[0]?.average || 0,
      weeklyData,
      categoryBreakdown
    });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard stats' });
  }
});

app.get('/api/dashboard/leaderboard', authenticateToken, async (req, res) => {
  try {
    const leaderboard = await Activity.aggregate([
      {
        $group: {
          _id: '$userId',
          totalEmissions: { $sum: '$co2Emission' },
          activityCount: { $sum: 1 }
        }
      },
      { $sort: { totalEmissions: 1 } },
      { $limit: 10 },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'user'
        }
      },
      {
        $project: {
          username: { $arrayElemAt: ['$user.username', 0] },
          totalEmissions: { $round: ['$totalEmissions', 2] },
          activityCount: 1
        }
      }
    ]);

    res.json(leaderboard);
  } catch (error) {
    console.error('Leaderboard error:', error);
    res.status(500).json({ error: 'Failed to fetch leaderboard' });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    database: mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected'
  });
});

// Error handling
app.use((err, req, res, next) => {
  console.error('Error:', err.stack);
  res.status(err.status || 500).json({
    error: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong!'
  });
});

app.get('/api/*', (req, res) => {
  res.status(404).json({ error: 'API endpoint not found' });
});

// MongoDB connection (FIXED - removed deprecated options)
console.log('Attempting to connect to MongoDB...');
mongoose.connect(process.env.MONGODB_URI)
.then(() => {
  console.log('Connected to MongoDB');
  console.log('Database:', mongoose.connection.name);
  startServer();
})
.catch((error) => {
  console.error('MongoDB connection error:', error.message);
  console.error('\n Possible solutions:');
  console.error('   1. Install and start local MongoDB');
  console.error('   2. Use MongoDB Atlas (cloud)');
  console.error('   3. Check your MONGODB_URI in .env file');
  process.exit(1);
});

function startServer() {
  const PORT = process.env.PORT || 3000;
  
  const server = app.listen(PORT, () => {
    console.log(`Footprint Logger Server running on port ${PORT}`);
    console.log(`Local: http://localhost:${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  });

  server.on('error', (error) => {
    if (error.code === 'EADDRINUSE') {
      console.error(`Port ${PORT} is already in use`);
    } else {
      console.error('Server error:', error);
    }
    process.exit(1);
  });
}

process.on('SIGINT', async () => {
  console.log('\n Shutting down gracefully...');
  try {
    await mongoose.connection.close();
    console.log('MongoDB connection closed');
    process.exit(0);
  } catch (error) {
    console.error('Error during shutdown:', error);
    process.exit(1);
  }
});