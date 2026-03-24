const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { analyzeCode, getHistory, getShared, analyzeGithub } = require('../controllers/analysisController');

/**
 * Analysis Routes
 * POST /api/analyze         - Analyze code (auth required)
 * GET  /api/history         - Get user's analysis history (auth required)
 * GET  /api/share/:shareId  - Get shared analysis (public)
 * POST /api/github-analyze  - Analyze GitHub repo (auth required)
 */

router.post('/analyze', auth, analyzeCode);
router.get('/history', auth, getHistory);
router.get('/share/:shareId', getShared); // Public route, no auth required
router.post('/github-analyze', auth, analyzeGithub);

module.exports = router;
