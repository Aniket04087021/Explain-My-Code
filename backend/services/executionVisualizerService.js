'use strict';

const { simulateJavaScript } = require('./jsExecutionSimulator');
const { simulatePython } = require('./pythonExecutionSimulator');

function stringifyValue(value) {
  if (value === null) return 'null';
  if (value === undefined) return 'undefined';
  if (typeof value === 'object') {
    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  }
  return String(value);
}

function getLineExplanation(lineText = '', lineNumber = 1, language = 'javascript') {
  const t = String(lineText).trim();
  if (!t) return `Line ${lineNumber}: Blank line`;
  if (t.startsWith('//') || t.startsWith('#') || t.startsWith('/*') || t.startsWith('*')) return `Line ${lineNumber}: Comment`;
  if (t.startsWith('if') || t.startsWith('else') || t.startsWith('switch')) return `Line ${lineNumber}: Evaluate condition`;
  if (t.startsWith('for') || t.startsWith('while') || t.startsWith('do')) return `Line ${lineNumber}: Iterate loop`;
  if (t.startsWith('function') || t.startsWith('def') || t.startsWith('class') || t.startsWith('public class')) return `Line ${lineNumber}: Define declaration`;
  if (t.startsWith('return')) return `Line ${lineNumber}: Return value`;
  if (t.includes('console.log') || t.startsWith('print') || t.includes('System.out.println') || t.includes('cout') || t.includes('printf') || t.includes('puts(')) return `Line ${lineNumber}: Produce output`;
  if (t.includes('=')) return `Line ${lineNumber}: Update program state`;
  return `Line ${lineNumber}: Execute ${language} statement`;
}

function tryParseLiteral(raw) {
  const value = String(raw || '').trim().replace(/[;,]$/, '');
  if (!value) return '';
  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith('\'') && value.endsWith('\''))) {
    return value.slice(1, -1);
  }
  if (/^-?\d+(\.\d+)?$/.test(value)) return Number(value);
  if (value === 'true' || value === 'True') return true;
  if (value === 'false' || value === 'False') return false;
  if (value === 'null' || value === 'None') return null;
  if (value.startsWith('[') || value.startsWith('{')) return value;
  return value;
}

function extractAssignment(line, language) {
  const trimmed = String(line || '').trim();
  if (!trimmed || trimmed.startsWith('//') || trimmed.startsWith('#')) return null;

  if (language === 'python') {
    const match = trimmed.match(/^([A-Za-z_]\w*)\s*=\s*(.+)$/);
    if (match && !match[1].includes('==')) {
      return { name: match[1], value: tryParseLiteral(match[2]) };
    }
    return null;
  }

  const match = trimmed.match(/^(?:const|let|var|int|long|float|double|bool|boolean|char|string|String|auto|final|public|private|protected|static|\s)*\s*([A-Za-z_]\w*)\s*=\s*(.+)$/);
  if (!match) return null;
  return { name: match[1], value: tryParseLiteral(match[2]) };
}

function genericVisualization(code, language, sourceError = null) {
  const lines = String(code || '').split(/\r?\n/);
  const variables = {};
  const stack = [];
  const executionSteps = [];

  lines.forEach((lineText, index) => {
    const lineNumber = index + 1;
    const trimmed = lineText.trim();
    if (!trimmed) return;

    const assignment = extractAssignment(trimmed, language);
    if (assignment) {
      variables[assignment.name] = assignment.value;
    }

    if (/^(function|def|class|public class|class\s+\w+)/.test(trimmed)) {
      const nameMatch = trimmed.match(/(?:function|def|class|public class)\s+([A-Za-z_]\w*)/);
      if (nameMatch) {
        stack.push({
          name: nameMatch[1],
          variables: { ...variables },
        });
      }
    }

    executionSteps.push({
      step: executionSteps.length + 1,
      line: lineNumber,
      code: lineText,
      variables: { ...variables },
      stack: stack.length ? stack.map((frame, frameIndex) => ({
        name: frame.name || `Frame ${frameIndex + 1}`,
        variables: frame.variables || {},
      })) : [{ name: 'Global', variables: { ...variables } }],
      output: '',
      explanation: getLineExplanation(lineText, lineNumber, language),
      ...(sourceError && executionSteps.length === 0 ? { error: sourceError } : {}),
    });
  });

  return {
    executionSteps,
    error: sourceError || null,
    consoleOutput: '',
    language,
    fallback: true,
  };
}

/**
 * Sandboxed, simulated execution. Falls back to a generic timeline for languages
 * or constructs the strict simulators do not yet support.
 */
function runVisualization(code, language) {
  const raw = String(code || '');
  const lang = (language || 'javascript').toLowerCase();

  if (!raw.trim()) {
    return {
      executionSteps: [],
      error: 'Code is required',
      consoleOutput: '',
      language: lang,
    };
  }

  if (lang === 'javascript' || lang === 'typescript') {
    const out = simulateJavaScript(raw);
    if (out.error) {
      return genericVisualization(raw, lang, out.error);
    }
    return { ...out, language: lang };
  }

  if (lang === 'python') {
    const out = simulatePython(raw);
    if (out.error) {
      return genericVisualization(raw, lang, out.error);
    }
    return out;
  }

  return genericVisualization(raw, lang);
}

module.exports = { runVisualization, genericVisualization, getLineExplanation, stringifyValue };
