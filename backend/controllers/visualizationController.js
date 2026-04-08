'use strict';

const { runVisualization } = require('../services/executionVisualizerService');

const SUPPORTED = ['javascript', 'typescript', 'python'];

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
    if (!SUPPORTED.includes(lang)) {
      return res.status(400).json({
        message: `Unsupported language for visualization. Use: ${SUPPORTED.join(', ')}`
      });
    }

    const result = runVisualization(code, lang);
    res.json(result);
  } catch (e) {
    console.error('visualizeExecution:', e);
    res.status(500).json({ message: 'Visualization failed', error: e.message });
  }
}

module.exports = { visualizeExecution };
