require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const authRoutes = require('./routes/auth');
const analysisRoutes = require('./routes/analysis');

const app = express();
const PORT = process.env.PORT || 5000;

/**
 * Middleware Configuration
 */

// Enable CORS for frontend communication
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:3000'],
  credentials: true
}));

// Parse JSON request bodies (limit to 5MB for large code blocks)
app.use(express.json({ limit: '5mb' }));

// Rate limiting to prevent abuse of the analysis API
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minute window
  max: 50, // limit each IP to 50 requests per window
  message: { message: 'Too many requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false
});

// Apply rate limiting to analysis endpoints
app.use('/api/analyze', apiLimiter);
app.use('/api/github-analyze', apiLimiter);

/**
 * Route Registration
 */
app.use('/api/auth', authRoutes);
app.use('/api', analysisRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

/**
 * MongoDB Connection & Server Startup
 */
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/explainmycode';

mongoose.connect(MONGODB_URI)
  .then(() => {
    console.log('✅ Connected to MongoDB');
    app.listen(PORT, () => {
      console.log(`🚀 Server running on http://localhost:${PORT}`);
    });
  })
  .catch(err => {
    console.error('❌ MongoDB connection error:', err.message);
    console.log('⚠️  Starting server without database (limited functionality)...');
    // Start the server even without DB for frontend dev purposes
    app.listen(PORT, () => {
      console.log(`🚀 Server running on http://localhost:${PORT} (no database)`);
    });
  });

module.exports = app;
