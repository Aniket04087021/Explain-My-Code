require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const authRoutes = require('./routes/auth');
const analysisRoutes = require('./routes/analysis');
const visualizationRoutes = require('./routes/visualization');
const { DEFAULT_JWT_SECRET } = require('./config/jwt');

const app = express();
const PORT = Number(process.env.PORT) || 5000;
const MAX_PORT_TRIES = 10;
const allowedOrigins = (process.env.ALLOWED_ORIGINS || process.env.FRONTEND_URL || '')
  .split(',')
  .map(origin => origin.trim())
  .filter(Boolean);
const corsOrigins = allowedOrigins.length
  ? allowedOrigins
  : ['http://localhost:5173', 'http://localhost:3000'];

/**
 * Middleware Configuration
 */

// Enable CORS for frontend communication
app.use(cors({
  origin: corsOrigins,
  credentials: true
}));

// Parse JSON request bodies (limit to 5MB for large code blocks)
app.use(express.json({ limit: '5mb' }));

if (!process.env.JWT_SECRET && process.env.NODE_ENV !== 'production') {
  console.warn(`⚠️ JWT_SECRET is not set. Using the built-in dev secret "${DEFAULT_JWT_SECRET}". Set JWT_SECRET for production.`);
}

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
app.use('/api/visualize-execution', apiLimiter);

/**
 * Route Registration
 */
app.use('/api/auth', authRoutes);
app.use('/api', analysisRoutes);
app.use('/api', visualizationRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

/**
 * MongoDB Connection & Server Startup
 */
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/explainmycode';

function startServerWithFallback(basePort, statusSuffix = '') {
  const tryListen = (port, attempts) => {
    const server = app.listen(port, () => {
      console.log(`🚀 Server running on http://localhost:${port}${statusSuffix}`);
    });

    server.on('error', (error) => {
      if (error.code === 'EADDRINUSE' && attempts < MAX_PORT_TRIES) {
        console.warn(`⚠️ Port ${port} is in use. Trying ${port + 1}...`);
        tryListen(port + 1, attempts + 1);
        return;
      }

      console.error(`❌ Server failed to start on port ${port}:`, error.message);
      process.exit(1);
    });
  };

  tryListen(basePort, 0);
}

mongoose.connect(MONGODB_URI)
  .then(() => {
    console.log('✅ Connected to MongoDB');
    startServerWithFallback(PORT);
  })
  .catch(err => {
    console.error('❌ MongoDB connection error:', err.message);
    console.log('⚠️  Starting server without database (limited functionality)...');
    // Start the server even without DB for frontend dev purposes
    startServerWithFallback(PORT, ' (no database)');
  });

module.exports = app;
