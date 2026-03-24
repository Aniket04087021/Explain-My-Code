const axios = require('axios');

/**
 * Ollama AI Service
 * Handles communication with the Ollama local API for code analysis.
 * Falls back to mock data if Ollama is unavailable (for demo/development).
 */

const OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'llama3';

/**
 * Builds a structured prompt for code explanation mode.
 * Requires the AI to respond with valid JSON for consistent parsing.
 */
function buildExplainPrompt(code, language) {
  return `You are an expert code analyzer. Analyze the following ${language} code and respond ONLY with a valid JSON object (no markdown, no code fences, no extra text).

CODE:
\`\`\`${language}
${code}
\`\`\`

Respond with this exact JSON structure:
{
  "explanation": "A clear, plain English explanation of what this code does (2-4 paragraphs)",
  "timeComplexity": "Big O time complexity with brief explanation (e.g., O(n) - Linear time because...)",
  "spaceComplexity": "Big O space complexity with brief explanation (e.g., O(1) - Constant space because...)",
  "steps": ["Step 1: description", "Step 2: description", "Step 3: description"],
  "flowchart": "flowchart TD\\n    Start([Start]) --> Step1[First step description]\\n    Step1 --> Step2[Second step description]\\n    Step2 --> End([End])",
  "interviewQuestions": ["Question 1 about this code?", "Question 2?", "Question 3?", "Question 4?", "Question 5?"],
  "codeQualityScore": 7,
  "executionSteps": [
    {"step": 1, "description": "What happens first", "line": 1},
    {"step": 2, "description": "What happens next", "line": 2}
  ]
}

IMPORTANT:
- The flowchart MUST be valid Mermaid.js syntax using flowchart TD direction
- Generate at least 5 interview questions relevant to concepts in this code
- codeQualityScore must be a number from 1 to 10
- executionSteps should trace through the code execution with line numbers
- Use proper line breaks in flowchart (\\n between lines)`;
}

/**
 * Builds a structured prompt for roast mode.
 * Produces humorous but constructive feedback.
 */
function buildRoastPrompt(code, language) {
  return `You are a brutally honest but funny senior developer doing a code review. Analyze the following ${language} code and ROAST it with humor while being constructive. Respond ONLY with a valid JSON object (no markdown, no code fences, no extra text).

CODE:
\`\`\`${language}
${code}
\`\`\`

Respond with this exact JSON structure:
{
  "explanation": "A brief explanation of what this code attempts to do",
  "timeComplexity": "Big O time complexity analysis",
  "spaceComplexity": "Big O space complexity analysis",
  "steps": ["Step 1: description", "Step 2: description"],
  "flowchart": "flowchart TD\\n    Start([Start]) --> Step1[First step]\\n    Step1 --> End([End])",
  "interviewQuestions": ["Question 1?", "Question 2?", "Question 3?"],
  "roastFeedback": "🔥 Roast Mode Activated!\\n\\nOverall impression (humorous but constructive paragraph)\\n\\n**Issues Detected:**\\n- Issue 1 with sarcastic comment\\n- Issue 2 with funny observation\\n- Issue 3 with constructive suggestion\\n- Issue 4 with developer humor\\n\\n**Verdict:** A humorous summary sentence",
  "codeQualityScore": 5,
  "executionSteps": [
    {"step": 1, "description": "Description", "line": 1},
    {"step": 2, "description": "Description", "line": 2}
  ]
}

IMPORTANT:
- roastFeedback should be funny, sarcastic, but ultimately helpful
- Think of it as a senior dev reviewing a junior's PR after a long day
- Include specific issues found in the code with humorous commentary
- codeQualityScore should be honest (1-10)
- The flowchart MUST be valid Mermaid.js syntax`;
}

/**
 * Sends a prompt to the Ollama API and parses the JSON response.
 * @param {string} code - The source code to analyze
 * @param {string} language - The programming language
 * @param {string} mode - 'explain' or 'roast'
 * @returns {Object} Parsed analysis result
 */
async function analyzeWithOllama(code, language, mode = 'explain') {
  const prompt = mode === 'roast'
    ? buildRoastPrompt(code, language)
    : buildExplainPrompt(code, language);

  try {
    const response = await axios.post(`${OLLAMA_URL}/api/generate`, {
      model: OLLAMA_MODEL,
      prompt: prompt,
      stream: false,
      options: {
        temperature: mode === 'roast' ? 0.8 : 0.3,
        num_predict: 4096
      }
    }, {
      timeout: 120000 // 2 minute timeout for large code blocks
    });

    const text = response.data.response;

    // Try to extract JSON from the response
    let parsed;
    try {
      // First try direct parse
      parsed = JSON.parse(text);
    } catch {
      // Try to extract JSON from the response text (AI sometimes wraps it)
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('Could not parse AI response as JSON');
      }
    }

    return {
      explanation: parsed.explanation || '',
      timeComplexity: parsed.timeComplexity || '',
      spaceComplexity: parsed.spaceComplexity || '',
      steps: parsed.steps || [],
      flowchart: parsed.flowchart || '',
      interviewQuestions: parsed.interviewQuestions || [],
      roastFeedback: parsed.roastFeedback || '',
      codeQualityScore: Number(parsed.codeQualityScore) || 5,
      executionSteps: parsed.executionSteps || []
    };
  } catch (error) {
    console.error('Ollama API error:', error.message);
    // Fallback to mock data if Ollama is unavailable
    return generateMockAnalysis(code, language, mode);
  }
}

/**
 * Generates mock analysis data for demo/development.
 * Used when Ollama is not running or returns an error.
 */
function generateMockAnalysis(code, language, mode) {
  const lines = code.split('\n').filter(l => l.trim());
  const lineCount = lines.length;

  // Create dynamic mock data based on the actual code
  const steps = [];
  const executionSteps = [];
  let stepNum = 1;

  // Analyze basic code structure for steps
  for (let i = 0; i < Math.min(lines.length, 8); i++) {
    const line = lines[i].trim();
    if (line.startsWith('function') || line.startsWith('def') || line.startsWith('class') || line.includes('=>')) {
      steps.push(`Step ${stepNum}: Define function/class declaration`);
      executionSteps.push({ step: stepNum, description: `Define: ${line.substring(0, 50)}`, line: i + 1 });
      stepNum++;
    } else if (line.startsWith('for') || line.startsWith('while')) {
      steps.push(`Step ${stepNum}: Enter loop iteration`);
      executionSteps.push({ step: stepNum, description: `Loop: ${line.substring(0, 50)}`, line: i + 1 });
      stepNum++;
    } else if (line.startsWith('if') || line.startsWith('else')) {
      steps.push(`Step ${stepNum}: Evaluate conditional branch`);
      executionSteps.push({ step: stepNum, description: `Condition: ${line.substring(0, 50)}`, line: i + 1 });
      stepNum++;
    } else if (line.startsWith('return') || line.startsWith('print') || line.includes('console.log')) {
      steps.push(`Step ${stepNum}: Output or return result`);
      executionSteps.push({ step: stepNum, description: `Output: ${line.substring(0, 50)}`, line: i + 1 });
      stepNum++;
    } else if (line.includes('=') && !line.startsWith('//') && !line.startsWith('#')) {
      steps.push(`Step ${stepNum}: Initialize/assign variable`);
      executionSteps.push({ step: stepNum, description: `Assign: ${line.substring(0, 50)}`, line: i + 1 });
      stepNum++;
    }
  }

  if (steps.length === 0) {
    steps.push('Step 1: Begin code execution');
    steps.push('Step 2: Process main logic');
    steps.push('Step 3: Return result');
    executionSteps.push({ step: 1, description: 'Begin execution', line: 1 });
    executionSteps.push({ step: 2, description: 'Process main logic', line: Math.ceil(lineCount / 2) });
    executionSteps.push({ step: 3, description: 'Return result', line: lineCount });
  }

  // Build a flowchart from the steps
  let flowchart = 'flowchart TD\n    Start([Start])';
  steps.forEach((s, i) => {
    const id = `S${i + 1}`;
    const label = s.replace(`Step ${i + 1}: `, '');
    const prevId = i === 0 ? 'Start' : `S${i}`;
    flowchart += `\n    ${prevId} --> ${id}["${label}"]`;
  });
  flowchart += `\n    S${steps.length} --> End([End])`;

  const complexity = lineCount < 10 ? 'O(1)' : lineCount < 30 ? 'O(n)' : 'O(n²)';

  const baseResult = {
    explanation: `This ${language} code consists of ${lineCount} lines. It defines a program that processes data through a series of operations. The code follows standard ${language} conventions and implements a structured approach to solving the given problem. The main logic involves variable initialization, data processing through iteration or conditionals, and returning a computed result.`,
    timeComplexity: `${complexity} — Based on the code structure with ${lineCount} lines, the dominant operation determines the overall time complexity.`,
    spaceComplexity: 'O(n) — The space used grows proportionally with the input data structure sizes.',
    steps,
    flowchart,
    interviewQuestions: [
      `What is the time complexity of this ${language} code and how could it be optimized?`,
      'Explain the main algorithm used in this code and its trade-offs.',
      'How would you handle edge cases such as empty input or invalid data?',
      'What design patterns could improve the maintainability of this code?',
      'How would you write unit tests for the core functionality?'
    ],
    roastFeedback: '',
    codeQualityScore: Math.min(8, Math.max(3, Math.round(6 + Math.random() * 2))),
    executionSteps
  };

  if (mode === 'roast') {
    baseResult.roastFeedback = `🔥 **Roast Mode Activated!**\n\nOh, where do I even begin? This code looks like it was written during a caffeine-fueled hackathon at 3 AM — and not the good kind of hackathon.\n\n**Issues Detected:**\n- Variable names that even the original author won't understand next week\n- Error handling? Never heard of her 💅\n- This code has more room for optimization than my apartment has for furniture\n- Comments are as rare as a bug-free production deployment\n- The logic flow is more tangled than my earphones after being in a pocket\n\n**Verdict:** It works... technically. Like a car with three wheels — it'll get you there, but everyone will stare. Score: ${baseResult.codeQualityScore}/10`;
    baseResult.codeQualityScore = Math.min(6, Math.max(2, Math.round(3 + Math.random() * 3)));
  }

  return baseResult;
}

module.exports = { analyzeWithOllama };
