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

function stripTypeScriptNoise(line = '') {
  let out = String(line);
  out = out
    .replace(/\b(private|public|protected|readonly|abstract)\s+/g, '')
    .replace(/:\s*[^=;,)]+(?=\s*[:=;,){}])/g, '')
    .replace(/<[^<>]*>/g, '');
  return out;
}

function splitTopLevelCommaSegments(text = '') {
  const segments = [];
  let current = '';
  let depth = 0;
  let quote = null;

  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    if (quote) {
      current += ch;
      if (ch === quote && text[i - 1] !== '\\') quote = null;
      continue;
    }
    if (ch === '"' || ch === '\'') {
      quote = ch;
      current += ch;
      continue;
    }
    if (ch === '(' || ch === '[' || ch === '{' || ch === '<') depth += 1;
    if (ch === ')' || ch === ']' || ch === '}' || ch === '>') depth = Math.max(0, depth - 1);
    if (ch === ',' && depth === 0) {
      if (current.trim()) segments.push(current.trim());
      current = '';
      continue;
    }
    current += ch;
  }

  if (current.trim()) segments.push(current.trim());
  return segments;
}

function findStandaloneAssignmentIndex(text = '') {
  const s = String(text);
  let depth = 0;
  let quote = null;

  for (let i = 0; i < s.length; i += 1) {
    const ch = s[i];
    if (quote) {
      if (ch === quote && s[i - 1] !== '\\') quote = null;
      continue;
    }
    if (ch === '"' || ch === '\'') {
      quote = ch;
      continue;
    }
    if (ch === '(' || ch === '[' || ch === '{' || ch === '<') depth += 1;
    if (ch === ')' || ch === ']' || ch === '}' || ch === '>') depth = Math.max(0, depth - 1);
    if (ch !== '=' || depth > 0) continue;

    const prev = s[i - 1] || '';
    const next = s[i + 1] || '';
    const prev2 = s[i - 2] || '';
    if (prev === '=' || prev === '!' || prev === '<' || prev === '>') continue;
    if (next === '=' || next === '>') continue;
    if (prev === '=' && prev2 === '=') continue;
    return i;
  }

  return -1;
}

function splitDeclarationAssignments(line = '', language = 'javascript') {
  let clean = String(line).trim().replace(/[;{}]+$/, '');
  if (!clean) return [];
  if (language === 'typescript') {
    clean = stripTypeScriptNoise(clean);
  }

  if (/^(if|else|for|while|switch|case|return|break|continue|do|try|catch|finally|package|import|#include|using\s+namespace)\b/i.test(clean)) {
    return [];
  }

  clean = clean
    .replace(/^(?:const|let|var|int|long|float|double|bool|boolean|char|string|String|auto|final|public|private|protected|static|readonly|abstract|mutable|unsigned|signed|short|volatile|constexpr)\b\s*/g, '')
    .trim();

  const assignmentIndex = findStandaloneAssignmentIndex(clean);
  if (assignmentIndex === -1) return [];

  const segments = splitTopLevelCommaSegments(clean);
  const assignments = [];
  for (const segment of segments) {
    const eqIndex = findStandaloneAssignmentIndex(segment);
    if (eqIndex === -1) continue;
    const name = segment.slice(0, eqIndex).trim().replace(/[<>\[\]\s].*$/, '').replace(/[<>\[\]]/g, '').trim();
    const value = segment.slice(eqIndex + 1).trim();
    if (name) assignments.push({ name, value: tryParseLiteral(value) });
  }
  return assignments;
}

function getLineExplanation(lineText = '', lineNumber = 1, language = 'javascript') {
  const t = String(lineText).trim();
  const lang = String(language || '').toLowerCase();
  if (!t) return `Line ${lineNumber}: Blank line`;
  if (t.startsWith('//') || t.startsWith('#') || t.startsWith('/*') || t.startsWith('*')) return `Line ${lineNumber}: Comment`;
  if (t.startsWith('package ') || t.startsWith('import ') || t.startsWith('#include') || t.startsWith('using namespace')) {
    return `Line ${lineNumber}: Resolve dependencies`;
  }
  if (t.startsWith('if') || t.startsWith('else') || t.startsWith('switch')) return `Line ${lineNumber}: Evaluate condition`;
  if (t.startsWith('for') || t.startsWith('while') || t.startsWith('do')) return `Line ${lineNumber}: Iterate loop`;
  if (
    /^(?:public|private|protected|static|final|inline|virtual|constexpr|\s)*[\w:<>,\[\]\*&\s]+?\s+[A-Za-z_]\w*\s*\([^)]*\)\s*\{?\s*$/.test(t) ||
    /^(?:constructor|get\s+[A-Za-z_]\w+|set\s+[A-Za-z_]\w+)\s*\([^)]*\)\s*\{?\s*$/.test(t) ||
    /^(?:function|def)\s+[A-Za-z_]\w*\s*\(/.test(t) ||
    /^(?:public\s+)?class\s+[A-Za-z_]\w*/.test(t)
  ) {
    return `Line ${lineNumber}: Define ${lang === 'java' ? 'class or method' : 'declaration'}`;
  }
  if (
    t.startsWith('function') ||
    t.startsWith('def') ||
    t.startsWith('class') ||
    t.startsWith('public class') ||
    t.includes(' class ') ||
    t.includes(' constructor(') ||
    t.includes('): ') ||
    t.includes('):') ||
    t.includes('void main(')
  ) {
    return `Line ${lineNumber}: Define ${lang === 'java' ? 'class or method' : 'declaration'}`;
  }
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
  let trimmed = String(line || '').trim();
  if (!trimmed || trimmed.startsWith('//') || trimmed.startsWith('#')) return null;

  if (language === 'typescript') {
    trimmed = stripTypeScriptNoise(trimmed);
  }

  if (language === 'python') {
    const match = trimmed.match(/^([A-Za-z_]\w*)\s*=\s*(.+)$/);
    if (match && !match[1].includes('==')) {
      return { name: match[1], value: tryParseLiteral(match[2]) };
    }
    return null;
  }

  const assignments = splitDeclarationAssignments(trimmed, language);
  return assignments.length ? assignments[0] : null;
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

    const assignments = language === 'python'
      ? (extractAssignment(trimmed, language) ? [extractAssignment(trimmed, language)] : [])
      : splitDeclarationAssignments(trimmed, language);
    assignments.forEach((assignment) => {
      if (assignment?.name) {
        variables[assignment.name] = assignment.value;
      }
    });
    if (language === 'python') {
      const assignment = extractAssignment(trimmed, language);
      if (assignment?.name) variables[assignment.name] = assignment.value;
    }

    const classMatch = trimmed.match(/^(?:public\s+)?class\s+([A-Za-z_]\w*)/);
    const functionMatch = trimmed.match(/^(?:public|private|protected|static|final|inline|virtual|constexpr|\s)*[\w:<>,\[\]\*&\s]+?\s+([A-Za-z_]\w*)\s*\([^)]*\)\s*\{/);
    const methodMatch = trimmed.match(/^(?:public|private|protected|static|final|readonly|abstract|\s)*([A-Za-z_]\w*)\s*\([^)]*\)\s*(?::\s*[\w<>\[\]\|?]+)?\s*\{/);
    const tsMethodMatch = !functionMatch && !classMatch && trimmed.match(/^(?:constructor|[A-Za-z_]\w*)\s*\([^)]*\)\s*(?::\s*[\w<>\[\]\|?]+)?\s*\{/);
    if (classMatch || functionMatch || methodMatch || tsMethodMatch) {
      const nameMatch = classMatch || functionMatch || methodMatch || tsMethodMatch;
      if (nameMatch) {
        stack.push({
          name: classMatch ? `Class ${nameMatch[1]}` : nameMatch[1],
          variables: { ...variables },
        });
      }
    }

    executionSteps.push({
      step: executionSteps.length + 1,
      line: lineNumber,
      code: lineText,
      text: lineText,
      description: getLineExplanation(lineText, lineNumber, language),
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

  if (lang === 'typescript') {
    return genericVisualization(raw, lang);
  }

  if (lang === 'javascript') {
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
