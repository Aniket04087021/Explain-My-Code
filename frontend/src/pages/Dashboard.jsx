import { useState, useRef, useEffect, useMemo } from 'react';
import Editor from '@monaco-editor/react';
import { analyzeCode, visualizeExecution } from '../services/api';
import FlowchartView from '../components/FlowchartView';
import ExecutionSimulator from '../components/ExecutionSimulator';
import ExecutionVisualizer from '../components/ExecutionVisualizer';
import RoastResult from '../components/RoastResult';
import GitHubAnalyzer from '../components/GitHubAnalyzer';
import CodeShareButton from '../components/CodeShareButton';
import { useAuth } from '../context/AuthContext';
import {
  Brain, Flame, Bug, Copy, Check, Clock, MemoryStick, HelpCircle,
  Loader2, Code2, Sparkles, LayoutGrid, MessageSquareMore, TerminalSquare,
} from 'lucide-react';

const LANGUAGES = [
  { id: 'javascript', label: 'JavaScript', monacoId: 'javascript' },
  { id: 'python',     label: 'Python',     monacoId: 'python'     },
  { id: 'java',       label: 'Java',       monacoId: 'java'       },
  { id: 'cpp',        label: 'C++',        monacoId: 'cpp'        },
  { id: 'c',          label: 'C',          monacoId: 'c'          },
  { id: 'typescript', label: 'TypeScript', monacoId: 'typescript' },
];

const SAMPLE_CODE = {
  javascript: `function bubbleSort(arr) {
  const n = arr.length;
  for (let i = 0; i < n - 1; i++) {
    for (let j = 0; j < n - i - 1; j++) {
      if (arr[j] > arr[j + 1]) {
        let temp = arr[j];
        arr[j] = arr[j + 1];
        arr[j + 1] = temp;
      }
    }
  }
  return arr;
}
console.log(bubbleSort([64, 34, 25, 12]));`,

  python: `def binary_search(arr, target):
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

arr = [1, 3, 5, 7, 9, 11]
result = binary_search(arr, 7)
print(f"Found at index: {result}")`,

  java: `public class Fibonacci {
    public static int fib(int n) {
        if (n <= 1) return n;
        int prev = 0, curr = 1;
        for (int i = 2; i <= n; i++) {
            int next = prev + curr;
            prev = curr;
            curr = next;
        }
        return curr;
    }
    public static void main(String[] args) {
        System.out.println(fib(10));
    }
}`,

  cpp: `#include <iostream>
#include <vector>
using namespace std;

int factorial(int n) {
    if (n <= 1) return 1;
    return n * factorial(n - 1);
}

int main() {
    for (int i = 1; i <= 5; i++) {
        cout << i << "! = " << factorial(i) << endl;
    }
    return 0;
}`,

  c: `#include <stdio.h>

int gcd(int a, int b) {
    while (b != 0) {
        int temp = b;
        b = a % b;
        a = temp;
    }
    return a;
}

int main() {
    printf("GCD(48, 18) = %d\\n", gcd(48, 18));
    printf("GCD(100, 75) = %d\\n", gcd(100, 75));
    return 0;
}`,

  typescript: `class Stack<T> {
  private items: T[] = [];
  push(item: T): void { this.items.push(item); }
  pop(): T | undefined { return this.items.pop(); }
  peek(): T | undefined { return this.items[this.items.length - 1]; }
  get size(): number { return this.items.length; }
}

const stack = new Stack<number>();
stack.push(1);
stack.push(2);
stack.push(3);
console.log(stack.peek());
console.log(stack.pop());
console.log(stack.size);`,
};

function detectLanguage(code) {
  if (!code) return null;
  const c = code.trim();
  if (c.includes('public class') || c.includes('System.out.println') || c.includes('public static void main')) return 'java';
  if (c.includes('#include')) {
    const looksCpp = c.includes('iostream') || c.includes('cout') || c.includes('vector') || c.includes('std::') || c.includes('using namespace');
    if (looksCpp) return 'cpp';
    return 'c';
  }
  if (c.includes('def ') || (c.includes('import ') && c.includes(':')) || c.includes('print(')) return 'python';
  if (c.includes(': string') || c.includes(': number') || c.includes('interface ') || c.includes('<T>')) return 'typescript';
  return 'javascript';
}

function formatValue(v) {
  if (v === null) return 'null';
  if (v === undefined) return 'undefined';
  if (typeof v === 'object') { try { return JSON.stringify(v); } catch { return String(v); } }
  return String(v);
}

// Suppress internal AST/simulator errors e.g. "Unsupported stmt elif", "Unsupported Python expression: 1, n"
const INTERNAL_SIM_ERR = /^unsupported\s+(stmt|expr|node|op|operator|statement|expression|python\s+expression)/i;

function sanitizeStepError(err) {
  if (!err) return null;
  const msg = typeof err === 'string' ? err : String(err);
  return INTERNAL_SIM_ERR.test(msg.trim()) ? null : msg;
}

// If the majority of backend steps carry internal simulator errors, the backend
// cannot handle this code — signal to fall back to AI tracing.
function stepsAreBroken(steps) {
  if (!Array.isArray(steps) || steps.length === 0) return false;
  const bad = steps.filter(s => INTERNAL_SIM_ERR.test(String(s?.error || '').trim())).length;
  return bad > 0 && bad >= Math.ceil(steps.length / 2);
}

function normalizeVizStep(step = {}, sourceLines = [], index = 0) {
  const line = Number(step.line) || null;
  return {
    ...step,
    line,
    variables: step.variables || step.locals || {},
    stack: Array.isArray(step.stack) ? step.stack : (Array.isArray(step.frames) ? step.frames : []),
    output: step.output ?? step.consoleOutput ?? '',
    explanation: step.explanation || step.description || `Execution step ${index + 1}`,
    code: step.code || step.source || (line ? sourceLines[line - 1] : '') || '',
    error: sanitizeStepError(step.error),
  };
}

function buildDeepExplanation(step, previousStep) {
  if (!step) return 'Run the visualizer to inspect a specific step.';
  const changed = Object.entries(step.variables || {})
    .filter(([k, v]) => JSON.stringify(previousStep?.variables?.[k]) !== JSON.stringify(v))
    .map(([k, v]) => `${k} = ${formatValue(v)}`);
  const stackSummary = Array.isArray(step.stack) && step.stack.length
    ? step.stack.map((frame, index) => {
        const name = typeof frame === 'string' ? frame : frame?.name || frame?.label || `Frame ${index + 1}`;
        return `${index === step.stack.length - 1 ? 'Current frame' : 'Frame'}: ${name}`;
      }).join('\n')
    : 'No stack frames were recorded.';
  return [
    step.explanation || 'This step advances the program state.',
    '',
    `Focus line: ${step.line ? `line ${step.line}` : 'line unavailable'}.`,
    changed.length ? `Variables changed:\n- ${changed.join('\n- ')}` : 'No variables changed.',
    '',
    stackSummary,
    '',
    step.output ? `Console output:\n${step.output}` : 'No console output yet.',
    step.error ? `\nError:\n${step.error}` : '',
  ].filter(Boolean).join('\n');
}

export default function Dashboard() {
  const { user } = useAuth();
  const [code, setCode] = useState(SAMPLE_CODE.javascript);
  const [language, setLanguage] = useState('javascript');
  const [mode, setMode] = useState('explain');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [copiedSection, setCopiedSection] = useState('');
  const [activeTab, setActiveTab] = useState('explanation');
  const [rightMode, setRightMode] = useState('insights');

  // Viz state — still used when backend is available
  const [vizSteps, setVizSteps] = useState([]);
  const [vizIndex, setVizIndex] = useState(0);
  const [vizPlaying, setVizPlaying] = useState(false);
  const [vizSpeed, setVizSpeed] = useState(1);
  const [vizLoading, setVizLoading] = useState(false);
  const [vizError, setVizError] = useState(null);
  const [explanationView, setExplanationView] = useState('step');

  const editorRef = useRef(null);
  const vizDecorationIds = useRef([]);

  const currentLangConfig = LANGUAGES.find(l => l.id === language) || LANGUAGES[0];
  const normalizedVizSteps = useMemo(() => vizSteps.map((s, i) => normalizeVizStep(s, code.split('\n'), i)), [vizSteps, code]);
  const currentVizStep = normalizedVizSteps[vizIndex] || null;
  const previousVizStep = vizIndex > 0 ? normalizedVizSteps[vizIndex - 1] : null;

  useEffect(() => { setExplanationView('step'); }, [vizIndex, rightMode]);

  // Editor line highlighting
  useEffect(() => {
    const editor = editorRef.current;
    if (!editor || rightMode !== 'debugger' || !currentVizStep?.line) {
      if (editor && vizDecorationIds.current.length) {
        vizDecorationIds.current = editor.deltaDecorations(vizDecorationIds.current, []);
      }
      return;
    }
    vizDecorationIds.current = editor.deltaDecorations(vizDecorationIds.current, [{
      range: { startLineNumber: currentVizStep.line, startColumn: 1, endLineNumber: currentVizStep.line, endColumn: 1 },
      options: {
        isWholeLine: true,
        className: currentVizStep.error ? 'monaco-line-error' : 'monaco-line-current',
        glyphMarginClassName: currentVizStep.error ? 'monaco-glyph-error' : 'monaco-glyph-current',
      },
    }]);
    editor.revealLineInCenter(currentVizStep.line);
  }, [currentVizStep, rightMode]);

  const handleCodeChange = (value) => {
    setCode(value || '');
    const detected = detectLanguage(value);
    if (detected && detected !== language) setLanguage(detected);
  };

  const handleLanguageChange = (newLang) => {
    setLanguage(newLang);
    if (!code || code === SAMPLE_CODE[language]) setCode(SAMPLE_CODE[newLang] || '');
  };

  const handleAnalyze = async (analysisMode) => {
    if (!code.trim()) return setError('Please paste some code to analyze');
    setLoading(true);
    setError('');
    setResult(null);
    setMode(analysisMode);
    try {
      const res = await analyzeCode(code, language, analysisMode);
      setResult(res.data);
      setActiveTab('explanation');
      setRightMode('insights');
    } catch (err) {
      setError(err.response?.data?.message || 'Analysis failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Try backend first; fall back to AI mode automatically
  const handleRunVisualization = async () => {
    if (!code.trim()) return setError('Please paste some code to visualize');
    setVizLoading(true);
    setVizError(null);
    setVizPlaying(false);
    setError('');
    try {
      const { data } = await visualizeExecution(code, language);
      const steps = data.executionSteps || [];
      if (stepsAreBroken(steps) || steps.length === 0) {
        setVizSteps(steps);
        setVizError(data.error || 'No execution steps were returned for this code.');
        setRightMode('debugger');
      } else {
        setVizSteps(steps);
        setVizIndex(0);
        setVizSpeed(1);
        setRightMode('debugger');
        if (data.error) setVizError(data.error);
      }
    } catch (err) {
      setVizSteps([]);
      setVizError(err.response?.data?.error || err.response?.data?.message || err.message || 'Visualization backend is unavailable.');
      setRightMode('debugger');
    } finally {
      setVizLoading(false);
    }
  };

  const copyToClipboard = (text, section) => {
    navigator.clipboard.writeText(text);
    setCopiedSection(section);
    setTimeout(() => setCopiedSection(''), 2000);
  };

  const aiPanel = useMemo(() => {
    if (rightMode !== 'debugger') return { title: 'AI Insights', body: result?.explanation || 'Run an explanation or visualization to populate the insights panel.' };
    if (!currentVizStep) return { title: 'Execution Notes', body: 'Run the step visualizer to generate line-by-line reasoning and state updates.' };
    if (explanationView === 'full') return { title: 'Full Code Explanation', body: result?.explanation || 'No full-code explanation yet. Use Explain Code to generate it.' };
    if (explanationView === 'deep') return { title: 'Deeper Step Explanation', body: buildDeepExplanation(currentVizStep, previousVizStep) };
    return { title: 'Step Explanation', body: currentVizStep.explanation || 'No explanation was returned for this step.' };
  }, [rightMode, result, currentVizStep, explanationView, previousVizStep]);

  return (
    <div style={{ minHeight: 'calc(100vh - 64px)', background: 'var(--bg-primary)' }}>
      <div className="container" style={{ padding: '1.5rem', maxWidth: '1600px' }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Sparkles size={24} className="gradient-text" /> Dashboard
            </h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '0.25rem' }}>Welcome back, {user?.name || 'Developer'}</p>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            {LANGUAGES.map(lang => (
              <button key={lang.id} onClick={() => handleLanguageChange(lang.id)}
                className={language === lang.id ? 'btn-primary' : 'btn-secondary'}
                style={{ fontSize: '0.75rem', padding: '0.4rem 0.8rem' }}>
                {lang.label}
              </button>
            ))}
          </div>
        </div>

        {/* Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: rightMode === 'debugger' ? 'minmax(0,1.4fr) minmax(320px,1fr) minmax(320px,1fr)' : 'minmax(0,1fr) minmax(0,1fr)', gap: '1.25rem', alignItems: 'start' }}>

          {/* ── LEFT: Editor ── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', minWidth: 0 }}>
            <div className="card dashboard-editor-shell" style={{ padding: 0, overflow: 'hidden' }}>
              <div style={{ padding: '0.85rem 1rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                  <Code2 size={16} style={{ color: 'var(--accent-primary)' }} />
                  <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>{currentLangConfig.label}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontFamily: "'JetBrains Mono', monospace" }}>{code.split('\n').length} lines</span>
                  {rightMode === 'debugger' && currentVizStep?.line && (
                    <span style={{ padding: '0.28rem 0.55rem', borderRadius: '999px', background: currentVizStep.error ? 'rgba(239,68,68,0.12)' : 'rgba(139,92,246,0.12)', border: currentVizStep.error ? '1px solid rgba(239,68,68,0.24)' : '1px solid rgba(139,92,246,0.24)', fontSize: '0.72rem', color: currentVizStep.error ? 'var(--error)' : 'var(--accent-tertiary)', fontWeight: 600 }}>
                      Active line {currentVizStep.line}
                    </span>
                  )}
                </div>
              </div>
              <div style={{ height: rightMode === 'debugger' ? '78vh' : '520px' }}>
                <Editor
                  height="100%"
                  language={currentLangConfig.monacoId}
                  value={code}
                  onChange={handleCodeChange}
                  onMount={(editor) => { editorRef.current = editor; }}
                  theme="vs-dark"
                  options={{ fontSize: 14, fontFamily: "'JetBrains Mono', 'Fira Code', monospace", minimap: { enabled: false }, glyphMargin: true, scrollBeyondLastLine: false, padding: { top: 18, bottom: 18 }, lineNumbers: 'on', renderLineHighlight: 'none', cursorBlinking: 'smooth', smoothScrolling: true, tabSize: 2, wordWrap: 'on', bracketPairColorization: { enabled: true } }}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,minmax(0,1fr))', gap: '0.75rem' }}>
              <button onClick={() => handleAnalyze('explain')} disabled={loading} className="btn-primary" style={{ padding: '0.9rem', fontSize: '0.85rem', justifyContent: 'center' }}>
                {loading && mode === 'explain' ? <Loader2 size={18} className="animate-spin" /> : <Brain size={18} />} Explain Code
              </button>
              <button onClick={() => handleAnalyze('roast')} disabled={loading} className="btn-danger" style={{ padding: '0.9rem', fontSize: '0.85rem', justifyContent: 'center' }}>
                {loading && mode === 'roast' ? <Loader2 size={18} className="animate-spin" /> : <Flame size={18} />} Roast My Code
              </button>
              <button type="button" onClick={handleRunVisualization} disabled={vizLoading} className="btn-secondary" style={{ padding: '0.9rem', fontSize: '0.85rem', justifyContent: 'center', borderColor: 'var(--success)', color: 'var(--success)' }}>
                {vizLoading ? <Loader2 size={18} className="animate-spin" /> : <Bug size={18} />} Run Visualization
              </button>
            </div>

            <GitHubAnalyzer />
          </div>

          {/* ── MIDDLE: Execution Visualizer ── */}
          {rightMode === 'debugger' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', minWidth: 0 }}>
              <ExecutionVisualizer
                steps={normalizedVizSteps}
                currentStep={vizIndex}
                onCurrentStepChange={setVizIndex}
                isPlaying={vizPlaying}
                onPlayingChange={setVizPlaying}
                speed={vizSpeed}
                onSpeedChange={setVizSpeed}
                loading={vizLoading}
                error={vizError}
                code={code}
                language={language}
              />
            </div>
          )}

          {/* ── RIGHT: Insights / AI narration ── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', minWidth: 0 }}>
            <div style={{ display: 'flex', gap: '0.35rem', background: 'var(--bg-secondary)', padding: '0.3rem', borderRadius: 'var(--radius-md)' }}>
              <button type="button" onClick={() => setRightMode('insights')} className={rightMode === 'insights' ? 'btn-primary' : 'btn-secondary'} style={{ flex: 1, padding: '0.45rem', fontSize: '0.75rem', justifyContent: 'center' }}>
                <LayoutGrid size={14} /> AI Insights
              </button>
              <button type="button" onClick={() => setRightMode('debugger')} className={rightMode === 'debugger' ? 'btn-primary' : 'btn-secondary'} style={{ flex: 1, padding: '0.45rem', fontSize: '0.75rem', justifyContent: 'center' }}>
                <Bug size={14} /> Step Debugger
              </button>
            </div>

            {rightMode === 'debugger' ? (
              <div className="card" style={{ padding: '1.1rem', minHeight: '78vh' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
                  <div>
                    <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)' }}>AI Narration</div>
                    <h3 style={{ fontSize: '1.15rem', fontWeight: 700 }}>{aiPanel.title}</h3>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <button type="button" className={explanationView === 'deep' ? 'btn-primary' : 'btn-secondary'} onClick={() => setExplanationView('deep')} style={{ padding: '0.5rem 0.8rem', fontSize: '0.75rem' }}>
                      <MessageSquareMore size={14} /> Explain this step deeper
                    </button>
                    <button type="button" className={explanationView === 'full' ? 'btn-primary' : 'btn-secondary'} onClick={() => setExplanationView('full')} style={{ padding: '0.5rem 0.8rem', fontSize: '0.75rem' }}>
                      <Brain size={14} /> Explain full code
                    </button>
                  </div>
                </div>

                {currentVizStep?.error && (
                  <div style={{ marginBottom: '1rem', padding: '0.85rem 0.95rem', borderRadius: 'var(--radius-md)', border: '1px solid rgba(239,68,68,0.28)', background: 'rgba(239,68,68,0.08)', color: '#fca5a5', fontSize: '0.82rem' }}>
                    {currentVizStep.error}
                  </div>
                )}

                <div style={{ whiteSpace: 'pre-wrap', lineHeight: 1.75, color: 'var(--text-secondary)', fontSize: '0.92rem' }}>{aiPanel.body}</div>

                <div style={{ marginTop: '1.1rem', display: 'grid', gap: '0.75rem' }}>
                  <div style={{ padding: '0.9rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', background: 'rgba(255,255,255,0.02)' }}>
                    <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: '0.45rem' }}>Current Instruction</div>
                    <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.83rem', color: 'var(--text-primary)', whiteSpace: 'pre-wrap' }}>
                      {currentVizStep?.code || 'No line selected'}
                    </div>
                  </div>
                  <div style={{ padding: '0.9rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', background: 'rgba(255,255,255,0.02)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', marginBottom: '0.45rem' }}>
                      <TerminalSquare size={14} style={{ color: 'var(--success)' }} />
                      <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)' }}>Output Snapshot</div>
                    </div>
                    <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.8rem', color: 'var(--text-secondary)', whiteSpace: 'pre-wrap' }}>
                      {currentVizStep?.output || 'No output yet'}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <>
                {error && (
                  <div style={{ padding: '0.75rem 1rem', borderRadius: 'var(--radius-md)', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#ef4444', fontSize: '0.85rem' }}>
                    {error}
                  </div>
                )}

                {loading && (
                  <div className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '300px', gap: '1rem' }}>
                    <div className="loader" />
                    <p style={{ color: 'var(--text-secondary)' }}>{mode === 'roast' ? 'Roasting your code…' : 'Analyzing your code…'}</p>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>This may take a moment</p>
                  </div>
                )}

                {result && !loading && (
                  <>
                    <div style={{ display: 'flex', gap: '0.25rem', background: 'var(--bg-secondary)', padding: '0.25rem', borderRadius: 'var(--radius-md)', overflowX: 'auto' }}>
                      {[
                        { id: 'explanation', label: 'Explanation',  icon: <Brain size={14} /> },
                        { id: 'complexity',  label: 'Complexity',   icon: <Clock size={14} /> },
                        { id: 'flowchart',   label: 'Flowchart',    icon: <Code2 size={14} /> },
                        { id: 'questions',   label: 'Interview Q',  icon: <HelpCircle size={14} /> },
                        { id: 'execution',   label: 'Simulator',    icon: <Bug size={14} /> },
                      ].map(tab => (
                        <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{ flex: 1, padding: '0.5rem 0.75rem', borderRadius: 'var(--radius-sm)', border: 'none', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.3rem', whiteSpace: 'nowrap', background: activeTab === tab.id ? 'var(--accent-primary)' : 'transparent', color: activeTab === tab.id ? 'white' : 'var(--text-secondary)' }}>
                          {tab.icon} {tab.label}
                        </button>
                      ))}
                    </div>

                    {activeTab === 'explanation' && (
                      <div className="card animate-fade-in">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                          <h3 style={{ fontSize: '1rem', fontWeight: 600 }}>Code Explanation</h3>
                          <button onClick={() => copyToClipboard(result.explanation, 'explanation')} className="btn-icon">
                            {copiedSection === 'explanation' ? <Check size={16} style={{ color: 'var(--success)' }} /> : <Copy size={16} />}
                          </button>
                        </div>
                        <div style={{ fontSize: '0.9rem', lineHeight: 1.7, color: 'var(--text-secondary)', whiteSpace: 'pre-wrap' }}>{result.explanation}</div>
                      </div>
                    )}

                    {activeTab === 'complexity' && (
                      <div className="card animate-fade-in">
                        <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem' }}>Complexity Analysis</h3>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                          <div style={{ padding: '1.25rem', background: 'var(--bg-primary)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}><Clock size={16} style={{ color: 'var(--accent-primary)' }} /><span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Time</span></div>
                            <div style={{ fontSize: '0.9rem', fontWeight: 600 }}>{result.timeComplexity}</div>
                          </div>
                          <div style={{ padding: '1.25rem', background: 'var(--bg-primary)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}><MemoryStick size={16} style={{ color: 'var(--success)' }} /><span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Space</span></div>
                            <div style={{ fontSize: '0.9rem', fontWeight: 600 }}>{result.spaceComplexity}</div>
                          </div>
                        </div>
                        {result.steps?.length > 0 && (
                          <div style={{ marginTop: '1.5rem' }}>
                            <h4 style={{ fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.75rem', color: 'var(--text-secondary)' }}>Logic Steps</h4>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                              {result.steps.map((s, i) => (
                                <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', padding: '0.5rem', borderRadius: 'var(--radius-sm)', background: 'var(--bg-primary)' }}>
                                  <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'var(--accent-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', fontWeight: 600, color: 'white', flexShrink: 0 }}>{i + 1}</div>
                                  <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{s}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {activeTab === 'flowchart' && <div className="animate-fade-in"><FlowchartView chart={result.flowchart} /></div>}

                    {activeTab === 'questions' && (
                      <div className="card animate-fade-in">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                          <h3 style={{ fontSize: '1rem', fontWeight: 600 }}>Interview Questions</h3>
                          <button onClick={() => copyToClipboard((result.interviewQuestions || []).join('\n'), 'questions')} className="btn-icon">
                            {copiedSection === 'questions' ? <Check size={16} style={{ color: 'var(--success)' }} /> : <Copy size={16} />}
                          </button>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                          {(result.interviewQuestions || []).map((q, i) => (
                            <div key={i} style={{ display: 'flex', gap: '0.75rem', padding: '0.75rem', borderRadius: 'var(--radius-sm)', background: 'var(--bg-primary)', border: '1px solid var(--border-color)' }}>
                              <span style={{ fontWeight: 700, color: 'var(--accent-primary)', fontSize: '0.85rem', flexShrink: 0 }}>Q{i + 1}.</span>
                              <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>{q}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {activeTab === 'execution' && (
                      <div className="animate-fade-in">
                        <ExecutionSimulator steps={result.executionSteps || []} sourceCode={code} />
                      </div>
                    )}

                    {result.roastFeedback && <RoastResult feedback={result.roastFeedback} score={result.codeQualityScore} />}
                    {result.shareId && <CodeShareButton shareId={result.shareId} />}
                  </>
                )}

                {!result && !loading && !error && (
                  <div className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '400px', gap: '1rem', textAlign: 'center' }}>
                    <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'rgba(139,92,246,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Code2 size={36} style={{ color: 'var(--accent-primary)' }} />
                    </div>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 600 }}>Ready to Analyze</h3>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', maxWidth: '300px' }}>
                      Paste your code in the editor and click <strong>Explain Code</strong>, <strong>Roast My Code</strong>, or <strong>Run Visualization</strong>
                    </p>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 980px) {
          .container > div:last-child { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}
