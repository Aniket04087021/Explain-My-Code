'use strict';

const { simulateJavaScript } = require('./jsExecutionSimulator');
const { simulatePython } = require('./pythonExecutionSimulator');

/**
 * Sandboxed, simulated execution — never runs user code with eval/new Function/subprocess.
 */
function runVisualization(code, language) {
  const raw = String(code || '');
  const lang = (language || 'javascript').toLowerCase();

  if (!raw.trim()) {
    return {
      executionSteps: [],
      error: 'Code is required',
      consoleOutput: '',
      language: lang
    };
  }

  if (lang === 'javascript' || lang === 'typescript') {
    const out = simulateJavaScript(raw);
    return { ...out, language: lang };
  }

  if (lang === 'python') {
    return simulatePython(raw);
  }

  return {
    executionSteps: [],
    error: `Step-through visualization supports JavaScript, TypeScript, and Python only (got "${lang}").`,
    consoleOutput: '',
    language: lang
  };
}

module.exports = { runVisualization };
