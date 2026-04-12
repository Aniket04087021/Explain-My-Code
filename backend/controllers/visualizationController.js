'use strict';

const { runVisualization } = require('../services/executionVisualizerService');

const SUPPORTED = ['javascript', 'typescript', 'python', 'java', 'cpp', 'c'];

/**
 * POST /api/visualize-execution
 * Body: { code, language }
 */
async function visualizeExecution(req, res) {
  try {
    const { code, language } = req.body;

    if (!code || !String(code).trim()) {
      return res.status(400).json({ message: 'Code is required' });
    }

    const lang = (language || 'javascript').toLowerCase();
    const result = runVisualization(code, lang);
    if (!SUPPORTED.includes(lang)) {
      result.error = result.error || `Visualization is using a generic fallback for "${lang}".`;
    }
    res.json(result);
  } catch (e) {
    console.error('visualizeExecution:', e);
    res.status(500).json({ message: 'Visualization failed', error: e.message });
  }
}

module.exports = { visualizeExecution };
