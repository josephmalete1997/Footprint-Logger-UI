const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const path = require('path');
const http = require('http');
const { Server } = require('socket.io');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Environment validation
if (!process.env.MONGODB_URI || !process.env.JWT_SECRET) {
  console.error('❌ Missing required environment variables');
  process.exit(1);
}

// Middleware
app.use(express.json());
app.use(cors());
app.use(express.static('public'));

// Carbon data constants (your existing carbonData)
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

// Insight tips database
const insightTips = {
  transport: [
    { threshold: 10, tip: "Try cycling or walking for short trips to cut transport emissions by 100%", action: "cycle/walk", reduction: 2 },
    { threshold: 20, tip: "Consider taking the bus or train instead of driving twice this week", action: "public transport", reduction: 3 },
    { threshold: 50, tip: "Carpooling can reduce your travel emissions by 50%", action: "carpool", reduction: 5 },
    { threshold: 100, tip: "Working from home 2 days a week could save 10kg CO2", action: "work from home", reduction: 10 }
  ],
  food: [
    { threshold: 5, tip: "Try one plant-based meal this week to reduce food emissions", action: "plant-based meal", reduction: 2 },
    { threshold: 10, tip: "Reducing beef consumption by 50% could save 5kg CO2 weekly", action: "less beef", reduction: 5 },
    { threshold: 20, tip: "Consider Meatless Mondays - it can cut 3kg CO2 per week", action: "meatless monday", reduction: 3 },
    { threshold: 30, tip: "Switching to chicken instead of beef saves 20kg CO2 per kg", action: "switch proteins", reduction: 8 }
  ],
  energy: [
    { threshold: 5, tip: "Turn off lights when leaving rooms - save 0.5kg CO2 daily", action: "lights off", reduction: 3.5 },
    { threshold: 10, tip: "Lower your thermostat by 1°C to save 2kg CO2 weekly", action: "lower heating", reduction: 2 },
    { threshold: 20, tip: "Unplug devices when not in use - reduce standby power consumption", action: "unplug devices", reduction: 4 },
    { threshold: 50, tip: "Consider switching to LED bulbs - save up to 5kg CO2 weekly", action: "LED bulbs", reduction: 5 }
  ],
  other: [
    { threshold: 5, tip: "Start composting to reduce waste emissions by 30%", action: "composting", reduction: 2 },
    { threshold: 10, tip: "Buy second-hand clothing instead of new to save 10kg CO2 per item", action: "second-hand", reduction: 10 },
    { threshold: 20, tip: "Repair electronics instead of replacing - save 100kg CO2", action: "repair", reduction: 20 }
  ]
};

// MongoDB Schemas
const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true, trim: true },
  email: { type: String, required: true, unique: true, trim: true, lowercase: true },
  password: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  lastActive: { type: Date, default: Date.now },
  lastInsightCheck: { type: Date, default: Date.now }
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

// NEW: Weekly Goal Schema
const weeklyGoalSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  weekStart: { type: Date, required: true },
  weekEnd: { type: Date, required: true },
  category: { type: String, required: true },
  targetReduction: { type: Number, required: true }, // kg CO2
  baselineEmission: { type: Number, required: true }, // kg CO2 from previous week
  currentEmission: { type: Number, default: 0 },
  tip: { type: String, required: true },
  action: { type: String, required: true },
  status: { type: String, enum: ['active', 'completed', 'failed'], default: 'active' },
  completed: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

// NEW: Insight Schema
const insightSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  date: { type: Date, default: Date.now },
  highestCategory: { type: String, required: true },
  categoryEmissions: { type: Map, of: Number },
  totalEmissions: { type: Number, required: true },
  tip: { type: String, required: true },
  action: { type: String, required: true },
  potentialReduction: { type: Number, required: true },
  viewed: { type: Boolean, default: false }
});

const User = mongoose.model('User', userSchema);
const Activity = mongoose.model('Activity', activitySchema);
const WeeklyGoal = mongoose.model('WeeklyGoal', weeklyGoalSchema);
const Insight = mongoose.model('Insight', insightSchema);

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

// WebSocket authentication
io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  if (!token) {
    return next(new Error('Authentication error'));
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) return next(new Error('Authentication error'));
    socket.userId = decoded.userId;
    socket.username = decoded.username;
    next();
  });
});

// WebSocket connection handling
io.on('connection', (socket) => {
  console.log(`✅ User ${socket.username} connected via WebSocket`);

  socket.join(`user_${socket.userId}`);

  socket.on('request_insight', async () => {
    try {
      const insight = await generateInsight(socket.userId);
      socket.emit('new_insight', insight);
    } catch (error) {
      socket.emit('error', { message: 'Failed to generate insight' });
    }
  });

  socket.on('disconnect', () => {
    console.log(`❌ User ${socket.username} disconnected`);
  });
});

// Helper function to send real-time insights
function sendRealtimeInsight(userId, insight) {
  io.to(`user_${userId}`).emit('new_insight', insight);
}

// INSIGHT ENGINE: Analyze user activity
async function analyzeUserActivity(userId) {
  try {
    // Get last 7 days of activity
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);

    const activities = await Activity.find({
      userId: new mongoose.Types.ObjectId(userId),
      date: { $gte: weekAgo }
    });

    // Group by category
    const categoryTotals = {};
    let totalEmissions = 0;

    activities.forEach(activity => {
      if (!categoryTotals[activity.category]) {
        categoryTotals[activity.category] = 0;
      }
      categoryTotals[activity.category] += activity.co2Emission;
      totalEmissions += activity.co2Emission;
    });

    // Find highest emission category
    let highestCategory = null;
    let highestEmission = 0;

    for (const [category, emission] of Object.entries(categoryTotals)) {
      if (emission > highestEmission) {
        highestEmission = emission;
        highestCategory = category;
      }
    }

    return {
      categoryTotals,
      highestCategory,
      highestEmission,
      totalEmissions,
      activityCount: activities.length
    };
  } catch (error) {
    console.error('Analysis error:', error);
    throw error;
  }
}

// INSIGHT ENGINE: Generate personalized tip
function generateTip(category, emission) {
  const tips = insightTips[category] || insightTips['other'];

  // Find appropriate tip based on emission level
  let selectedTip = tips[0];
  for (const tip of tips) {
    if (emission >= tip.threshold) {
      selectedTip = tip;
    }
  }

  return selectedTip;
}

// INSIGHT ENGINE: Generate full insight
async function generateInsight(userId) {
  try {
    const analysis = await analyzeUserActivity(userId);

    if (!analysis.highestCategory || analysis.totalEmissions === 0) {
      return {
        message: 'No activity data yet. Start logging your activities!',
        hasData: false
      };
    }

    const tip = generateTip(analysis.highestCategory, analysis.highestEmission);

    const insight = new Insight({
      userId,
      highestCategory: analysis.highestCategory,
      categoryEmissions: analysis.categoryTotals,
      totalEmissions: analysis.totalEmissions,
      tip: tip.tip,
      action: tip.action,
      potentialReduction: tip.reduction
    });

    await insight.save();

    return {
      hasData: true,
      highestCategory: analysis.highestCategory,
      highestEmission: analysis.highestEmission.toFixed(2),
      totalEmissions: analysis.totalEmissions.toFixed(2),
      categoryBreakdown: analysis.categoryTotals,
      tip: tip.tip,
      action: tip.action,
      potentialReduction: tip.reduction,
      insightId: insight._id
    };
  } catch (error) {
    console.error('Insight generation error:', error);
    throw error;
  }
}

// WEEKLY GOAL: Create or get current goal
async function createWeeklyGoal(userId) {
  try {
    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay()); // Start of week (Sunday)
    weekStart.setHours(0, 0, 0, 0);

    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 7);

    // Check if goal already exists for this week
    let goal = await WeeklyGoal.findOne({
      userId: new mongoose.Types.ObjectId(userId),
      weekStart: { $gte: weekStart },
      status: 'active'
    });

    if (goal) {
      // Update current emission
      const weekActivities = await Activity.aggregate([
        {
          $match: {
            userId: new mongoose.Types.ObjectId(userId),
            date: { $gte: weekStart, $lt: weekEnd }
          }
        },
        {
          $group: {
            _id: '$category',
            total: { $sum: '$co2Emission' }
          }
        }
      ]);

      const categoryEmission = weekActivities.find(a => a._id === goal.category);
      goal.currentEmission = categoryEmission ? categoryEmission.total : 0;

      // Check if goal completed
      if (goal.currentEmission <= (goal.baselineEmission - goal.targetReduction)) {
        goal.status = 'completed';
        goal.completed = true;
      }

      await goal.save();
      return goal;
    }

    // Generate new goal based on insight
    const insight = await generateInsight(userId);

    if (!insight.hasData) {
      return null;
    }

    // Get previous week's emission for baseline
    const prevWeekStart = new Date(weekStart);
    prevWeekStart.setDate(prevWeekStart.getDate() - 7);

    const baselineData = await Activity.aggregate([
      {
        $match: {
          userId: new mongoose.Types.ObjectId(userId),
          category: insight.highestCategory,
          date: { $gte: prevWeekStart, $lt: weekStart }
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$co2Emission' }
        }
      }
    ]);

    const baseline = baselineData[0]?.total || parseFloat(insight.highestEmission);

    goal = new WeeklyGoal({
      userId,
      weekStart,
      weekEnd,
      category: insight.highestCategory,
      targetReduction: insight.potentialReduction,
      baselineEmission: baseline,
      currentEmission: parseFloat(insight.highestEmission),
      tip: insight.tip,
      action: insight.action
    });

    await goal.save();
    return goal;
  } catch (error) {
    console.error('Goal creation error:', error);
    throw error;
  }
}

// Routes (keeping your existing routes)
app.get('/', (req, res) => {
  res.json({
    message: 'Carbon Footprint Insight Engine API',
    version: '2.0.0',
    features: ['Activity Logging', 'Insight Generation', 'Weekly Goals', 'Real-time Tips'],
    endpoints: {
      auth: '/api/auth/register, /api/auth/login',
      activities: '/api/activities',
      insights: '/api/insights/current, /api/insights/generate',
      goals: '/api/goals/current, /api/goals/history',
      dashboard: '/api/dashboard/stats'
    }
  });
});

// ... (keep your existing auth routes: /api/auth/register, /api/auth/login, /api/auth/verify)

app.post('/api/auth/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    const existingUser = await User.findOne({ $or: [{ email }, { username }] });

    if (existingUser) {
      return res.status(400).json({ error: 'User already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = new User({ username, email, password: hashedPassword });
    await user.save();

    const token = jwt.sign(
      { userId: user._id, username: user.username },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      message: 'User created successfully',
      token,
      user: { id: user._id, username: user.username, email: user.email }
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
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    user.lastActive = new Date();
    await user.save();

    const token = jwt.sign(
      { userId: user._id, username: user.username },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Generate insight on login
    const insight = await generateInsight(user._id);

    // Send real-time insight via WebSocket if connected
    // Send real-time insight via WebSocket if connected
    sendRealtimeInsight(user._id, insight);

    res.json({
      message: 'Login successful',
      token,
      user: { id: user._id, username: user.username, email: user.email },
      insight
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Server error during login' });
  }
});

app.get('/api/auth/verify', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select('-password');
    res.json({ user });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Activity Routes (keep existing + modifications)
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

    // NEW: Generate real-time insight after activity
    const insight = await generateInsight(req.user.userId);
    sendRealtimeInsight(req.user.userId, insight);

    // NEW: Update weekly goal if exists
    const goal = await WeeklyGoal.findOne({
      userId: req.user.userId,
      status: 'active'
    });

    if (goal && goal.category === category) {
      goal.currentEmission += co2Emission;
      if (goal.currentEmission <= (goal.baselineEmission - goal.targetReduction)) {
        goal.status = 'completed';
        goal.completed = true;

        // Send real-time goal completion notification
        io.to(`user_${req.user.userId}`).emit('goal_completed', {
          message: `🎉 Congratulations! You've achieved your weekly goal!`,
          goal: goal
        });
      }
      await goal.save();
    }

    res.status(201).json({ activity, insight });
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

    const activities = await Activity.find(query).sort({ date: -1, createdAt: -1 });
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

// NEW: Insight Routes
app.get('/api/insights/current', authenticateToken, async (req, res) => {
  try {
    const insight = await Insight.findOne({
      userId: req.user.userId
    }).sort({ date: -1 });

    if (!insight) {
      return res.json({ message: 'No insights yet', hasData: false });
    }

    res.json(insight);
  } catch (error) {
    console.error('Insight fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch insight' });
  }
});

app.post('/api/insights/generate', authenticateToken, async (req, res) => {
  try {
    const insight = await generateInsight(req.user.userId);

    // Send via WebSocket as well
    sendRealtimeInsight(req.user.userId, insight);

    res.json(insight);
  } catch (error) {
    console.error('Insight generation error:', error);
    res.status(500).json({ error: 'Failed to generate insight' });
  }
});

app.get('/api/insights/history', authenticateToken, async (req, res) => {
  try {
    const insights = await Insight.find({
      userId: req.user.userId
    })
      .sort({ date: -1 })
      .limit(10);

    res.json(insights);
  } catch (error) {
    console.error('Insight history error:', error);
    res.status(500).json({ error: 'Failed to fetch insight history' });
  }
});

// NEW: Weekly Goal Routes
app.get('/api/goals/current', authenticateToken, async (req, res) => {
  try {
    let goal = await createWeeklyGoal(req.user.userId);

    if (!goal) {
      return res.json({
        message: 'No goal yet. Log some activities first!',
        hasGoal: false
      });
    }

    const progress = goal.baselineEmission > 0
      ? ((goal.baselineEmission - goal.currentEmission) / goal.targetReduction * 100)
      : 0;

    res.json({
      hasGoal: true,
      goal,
      progress: Math.min(100, Math.max(0, progress)),
      daysRemaining: Math.ceil((goal.weekEnd - new Date()) / (1000 * 60 * 60 * 24))
    });
  } catch (error) {
    console.error('Goal fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch goal' });
  }
});

app.post('/api/goals/create', authenticateToken, async (req, res) => {
  try {
    const goal = await createWeeklyGoal(req.user.userId);

    if (!goal) {
      return res.status(400).json({
        error: 'Cannot create goal. Need activity data first.'
      });
    }

    // Send real-time notification
    io.to(`user_${req.user.userId}`).emit('new_goal', {
      message: 'New weekly goal created!',
      goal
    });

    res.status(201).json(goal);
  } catch (error) {
    console.error('Goal creation error:', error);
    res.status(500).json({ error: 'Failed to create goal' });
  }
});

app.get('/api/goals/history', authenticateToken, async (req, res) => {
  try {
    const goals = await WeeklyGoal.find({
      userId: req.user.userId
    })
      .sort({ weekStart: -1 })
      .limit(10);

    const stats = {
      total: goals.length,
      completed: goals.filter(g => g.status === 'completed').length,
      active: goals.filter(g => g.status === 'active').length,
      failed: goals.filter(g => g.status === 'failed').length
    };

    res.json({ goals, stats });
  } catch (error) {
    console.error('Goal history error:', error);
    res.status(500).json({ error: 'Failed to fetch goal history' });
  }
});

// Dashboard Stats Routes (keep your existing + enhancements)
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

    // NEW: Get current insight and goal
    const insight = await generateInsight(userId);
    const goalData = await WeeklyGoal.findOne({
      userId: new mongoose.Types.ObjectId(userId),
      status: 'active'
    });

    res.json({
      userTotal: userTotal[0]?.total || 0,
      globalAverage: globalAvg[0]?.average || 0,
      weeklyData,
      categoryBreakdown,
      insight,
      currentGoal: goalData
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

// NEW: Carbon data endpoint
app.get('/api/carbon-data', (req, res) => {
  res.json(carbonData);
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    database: mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected',
    features: {
      insights: true,
      weeklyGoals: true,
      realTimeTips: true,
      websockets: true
    }
  });
});

// Error handling
app.use((err, req, res, next) => {
  console.error('Error:', err.stack);
  res.status(err.status || 500).json({
    error: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong!'
  });
});

app.use('/api/*', (req, res) => {
  res.status(404).json({ error: 'API endpoint not found' });
});

// MongoDB connection
console.log('🔌 Attempting to connect to MongoDB...');
mongoose.connect(process.env.MONGODB_URI)
  .then(() => {
    console.log('✅ Connected to MongoDB');
    console.log('📊 Database:', mongoose.connection.name);
    startServer();
  })
  .catch((error) => {
    console.error('❌ MongoDB connection error:', error.message);
    process.exit(1);
  });

function startServer() {
  const PORT = process.env.PORT || 3000;

  server.listen(PORT, () => {
    console.log(`\n🚀 Footprint Insight Engine running on port ${PORT}`);
    console.log(`📍 Local: http://localhost:${PORT}`);
    console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`💡 Features: Insights ✓ | Goals ✓ | WebSockets ✓`);
  });

  server.on('error', (error) => {
    if (error.code === 'EADDRINUSE') {
      console.error(`❌ Port ${PORT} is already in use`);
    } else {
      console.error('❌ Server error:', error);
    }
    process.exit(1);
  });
}

process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down gracefully...');
  try {
    await mongoose.connection.close();
    console.log('✅ MongoDB connection closed');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error during shutdown:', error);
    process.exit(1);
  }
});

module.exports = { app, server };