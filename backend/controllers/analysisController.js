const { v4: uuidv4 } = require('uuid');
const mongoose = require('mongoose');
const Analysis = require('../models/Analysis');
const { analyzeWithOllama } = require('../services/ollamaService');
const { fetchRepoData, generateMockGitHubAnalysis } = require('../services/githubService');

/**
 * Analysis Controller
 * Handles code analysis, history retrieval, sharing, and GitHub analysis.
 */

/**
 * POST /api/analyze
 * Analyzes submitted code using the AI model (Ollama).
 * Supports both 'explain' and 'roast' modes.
 */
const analyzeCode = async (req, res) => {
  try {
    const { code, language, mode } = req.body;

    if (!code || !code.trim()) {
      return res.status(400).json({ message: 'Code is required' });
    }

    const validLanguages = ['javascript', 'python', 'java', 'cpp', 'c', 'typescript'];
    const lang = (language || 'javascript').toLowerCase();
    if (!validLanguages.includes(lang)) {
      return res.status(400).json({ message: `Unsupported language. Use: ${validLanguages.join(', ')}` });
    }

    const analysisMode = mode === 'roast' ? 'roast' : 'explain';

    // Send code to Ollama for analysis (or use mock fallback)
    const result = await analyzeWithOllama(code, lang, analysisMode);

    // Generate a unique share ID for this analysis
    const shareId = uuidv4().slice(0, 8);
    const responsePayload = {
      id: null,
      shareId,
      ...result
    };

    // Save analysis when DB is connected; otherwise return analysis directly.
    if (mongoose.connection.readyState === 1) {
      const analysis = new Analysis({
        userId: req.user.userId,
        code,
        language: lang,
        mode: analysisMode,
        ...result,
        shareId
      });
      await analysis.save();
      responsePayload.id = analysis._id;
    } else {
      console.warn('Skipping analysis save: MongoDB is not connected');
    }

    res.json(responsePayload);
  } catch (error) {
    console.error('Analysis error:', error);
    res.status(500).json({ message: 'Error analyzing code. Please try again.' });
  }
};

/**
 * GET /api/history
 * Returns the current user's analysis history, sorted by most recent.
 */
const getHistory = async (req, res) => {
  try {
    const analyses = await Analysis.find({ userId: req.user.userId })
      .sort({ createdAt: -1 })
      .limit(50)
      .select('-__v');

    res.json(analyses);
  } catch (error) {
    console.error('History error:', error);
    res.status(500).json({ message: 'Error fetching history' });
  }
};

/**
 * GET /api/share/:shareId
 * Returns a publicly shared analysis by its unique share ID.
 */
const getShared = async (req, res) => {
  try {
    const analysis = await Analysis.findOne({ shareId: req.params.shareId })
      .select('-userId -__v');

    if (!analysis) {
      return res.status(404).json({ message: 'Shared analysis not found' });
    }

    res.json(analysis);
  } catch (error) {
    console.error('Share error:', error);
    res.status(500).json({ message: 'Error fetching shared analysis' });
  }
};

/**
 * POST /api/github-analyze
 * Analyzes a GitHub repository by fetching its data and running AI analysis.
 */
const analyzeGithub = async (req, res) => {
  try {
    const { repoUrl } = req.body;

    if (!repoUrl) {
      return res.status(400).json({ message: 'Repository URL is required' });
    }

    // Fetch repository data from GitHub API
    const repoData = await fetchRepoData(repoUrl);

    // Generate analysis (mock for now, AI-powered when Ollama available)
    const analysis = generateMockGitHubAnalysis(repoData);

    res.json({
      ...analysis,
      repoData: {
        name: repoData.name,
        description: repoData.description,
        stars: repoData.stars,
        forks: repoData.forks,
        mainLanguage: repoData.mainLanguage,
        fileCount: repoData.fileTree.length
      }
    });
  } catch (error) {
    console.error('GitHub analysis error:', error);
    res.status(500).json({ message: error.message || 'Error analyzing repository' });
  }
};

module.exports = { analyzeCode, getHistory, getShared, analyzeGithub };
