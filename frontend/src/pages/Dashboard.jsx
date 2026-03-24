import { useState, useCallback, useRef } from 'react';
import Editor from '@monaco-editor/react';
import { analyzeCode } from '../services/api';
import FlowchartView from '../components/FlowchartView';
import ExecutionSimulator from '../components/ExecutionSimulator';
import RoastResult from '../components/RoastResult';
import GitHubAnalyzer from '../components/GitHubAnalyzer';
import CodeShareButton from '../components/CodeShareButton';
import { useAuth } from '../context/AuthContext';
import {
  Brain, Flame, Play, Copy, Check, Clock, MemoryStick,
  HelpCircle, Loader2, Code2,  Sparkles
} from 'lucide-react';

/**
 * Dashboard Page
 * Main application interface with Monaco Editor, language selector,
 * analysis mode toggle, and results panels.
 */

// Language configurations for Monaco Editor
const LANGUAGES = [
  { id: 'javascript', label: 'JavaScript', monacoId: 'javascript' },
  { id: 'python', label: 'Python', monacoId: 'python' },
  { id: 'java', label: 'Java', monacoId: 'java' },
  { id: 'cpp', label: 'C++', monacoId: 'cpp' },
  { id: 'typescript', label: 'TypeScript', monacoId: 'typescript' },
];

// Sample code for each language
const SAMPLE_CODE = {
  javascript: `// Bubble Sort Implementation
function bubbleSort(arr) {
  const n = arr.length;
  for (let i = 0; i < n - 1; i++) {
    for (let j = 0; j < n - i - 1; j++) {
      if (arr[j] > arr[j + 1]) {
        [arr[j], arr[j + 1]] = [arr[j + 1], arr[j]];
      }
    }
  }
  return arr;
}

console.log(bubbleSort([64, 34, 25, 12, 22, 11, 90]));`,
  python: `# Binary Search Implementation
def binary_search(arr, target):
    left, right = 0, len(arr) - 1

    while left <= right:
        mid = (left + right) // 2
        if arr[mid] == target:
            return mid
        elif arr[mid] < target:
            left = mid + 1
        else:
            right = mid - 1

    return -1

result = binary_search([1, 3, 5, 7, 9, 11], 7)
print(f"Found at index: {result}")`,
  java: `// Fibonacci with Dynamic Programming
public class Fibonacci {
    public static int fib(int n) {
        if (n <= 1) return n;
        int[] dp = new int[n + 1];
        dp[0] = 0;
        dp[1] = 1;
        for (int i = 2; i <= n; i++) {
            dp[i] = dp[i-1] + dp[i-2];
        }
        return dp[n];
    }

    public static void main(String[] args) {
        System.out.println(fib(10));
    }
}`,
  cpp: `// Two Sum using Hash Map
#include <iostream>
#include <vector>
#include <unordered_map>
using namespace std;

vector<int> twoSum(vector<int>& nums, int target) {
    unordered_map<int, int> seen;
    for (int i = 0; i < nums.size(); i++) {
        int complement = target - nums[i];
        if (seen.count(complement)) {
            return {seen[complement], i};
        }
        seen[nums[i]] = i;
    }
    return {};
}`,
  typescript: `// Generic Stack Implementation
class Stack<T> {
  private items: T[] = [];

  push(item: T): void {
    this.items.push(item);
  }

  pop(): T | undefined {
    return this.items.pop();
  }

  peek(): T | undefined {
    return this.items[this.items.length - 1];
  }

  isEmpty(): boolean {
    return this.items.length === 0;
  }

  size(): number {
    return this.items.length;
  }
}

const stack = new Stack<number>();
stack.push(1);
stack.push(2);
console.log(stack.peek()); // 2`,
};

/**
 * Attempts to auto-detect the language from the code content.
 */
function detectLanguage(code) {
  if (!code) return null;
  const c = code.trim();
  if (c.includes('public class') || c.includes('System.out.println') || c.includes('public static void main')) return 'java';
  if (c.includes('#include') || c.includes('std::') || c.includes('cout') || c.includes('vector<')) return 'cpp';
  if (c.includes('def ') || c.includes('import ') && c.includes(':') || c.includes('print(')) return 'python';
  if (c.includes(': string') || c.includes(': number') || c.includes('interface ') || c.includes('<T>')) return 'typescript';
  return 'javascript';
}

export default function Dashboard() {
  const { user } = useAuth();
  const [code, setCode] = useState(SAMPLE_CODE.javascript);
  const [language, setLanguage] = useState('javascript');
  const [mode, setMode] = useState('explain'); // 'explain' or 'roast'
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [copiedSection, setCopiedSection] = useState('');
  const [activeTab, setActiveTab] = useState('explanation');
  const [highlightLine, setHighlightLine] = useState(null);
  const editorRef = useRef(null);

  // Handle editor mount
  const handleEditorDidMount = (editor) => {
    editorRef.current = editor;
  };

  // Handle code change with auto-detection
  const handleCodeChange = (value) => {
    setCode(value || '');
    const detected = detectLanguage(value);
    if (detected && detected !== language) {
      setLanguage(detected);
    }
  };

  // Handle language change
  const handleLanguageChange = (newLang) => {
    setLanguage(newLang);
    if (!code || code === SAMPLE_CODE[language]) {
      setCode(SAMPLE_CODE[newLang] || '');
    }
  };

  // Highlight a line in the editor (for execution simulator)
  const handleHighlightLine = useCallback((line) => {
    setHighlightLine(line);
    if (editorRef.current && line) {
      editorRef.current.revealLineInCenter(line);
      editorRef.current.deltaDecorations(
        editorRef.current.getModel().getAllDecorations().filter(d => d.options.className === 'highlight-line').map(d => d.id),
        [{
          range: { startLineNumber: line, startColumn: 1, endLineNumber: line, endColumn: 1 },
          options: {
            isWholeLine: true,
            className: 'highlight-line',
            glyphMarginClassName: 'highlight-glyph',
          }
        }]
      );
    }
  }, []);

  // Submit code for analysis
  const handleAnalyze = async (analysisMode) => {
    if (!code.trim()) {
      setError('Please paste some code to analyze');
      return;
    }

    setLoading(true);
    setError('');
    setResult(null);
    setMode(analysisMode);

    try {
      const res = await analyzeCode(code, language, analysisMode);
      setResult(res.data);
      setActiveTab('explanation');
    } catch (err) {
      setError(err.response?.data?.message || 'Analysis failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Copy text to clipboard
  const copyToClipboard = (text, section) => {
    navigator.clipboard.writeText(text);
    setCopiedSection(section);
    setTimeout(() => setCopiedSection(''), 2000);
  };

  const currentLangConfig = LANGUAGES.find(l => l.id === language) || LANGUAGES[0];

  return (
    <div style={{ minHeight: 'calc(100vh - 64px)', background: 'var(--bg-primary)' }}>
      <div className="container" style={{ padding: '1.5rem', maxWidth: '1400px' }}>
        {/* Header Bar */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '1.5rem',
          flexWrap: 'wrap',
          gap: '1rem',
        }}>
          <div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Sparkles size={24} className="gradient-text" /> Dashboard
            </h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '0.25rem' }}>
              Welcome back, {user?.name || 'Developer'}
            </p>
          </div>

          {/* Language Selector */}
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            {LANGUAGES.map(lang => (
              <button
                key={lang.id}
                onClick={() => handleLanguageChange(lang.id)}
                className={language === lang.id ? 'btn-primary' : 'btn-secondary'}
                style={{ fontSize: '0.75rem', padding: '0.4rem 0.8rem' }}
              >
                {lang.label}
              </button>
            ))}
          </div>
        </div>

        {/* Main Layout: Editor + Results */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)',
          gap: '1.5rem',
          minHeight: '600px',
        }}>
          {/* Left: Editor Panel */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {/* Editor Card */}
            <div className="card" style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '0', overflow: 'hidden' }}>
              <div style={{
                padding: '0.75rem 1rem',
                borderBottom: '1px solid var(--border-color)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Code2 size={16} style={{ color: 'var(--accent-primary)' }} />
                  <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>{currentLangConfig.label}</span>
                </div>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                  {code.split('\n').length} lines
                </span>
              </div>

              <div style={{ flex: 1, minHeight: '400px' }}>
                <Editor
                  height="100%"
                  language={currentLangConfig.monacoId}
                  value={code}
                  onChange={handleCodeChange}
                  onMount={handleEditorDidMount}
                  theme="vs-dark"
                  options={{
                    fontSize: 14,
                    fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                    minimap: { enabled: false },
                    scrollBeyondLastLine: false,
                    padding: { top: 16, bottom: 16 },
                    lineNumbers: 'on',
                    renderLineHighlight: 'line',
                    cursorBlinking: 'smooth',
                    smoothScrolling: true,
                    tabSize: 2,
                    wordWrap: 'on',
                    bracketPairColorization: { enabled: true },
                  }}
                />
              </div>
            </div>

            {/* Action Buttons */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '0.75rem',
            }}>
              <button
                onClick={() => handleAnalyze('explain')}
                disabled={loading}
                className="btn-primary"
                style={{
                  padding: '0.9rem',
                  fontSize: '0.85rem',
                  justifyContent: 'center',
                  background: mode === 'explain' && loading ? undefined : 'linear-gradient(135deg, #8b5cf6, #6366f1)',
                }}
              >
                {loading && mode === 'explain' ? <Loader2 size={18} className="animate-spin" /> : <Brain size={18} />}
                Explain Code
              </button>

              <button
                onClick={() => handleAnalyze('roast')}
                disabled={loading}
                className="btn-danger"
                style={{
                  padding: '0.9rem',
                  fontSize: '0.85rem',
                  justifyContent: 'center',
                }}
              >
                {loading && mode === 'roast' ? <Loader2 size={18} className="animate-spin" /> : <Flame size={18} />}
                Roast My Code
              </button>

              <button
                onClick={() => { handleAnalyze('explain'); setActiveTab('execution'); }}
                disabled={loading}
                className="btn-secondary"
                style={{
                  padding: '0.9rem',
                  fontSize: '0.85rem',
                  justifyContent: 'center',
                  borderColor: 'var(--success)',
                  color: 'var(--success)',
                }}
              >
                <Play size={18} /> Run Visualization
              </button>
            </div>

            {/* GitHub Analyzer */}
            <GitHubAnalyzer />
          </div>

          {/* Right: Results Panel */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {/* Error Display */}
            {error && (
              <div style={{
                padding: '0.75rem 1rem',
                borderRadius: 'var(--radius-md)',
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.2)',
                color: '#ef4444',
                fontSize: '0.85rem',
              }}>
                {error}
              </div>
            )}

            {/* Loading State */}
            {loading && (
              <div className="card" style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: '300px',
                gap: '1rem',
              }}>
                <div className="loader" />
                <p style={{ color: 'var(--text-secondary)' }}>
                  {mode === 'roast' ? '🔥 Roasting your code...' : '🧠 Analyzing your code...'}
                </p>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                  This may take a moment
                </p>
              </div>
            )}

            {/* Results */}
            {result && !loading && (
              <>
                {/* Tab Navigation */}
                <div style={{
                  display: 'flex',
                  gap: '0.25rem',
                  background: 'var(--bg-secondary)',
                  padding: '0.25rem',
                  borderRadius: 'var(--radius-md)',
                  overflowX: 'auto',
                }}>
                  {[
                    { id: 'explanation', label: 'Explanation', icon: <Brain size={14} /> },
                    { id: 'complexity', label: 'Complexity', icon: <Clock size={14} /> },
                    { id: 'flowchart', label: 'Flowchart', icon: <Code2 size={14} /> },
                    { id: 'questions', label: 'Interview Q', icon: <HelpCircle size={14} /> },
                    { id: 'execution', label: 'Simulator', icon: <Play size={14} /> },
                  ].map(tab => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      style={{
                        flex: 1,
                        padding: '0.5rem 0.75rem',
                        borderRadius: 'var(--radius-sm)',
                        border: 'none',
                        cursor: 'pointer',
                        fontSize: '0.75rem',
                        fontWeight: 500,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.3rem',
                        whiteSpace: 'nowrap',
                        background: activeTab === tab.id ? 'var(--accent-primary)' : 'transparent',
                        color: activeTab === tab.id ? 'white' : 'var(--text-secondary)',
                        transition: 'all 0.2s ease',
                      }}
                    >
                      {tab.icon} {tab.label}
                    </button>
                  ))}
                </div>

                {/* Explanation Tab */}
                {activeTab === 'explanation' && (
                  <div className="card animate-fade-in">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                      <h3 style={{ fontSize: '1rem', fontWeight: 600 }}>📝 Code Explanation</h3>
                      <button
                        onClick={() => copyToClipboard(result.explanation, 'explanation')}
                        className="btn-icon"
                        title="Copy explanation"
                      >
                        {copiedSection === 'explanation' ? <Check size={16} style={{ color: 'var(--success)' }} /> : <Copy size={16} />}
                      </button>
                    </div>
                    <div style={{
                      fontSize: '0.9rem',
                      lineHeight: 1.7,
                      color: 'var(--text-secondary)',
                      whiteSpace: 'pre-wrap',
                    }}>
                      {result.explanation}
                    </div>
                  </div>
                )}

                {/* Complexity Tab */}
                {activeTab === 'complexity' && (
                  <div className="card animate-fade-in">
                    <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem' }}>⚡ Complexity Analysis</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                      <div style={{
                        padding: '1.25rem',
                        background: 'var(--bg-primary)',
                        borderRadius: 'var(--radius-md)',
                        border: '1px solid var(--border-color)',
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                          <Clock size={16} style={{ color: 'var(--accent-primary)' }} />
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Time Complexity</span>
                        </div>
                        <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                          {result.timeComplexity}
                        </div>
                      </div>
                      <div style={{
                        padding: '1.25rem',
                        background: 'var(--bg-primary)',
                        borderRadius: 'var(--radius-md)',
                        border: '1px solid var(--border-color)',
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                          <MemoryStick size={16} style={{ color: 'var(--success)' }} />
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Space Complexity</span>
                        </div>
                        <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                          {result.spaceComplexity}
                        </div>
                      </div>
                    </div>

                    {/* Steps */}
                    {result.steps && result.steps.length > 0 && (
                      <div style={{ marginTop: '1.5rem' }}>
                        <h4 style={{ fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.75rem', color: 'var(--text-secondary)' }}>Logic Steps</h4>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                          {result.steps.map((step, i) => (
                            <div key={i} style={{
                              display: 'flex',
                              alignItems: 'flex-start',
                              gap: '0.75rem',
                              padding: '0.5rem',
                              borderRadius: 'var(--radius-sm)',
                              background: 'var(--bg-primary)',
                            }}>
                              <div style={{
                                width: 24,
                                height: 24,
                                borderRadius: '50%',
                                background: 'var(--accent-primary)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '0.7rem',
                                fontWeight: 600,
                                color: 'white',
                                flexShrink: 0,
                              }}>
                                {i + 1}
                              </div>
                              <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{step}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Flowchart Tab */}
                {activeTab === 'flowchart' && (
                  <div className="animate-fade-in">
                    <FlowchartView chart={result.flowchart} />
                  </div>
                )}

                {/* Interview Questions Tab */}
                {activeTab === 'questions' && (
                  <div className="card animate-fade-in">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                      <h3 style={{ fontSize: '1rem', fontWeight: 600 }}>🎯 Interview Questions</h3>
                      <button
                        onClick={() => copyToClipboard(result.interviewQuestions.join('\n'), 'questions')}
                        className="btn-icon"
                      >
                        {copiedSection === 'questions' ? <Check size={16} style={{ color: 'var(--success)' }} /> : <Copy size={16} />}
                      </button>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                      {(result.interviewQuestions || []).map((q, i) => (
                        <div key={i} style={{
                          display: 'flex',
                          gap: '0.75rem',
                          padding: '0.75rem',
                          borderRadius: 'var(--radius-sm)',
                          background: 'var(--bg-primary)',
                          border: '1px solid var(--border-color)',
                        }}>
                          <span style={{
                            fontWeight: 700,
                            color: 'var(--accent-primary)',
                            fontSize: '0.85rem',
                            flexShrink: 0,
                          }}>
                            Q{i + 1}.
                          </span>
                          <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>{q}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Execution Simulator Tab */}
                {activeTab === 'execution' && (
                  <div className="animate-fade-in">
                    <ExecutionSimulator
                      steps={result.executionSteps || []}
                      onHighlightLine={handleHighlightLine}
                    />
                  </div>
                )}

                {/* Roast Mode Results (always shown when in roast mode) */}
                {result.roastFeedback && (
                  <RoastResult feedback={result.roastFeedback} score={result.codeQualityScore} />
                )}

                {/* Share Button */}
                {result.shareId && (
                  <CodeShareButton shareId={result.shareId} />
                )}
              </>
            )}

            {/* Empty State */}
            {!result && !loading && !error && (
              <div className="card" style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: '400px',
                gap: '1rem',
                textAlign: 'center',
              }}>
                <div style={{
                  width: 80,
                  height: 80,
                  borderRadius: '50%',
                  background: 'rgba(139, 92, 246, 0.1)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  <Code2 size={36} style={{ color: 'var(--accent-primary)' }} />
                </div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 600 }}>Ready to Analyze</h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', maxWidth: '300px' }}>
                  Paste your code in the editor and click <strong>Explain Code</strong> or <strong>Roast My Code</strong> to get started
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Editor highlight line CSS */}
      <style>{`
        .highlight-line {
          background: rgba(139, 92, 246, 0.15) !important;
          border-left: 3px solid var(--accent-primary) !important;
        }
        @media (max-width: 900px) {
          .container > div:last-child {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}
