import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import {
  AlertCircle, TerminalSquare, ScanLine, Activity, Binary, Sparkles,
  Layers3, Play, Pause, SkipBack, SkipForward, RotateCcw, Gauge, Orbit,
  ChevronsLeft, ChevronsRight, Cpu, MemoryStick, ListOrdered,
} from 'lucide-react';

/* ─────────────────────────────────────────
   Helpers
───────────────────────────────────────── */
function fmtVal(v) {
  if (v === null) return 'null';
  if (v === undefined) return 'undefined';
  if (typeof v === 'string') {
    const t = v.trim().replace(/^"+|"+$/g, '');
    if (
      (t.startsWith('[Function:') && t.endsWith(']')) ||
      (t.startsWith('[Native:') && t.endsWith(']')) ||
      t === '[Function]'
    ) return t;
    return `"${v}"`;
  }
  if (typeof v === 'object') {
    try { return JSON.stringify(v, null, 2); } catch { return String(v); }
  }
  return String(v);
}

function isToken(v) {
  if (typeof v !== 'string') return false;
  const t = v.trim().replace(/^"+|"+$/g, '');
  return (
    (t.startsWith('[Function:') && t.endsWith(']')) ||
    (t.startsWith('[Native:') && t.endsWith(']')) ||
    t === '[Function]'
  );
}

// Matches internal simulator/AST errors that should never be shown to users
const INTERNAL_ERROR_RE = /^unsupported\s+(stmt|expr|node|op|operator|statement|expression|python\s+expression)/i;

function sanitizeError(err) {
  if (!err) return null;
  const msg = typeof err === 'string' ? err : String(err);
  // Suppress low-level AST walker errors (e.g. "Unsupported stmt elif")
  if (INTERNAL_ERROR_RE.test(msg.trim())) return null;
  return msg;
}

function normalizeStep(step = {}, idx = 0) {
  return {
    ...step,
    line: Number(step.line) || null,
    variables: step.variables || step.locals || {},
    stack: Array.isArray(step.stack)
      ? step.stack
      : Array.isArray(step.frames) ? step.frames : [],
    output: step.output ?? step.consoleOutput ?? '',
    explanation: step.explanation || step.description || step.text || step.summary || `Step ${idx + 1}`,
    code: step.code || step.source || step.text || '',
    error: sanitizeError(step.error),
  };
}

/* ─────────────────────────────────────────
   AI Trace builder
───────────────────────────────────────── */
async function buildTrace(code, language) {
  const langLabels = {
    javascript: 'JavaScript', typescript: 'TypeScript',
    python: 'Python', java: 'Java', cpp: 'C++', c: 'C',
  };
  const label = langLabels[language] || language;

  // Extra guidance for Python to prevent elif/else being flagged as errors
  const pythonNote = language === 'python'
    ? `\n• Python-specific: treat "if", "elif", and "else" as separate traceable steps. Each branch evaluation (even skipped branches) is its own step with the correct line number. Never set "error" for control-flow keywords like elif/else.`
    : '';

  const prompt = `You are a code execution tracer. Analyze the following ${label} code and produce a step-by-step execution trace.

Return ONLY valid JSON (no markdown fences, no prose) in exactly this shape:
{
  "steps": [
    {
      "line": <1-based line number as integer>,
      "explanation": "<clear 1-2 sentence description of what happens at this step>",
      "code": "<the exact source line being executed>",
      "variables": { "<n>": <current value — primitives only; arrays/objects as JSON> },
      "stack": [{ "name": "<function name>", "variables": { "<n>": <value> } }],
      "output": "<cumulative stdout/console output up to this step, empty string if none>",
      "error": null
    }
  ]
}

Rules:
• Include EVERY meaningful step: assignments, loop iterations, conditionals (if/elif/else), calls, returns, prints.
• "variables" must include ALL in-scope variables at that moment, not just the changed one.
• "stack" is an ordered array bottom→top; last element is the currently executing frame.
• "output" is cumulative — append each print/console.log to everything printed before it.
• Only set "error" to a non-null string for actual runtime errors (e.g. ZeroDivisionError, TypeError). For all other steps "error" must be null.
• Never set "error" for language syntax or control-flow constructs (if, elif, else, for, while, etc.).
• Aim for 8–35 steps. For tight loops cap at ~25 iterations to keep output manageable.
• Do NOT wrap the JSON in markdown code fences.${pythonNote}

Code (${label}):
\`\`\`
${code}
\`\`\``;

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4000,
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => '');
    throw new Error(`API ${res.status}: ${txt.slice(0, 120)}`);
  }

  const data = await res.json();
  const raw = data.content?.find(b => b.type === 'text')?.text ?? '';

  // Strip accidental markdown fences
  const cleaned = raw.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
  let parsed;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    // Last-ditch: find first { … }
    const m = cleaned.match(/(\{[\s\S]*\})/);
    if (m) parsed = JSON.parse(m[1]);
    else throw new Error('Could not parse AI response as JSON.');
  }

  if (!Array.isArray(parsed?.steps) || parsed.steps.length === 0) {
    throw new Error('AI returned no execution steps.');
  }

  // Sanitize any internal AST/simulator errors that may have leaked in
  return parsed.steps.map(s => ({ ...s, error: sanitizeError(s.error) }));
}

function MemoryPanel({ variables = {}, previousVariables = {} }) {
  const entries = Object.entries(variables);
  return (
    <div className="card" style={{ padding: '1rem', minHeight: 0 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.85rem' }}>
        <div>
          <div style={{ fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)' }}>Memory State</div>
          <div style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)' }}>Variables</div>
        </div>
        <Binary size={17} style={{ color: 'var(--accent-primary)' }} />
      </div>

      {entries.length === 0 ? (
        <div style={{ border: '1px dashed var(--border-color)', borderRadius: 'var(--radius-md)', padding: '1rem', color: 'var(--text-muted)', fontSize: '0.82rem', textAlign: 'center' }}>
          No variables captured for this step.
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '0.65rem' }}>
          {entries.map(([key, value]) => {
            const prev = previousVariables?.[key];
            const changed = JSON.stringify(prev) !== JSON.stringify(value);
            return (
              <div key={key} style={{
                position: 'relative', padding: '0.8rem', borderRadius: 'var(--radius-md)',
                border: changed ? '1px solid rgba(34,197,94,0.35)' : '1px solid var(--border-color)',
                background: changed ? 'rgba(34,197,94,0.07)' : 'rgba(255,255,255,0.02)',
                overflow: 'hidden', transition: 'border-color 0.2s',
              }}>
                {changed && (
                  <span style={{ position: 'absolute', top: '0.55rem', right: '0.55rem', display: 'inline-flex', alignItems: 'center', gap: '0.2rem', color: 'var(--success)', fontSize: '0.65rem', fontWeight: 600 }}>
                    <Sparkles size={11} /> changed
                  </span>
                )}
                <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontFamily: "'JetBrains Mono', monospace", marginBottom: '0.35rem' }}>{key}</div>
                {isToken(value) ? (
                  <div style={{ padding: '0.3rem 0.5rem', borderRadius: '8px', background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.18)', fontSize: '0.73rem', color: 'var(--text-primary)', fontFamily: "'JetBrains Mono', monospace", whiteSpace: 'nowrap', overflowX: 'auto', scrollbarWidth: 'thin' }} title={fmtVal(value)}>{fmtVal(value)}</div>
                ) : (
                  <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontSize: '0.82rem', lineHeight: 1.5, color: 'var(--text-primary)', fontFamily: "'JetBrains Mono', monospace" }}>{fmtVal(value)}</pre>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function StackPanel({ stack = [] }) {
  const frames = Array.isArray(stack) ? stack : [];
  const activeIdx = frames.length - 1;

  const getName = (f, i) => typeof f === 'string' ? f : f?.name || f?.label || f?.scope || `Frame ${i + 1}`;
  const getVars = (f) => (!f || typeof f === 'string') ? {} : f.variables || f.locals || f.state || {};

  return (
    <div className="card" style={{ padding: '1rem', minHeight: 0 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.85rem' }}>
        <div>
          <div style={{ fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)' }}>Runtime Stack</div>
          <div style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)' }}>Call Stack</div>
        </div>
        <Layers3 size={17} style={{ color: 'var(--accent-tertiary)' }} />
      </div>

      {frames.length === 0 ? (
        <div style={{ border: '1px dashed var(--border-color)', borderRadius: 'var(--radius-md)', padding: '1rem', color: 'var(--text-muted)', fontSize: '0.82rem', textAlign: 'center' }}>No stack frames recorded.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
          {frames.map((frame, i) => {
            const vars = Object.entries(getVars(frame));
            const isActive = i === activeIdx;
            return (
              <div key={`${getName(frame, i)}-${i}`} style={{
                borderRadius: 'var(--radius-md)',
                border: isActive ? '1px solid rgba(139,92,246,0.4)' : '1px solid var(--border-color)',
                background: isActive ? 'rgba(139,92,246,0.1)' : 'rgba(255,255,255,0.02)',
                padding: '0.8rem',
                boxShadow: isActive ? '0 6px 24px rgba(99,102,241,0.14)' : 'none',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: vars.length ? '0.55rem' : 0 }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>{getName(frame, i)}</span>
                  <span style={{ fontSize: '0.63rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: isActive ? 'var(--accent-tertiary)' : 'var(--text-muted)' }}>{isActive ? 'Current' : 'Frame'}</span>
                </div>
                {vars.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                    {vars.map(([n, v]) => (
                      <div key={n} style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: '0.5rem', fontSize: '0.75rem', fontFamily: "'JetBrains Mono', monospace" }}>
                        <span style={{ color: 'var(--text-secondary)' }}>{n}</span>
                        <span style={{ color: 'var(--text-primary)', textAlign: 'right', wordBreak: 'break-word', overflowWrap: 'anywhere' }}>{fmtVal(v)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────
   Timeline dots strip
───────────────────────────────────────── */
function TimelineStrip({ steps, currentStep, onSeek }) {
  const dotRef = useRef(null);
  const maxDots = 40;
  const stride = Math.ceil(steps.length / maxDots);
  const dots = [];
  for (let i = 0; i < steps.length; i += stride) dots.push(i);

  useEffect(() => {
    const el = dotRef.current?.querySelector('[data-active]');
    el?.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' });
  }, [currentStep]);

  return (
    <div ref={dotRef} style={{ display: 'flex', gap: '3px', padding: '6px 10px', overflowX: 'auto', background: 'var(--bg-secondary)', borderTop: '1px solid var(--border-color)', scrollbarWidth: 'thin', minHeight: '42px', alignItems: 'center' }}>
      {dots.map((i) => {
        const isActive = i === currentStep || (i < currentStep && dots[dots.indexOf(i) + 1] > currentStep && i !== dots[dots.indexOf(i) + 1]);
        const isDone = i < currentStep;
        const hasErr = steps[i]?.error;
        return (
          <button
            key={i}
            data-active={isActive ? true : undefined}
            onClick={() => onSeek(i)}
            title={`Step ${i + 1}`}
            style={{
              width: 26, height: 26, borderRadius: '50%', flexShrink: 0, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '9px', fontWeight: 700, fontFamily: "'JetBrains Mono', monospace",
              border: isActive ? '2px solid var(--accent-primary)' : hasErr ? '1.5px solid rgba(239,68,68,0.4)' : '1.5px solid var(--border-color)',
              background: isActive
                ? 'var(--accent-primary)'
                : isDone ? 'rgba(34,197,94,0.15)'
                : hasErr ? 'rgba(239,68,68,0.12)' : 'var(--bg-tertiary)',
              color: isActive ? '#fff' : isDone ? 'var(--success)' : hasErr ? 'var(--error)' : 'var(--text-muted)',
              transform: isActive ? 'scale(1.2)' : 'scale(1)',
              transition: 'all 0.15s',
            }}
          >
            {isActive ? '▶' : isDone ? '✓' : i + 1}
          </button>
        );
      })}
    </div>
  );
}

/* ─────────────────────────────────────────
   Step Controls bar
───────────────────────────────────────── */
const SPEED_OPTIONS = [
  { label: '0.5×', value: 0.5 },
  { label: '1×', value: 1 },
  { label: '2×', value: 2 },
  { label: '4×', value: 4 },
];

function StepControls({ currentStep, totalSteps, isPlaying, speed, onRun, onPause, onPrevious, onNext, onReplay, onFirst, onLast, onStepChange, onSpeedChange, disabled }) {
  const max = Math.max(totalSteps - 1, 0);
  const btnStyle = { padding: '0.35rem 0.55rem', fontSize: '0.7rem' };
  return (
    <div className="card" style={{ padding: '0.85rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.75rem' }}>
        <div>
          <div style={{ fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)' }}>Timeline Control</div>
          <div style={{ fontSize: '0.92rem', fontWeight: 700, color: 'var(--text-primary)' }}>
            Step {totalSteps ? currentStep + 1 : 0} / {totalSteps}
          </div>
        </div>
        <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <button type="button" className="btn-secondary" style={btnStyle} onClick={onFirst} disabled={disabled || totalSteps === 0 || currentStep === 0}><ChevronsLeft size={14} /></button>
          <button type="button" className="btn-secondary" style={btnStyle} onClick={onPrevious} disabled={disabled || totalSteps === 0}><SkipBack size={14} /></button>
          {isPlaying
            ? <button type="button" className="btn-secondary" style={{ ...btnStyle, padding: '0.35rem 0.75rem' }} onClick={onPause} disabled={disabled}><Pause size={14} /> Pause</button>
            : <button type="button" className="btn-primary" style={{ ...btnStyle, padding: '0.35rem 0.75rem' }} onClick={onRun} disabled={disabled || totalSteps === 0}><Play size={14} /> Play</button>
          }
          <button type="button" className="btn-secondary" style={btnStyle} onClick={onNext} disabled={disabled || totalSteps === 0}><SkipForward size={14} /></button>
          <button type="button" className="btn-secondary" style={btnStyle} onClick={onLast} disabled={disabled || totalSteps === 0 || currentStep === totalSteps - 1}><ChevronsRight size={14} /></button>
          <button type="button" className="btn-secondary" style={btnStyle} onClick={onReplay} disabled={disabled || totalSteps === 0}><RotateCcw size={13} /></button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) auto', gap: '0.75rem', alignItems: 'center' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}><Orbit size={12} /> Execution scrubber</span>
            <span>{totalSteps ? `${currentStep + 1} of ${totalSteps}` : '—'}</span>
          </div>
          <input type="range" min={0} max={max} value={Math.min(currentStep, max)}
            onChange={(e) => onStepChange(Number(e.target.value))}
            disabled={disabled || totalSteps === 0}
            style={{ width: '100%', accentColor: 'var(--accent-primary)' }} />
        </div>
        <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <Gauge size={13} style={{ color: 'var(--text-secondary)' }} />
          <select className="input" value={speed} onChange={(e) => onSpeedChange(Number(e.target.value))} disabled={disabled} style={{ width: 'auto', minWidth: '70px', padding: '0.35rem 0.5rem', fontSize: '0.7rem' }}>
            {SPEED_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </label>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────
   Visualization tabs
───────────────────────────────────────── */
const VIZ_TABS = [
  { id: 'state', label: 'State', Icon: Cpu },
  { id: 'memory', label: 'Memory', Icon: MemoryStick },
  { id: 'stack', label: 'Call Stack', Icon: Layers3 },
  { id: 'output', label: 'Output', Icon: TerminalSquare },
];

/* ─────────────────────────────────────────
   Main ExecutionVisualizer
───────────────────────────────────────── */
export default function ExecutionVisualizer({
  // Legacy prop path: pre-fetched steps from backend
  steps: propSteps = [],
  currentStep = 0,
  onCurrentStepChange,
  isPlaying = false,
  onPlayingChange,
  speed = 1,
  onSpeedChange,
  loading: propLoading = false,
  error: propError = null,
  // New AI path — pass these to bypass the backend entirely
  code = '',
  language = 'javascript',
}) {
  const timerRef = useRef(null);

  // AI-mode state
  const [aiSteps, setAiSteps] = useState([]);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState(null);
  const [aiIdx, setAiIdx] = useState(0);
  const [aiPlaying, setAiPlaying] = useState(false);
  const [aiSpeed, setAiSpeed] = useState(1);
  const [vizTab, setVizTab] = useState('state');

  // Browser-side AI tracing was brittle and depended on an external API key.
  // We keep the backend timeline path as the source of truth.
  const isAI = false;

  // Resolve which steps/index/play-state to use
  const rawSteps = isAI ? aiSteps : propSteps;
  const stepIdx = isAI ? aiIdx : currentStep;
  const setStepIdx = isAI ? setAiIdx : onCurrentStepChange;
  const playState = isAI ? aiPlaying : isPlaying;
  const setPlayState = isAI ? setAiPlaying : onPlayingChange;
  const playSpeed = isAI ? aiSpeed : speed;
  const setPlaySpeed = isAI ? setAiSpeed : onSpeedChange;
  const loading = isAI ? aiLoading : propLoading;
  const error = isAI ? aiError : propError;

  const normalizedSteps = useMemo(
    () => rawSteps.map((s, i) => normalizeStep(s, i)),
    [rawSteps]
  );
  const total = normalizedSteps.length;
  const safeIdx = total ? Math.min(Math.max(0, stepIdx), total - 1) : 0;
  const step = total ? normalizedSteps[safeIdx] : null;
  const prevStep = safeIdx > 0 ? normalizedSteps[safeIdx - 1] : null;
  const intervalMs = Math.max(200, 1000 / (playSpeed || 1));

  /* Playback timer */
  useEffect(() => {
    if (!playState || total === 0) {
      clearInterval(timerRef.current);
      timerRef.current = null;
      return;
    }
    timerRef.current = setInterval(() => {
      setStepIdx(i => {
        const next = (typeof i === 'function' ? i(safeIdx) : i);
        if (next >= total - 1) { setPlayState(false); return total - 1; }
        return next + 1;
      });
    }, intervalMs);
    return () => clearInterval(timerRef.current);
  }, [playState, total, intervalMs]); // eslint-disable-line

  /* AI fetch */
  const runAI = useCallback(async () => {
    if (!code?.trim()) return;
    setAiLoading(true);
    setAiError(null);
    setAiSteps([]);
    setAiIdx(0);
    setAiPlaying(false);
    try {
      const raw = await buildTrace(code, language);
      setAiSteps(raw);
    } catch (e) {
      setAiError(e.message || 'Visualization failed.');
    } finally {
      setAiLoading(false);
    }
  }, [code, language]);

  /* Controls */
  const handleRun = () => {
    if (!total) return;
    setStepIdx(i => (typeof i === 'number' && i >= total - 1 ? 0 : (typeof i === 'function' ? 0 : i)));
    setPlayState(true);
  };
  const handlePause = () => setPlayState(false);
  const handlePrev = () => { setPlayState(false); setStepIdx(i => Math.max(0, (typeof i === 'number' ? i : safeIdx) - 1)); };
  const handleNext = () => { setPlayState(false); setStepIdx(i => Math.min(total - 1, (typeof i === 'number' ? i : safeIdx) + 1)); };
  const handleFirst = () => { setPlayState(false); setStepIdx(0); };
  const handleLast = () => { setPlayState(false); setStepIdx(total - 1); };
  const handleReplay = () => { setStepIdx(0); setPlayState(true); };
  const handleSeek = (i) => { setPlayState(false); setStepIdx(Number(i)); };

  /* ── Loading ── */
  if (loading) {
    return (
      <div className="card" style={{ minHeight: '320px', display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', flexDirection: 'column', gap: '0.9rem' }}>
        <div className="loader" style={{ margin: '0 auto' }} />
        <div style={{ fontSize: '0.92rem', fontWeight: 600, color: 'var(--text-primary)' }}>Building execution timeline</div>
        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Tracing state transitions step by step…</div>
      </div>
    );
  }

  /* ── Error (no steps) ── */
  if (error && !total) {
    return (
      <div className="card" style={{ minHeight: '200px', display: 'flex', alignItems: 'center', gap: '0.9rem', borderColor: 'rgba(239,68,68,0.35)', background: 'rgba(239,68,68,0.06)' }}>
        <AlertCircle size={22} style={{ color: 'var(--error)', flexShrink: 0 }} />
        <div>
          <div style={{ fontSize: '0.92rem', fontWeight: 700, color: 'var(--error)', marginBottom: '0.3rem' }}>Visualization failed</div>
          <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>{error}</div>
        </div>
      </div>
    );
  }

  /* ── Empty (AI mode: show Run button) ── */
  if (!total) {
    return (
      <div className="card" style={{ minHeight: '320px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', gap: '1rem' }}>
        <ScanLine size={38} style={{ color: 'var(--accent-primary)' }} />
        <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)' }}>No execution data yet</div>
        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
          {isAI
            ? 'Click below to auto-trace your code with AI — works for Python, Java, JS, C++, C.'
            : 'Run visualization to inspect variables, stack frames, and console output step by step.'}
        </div>
        {isAI && code?.trim() && (
          <button type="button" className="btn-primary" style={{ marginTop: '0.5rem', padding: '0.65rem 1.4rem' }} onClick={runAI}>
            <Play size={16} /> Run AI Visualization
          </button>
        )}
      </div>
    );
  }

  /* ── Main view ── */
  const progress = total > 1 ? (safeIdx / (total - 1)) * 100 : 100;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', minHeight: 0 }}>

      {/* Re-run button (AI mode) */}
      {isAI && (
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button type="button" className="btn-secondary" style={{ fontSize: '0.72rem', padding: '0.35rem 0.8rem' }} onClick={runAI}>
            <RotateCcw size={12} /> Re-trace
          </button>
        </div>
      )}

      {/* Progress bar */}
      <div style={{ height: '3px', background: 'var(--bg-tertiary)', borderRadius: '2px', overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${progress}%`, background: 'linear-gradient(90deg, var(--gradient-start), var(--gradient-end))', borderRadius: '2px', transition: 'width 0.25s ease' }} />
      </div>

      {/* Controls */}
      <StepControls
        currentStep={safeIdx} totalSteps={total}
        isPlaying={playState} speed={playSpeed}
        onRun={handleRun} onPause={handlePause}
        onPrevious={handlePrev} onNext={handleNext}
        onFirst={handleFirst} onLast={handleLast}
        onReplay={handleReplay} onStepChange={handleSeek}
        onSpeedChange={setPlaySpeed} disabled={loading}
      />

      {/* Error banner (with steps present) */}
      {error && (
        <div style={{ padding: '0.75rem 1rem', borderRadius: 'var(--radius-md)', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', color: '#fca5a5', fontSize: '0.8rem' }}>
          {error}
        </div>
      )}

      {/* Current line card */}
      <div className="card" style={{ padding: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '0.85rem' }}>
          <div>
            <div style={{ fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)' }}>Executing Line</div>
            <div style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)' }}>{step.line ? `Line ${step.line}` : 'Line unavailable'}</div>
          </div>
          <span style={{ padding: '0.38rem 0.65rem', borderRadius: '999px', border: step.error ? '1px solid rgba(239,68,68,0.3)' : '1px solid rgba(139,92,246,0.25)', background: step.error ? 'rgba(239,68,68,0.08)' : 'rgba(139,92,246,0.08)', fontSize: '0.7rem', color: step.error ? 'var(--error)' : 'var(--accent-tertiary)', fontWeight: 600 }}>
            {step.error ? 'Error state' : 'Live state'}
          </span>
        </div>

        {step.explanation && (
          <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.65, marginBottom: '0.75rem' }}>
            {step.explanation}
          </div>
        )}

        <div style={{ padding: '0.8rem 0.95rem', borderRadius: 'var(--radius-md)', border: step.error ? '1px solid rgba(239,68,68,0.3)' : '1px solid rgba(99,102,241,0.2)', background: step.error ? 'rgba(239,68,68,0.07)' : 'rgba(99,102,241,0.07)', fontFamily: "'JetBrains Mono', monospace", fontSize: '0.82rem', color: 'var(--text-primary)', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
          {step.code || step.source || '— source line unavailable —'}
        </div>

        {step.error && (
          <div style={{ marginTop: '0.7rem', padding: '0.75rem', borderRadius: 'var(--radius-md)', background: 'rgba(239,68,68,0.09)', border: '1px solid rgba(239,68,68,0.25)', color: '#fca5a5', fontSize: '0.8rem', lineHeight: 1.5 }}>
            {step.error}
          </div>
        )}
      </div>

      {/* Tab row */}
      <div style={{ display: 'flex', gap: '0.25rem', background: 'var(--bg-secondary)', padding: '0.25rem', borderRadius: 'var(--radius-md)', overflowX: 'auto' }}>
        {VIZ_TABS.map(({ id, label, Icon }) => (
          <button key={id} type="button" onClick={() => setVizTab(id)} style={{ flex: 1, padding: '0.4rem 0.5rem', borderRadius: 'var(--radius-sm)', border: 'none', cursor: 'pointer', fontSize: '0.72rem', fontWeight: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.3rem', whiteSpace: 'nowrap', background: vizTab === id ? 'var(--accent-primary)' : 'transparent', color: vizTab === id ? 'white' : 'var(--text-secondary)', transition: 'all 0.15s' }}>
            <Icon size={13} /> {label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {vizTab === 'state' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
          <MemoryPanel variables={step.variables} previousVariables={prevStep?.variables || {}} />
          <StackPanel stack={step.stack} />
        </div>
      )}
      {vizTab === 'memory' && <MemoryPanel variables={step.variables} previousVariables={prevStep?.variables || {}} />}
      {vizTab === 'stack' && <StackPanel stack={step.stack} />}
      {vizTab === 'output' && (
        <div className="card" style={{ padding: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
              <TerminalSquare size={16} style={{ color: 'var(--success)' }} />
              <span style={{ fontSize: '0.92rem', fontWeight: 700, color: 'var(--text-primary)' }}>Console Output</span>
            </div>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.7rem', color: 'var(--text-muted)' }}><Activity size={12} /> step stream</span>
          </div>
          <pre style={{ margin: 0, minHeight: '88px', maxHeight: '200px', overflow: 'auto', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', background: 'rgba(255,255,255,0.02)', padding: '0.85rem', fontSize: '0.78rem', lineHeight: 1.6, color: 'var(--text-secondary)', fontFamily: "'JetBrains Mono', monospace", whiteSpace: 'pre-wrap' }}>
            {step.output || 'No console output at this step.'}
          </pre>
        </div>
      )}

      {/* Timeline dot strip */}
      <TimelineStrip steps={normalizedSteps} currentStep={safeIdx} onSeek={handleSeek} />

    </div>
  );
}
