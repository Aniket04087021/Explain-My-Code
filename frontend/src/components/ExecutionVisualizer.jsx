import { useEffect, useMemo, useRef } from 'react';
import { AlertCircle, TerminalSquare, ScanLine, Activity } from 'lucide-react';
import StepControls from './StepControls';
import MemoryPanel from './MemoryPanel';
import StackPanel from './StackPanel';

function normalizeStep(step = {}, fallbackIndex = 0) {
  const stack = Array.isArray(step.stack)
    ? step.stack
    : Array.isArray(step.frames)
      ? step.frames
      : [];

  return {
    ...step,
    line: Number(step.line) || null,
    variables: step.variables || step.locals || {},
    stack,
    output: step.output ?? step.consoleOutput ?? '',
    explanation: step.explanation || step.description || `Step ${fallbackIndex + 1}`,
    error: step.error || null,
  };
}

export default function ExecutionVisualizer({
  steps = [],
  currentStep = 0,
  onCurrentStepChange,
  isPlaying = false,
  onPlayingChange,
  speed = 1,
  onSpeedChange,
  loading = false,
  error = null,
}) {
  const timerRef = useRef(null);
  const normalizedSteps = useMemo(
    () => (Array.isArray(steps) ? steps.map((step, index) => normalizeStep(step, index)) : []),
    [steps]
  );

  const totalSteps = normalizedSteps.length;
  const safeStep = totalSteps ? Math.min(Math.max(0, currentStep), totalSteps - 1) : 0;
  const step = totalSteps ? normalizedSteps[safeStep] : null;
  const previousStep = safeStep > 0 ? normalizedSteps[safeStep - 1] : null;
  const intervalMs = Math.max(250, 1000 / (speed || 1));

  useEffect(() => {
    if (!isPlaying || totalSteps === 0) {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      return;
    }

    timerRef.current = setInterval(() => {
      onCurrentStepChange((index) => {
        if (index >= totalSteps - 1) {
          onPlayingChange(false);
          return totalSteps - 1;
        }
        return index + 1;
      });
    }, intervalMs);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [intervalMs, isPlaying, onCurrentStepChange, onPlayingChange, totalSteps]);

  const handleRun = () => {
    if (!totalSteps) return;
    onCurrentStepChange((index) => (index >= totalSteps - 1 ? 0 : index));
    onPlayingChange(true);
  };

  const handlePause = () => onPlayingChange(false);

  const handlePrevious = () => {
    onPlayingChange(false);
    onCurrentStepChange((index) => Math.max(0, index - 1));
  };

  const handleNext = () => {
    onPlayingChange(false);
    onCurrentStepChange((index) => Math.min(totalSteps - 1, index + 1));
  };

  const handleReplay = () => {
    onCurrentStepChange(0);
    onPlayingChange(true);
  };

  const handleSlider = (index) => {
    onPlayingChange(false);
    onCurrentStepChange(index);
  };

  if (loading) {
    return (
      <div className="card" style={{ minHeight: '320px', display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
        <div>
          <div className="loader" style={{ margin: '0 auto 1rem' }} />
          <div style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-primary)' }}>Building execution timeline</div>
          <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '0.4rem' }}>Reading state transitions and preparing memory frames.</div>
        </div>
      </div>
    );
  }

  if (error && !totalSteps) {
    return (
      <div className="card" style={{
        minHeight: '240px',
        display: 'flex',
        alignItems: 'center',
        gap: '0.9rem',
        borderColor: 'rgba(239, 68, 68, 0.35)',
        background: 'rgba(239, 68, 68, 0.08)',
      }}>
        <AlertCircle size={22} style={{ color: 'var(--error)', flexShrink: 0 }} />
        <div>
          <div style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--error)', marginBottom: '0.35rem' }}>Visualization failed</div>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{error}</div>
        </div>
      </div>
    );
  }

  if (!step) {
    return (
      <div className="card" style={{ minHeight: '320px', display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
        <div>
          <ScanLine size={38} style={{ color: 'var(--accent-primary)', marginBottom: '0.9rem' }} />
          <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)' }}>No execution data yet</div>
          <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>
            Run visualization to inspect variables, stack frames, and console output step by step.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', minHeight: 0 }}>
      <StepControls
        currentStep={safeStep}
        totalSteps={totalSteps}
        isPlaying={isPlaying}
        speed={speed}
        onRun={handleRun}
        onPause={handlePause}
        onPrevious={handlePrevious}
        onNext={handleNext}
        onReplay={handleReplay}
        onStepChange={handleSlider}
        onSpeedChange={onSpeedChange}
        disabled={loading}
      />

      <div className="card" style={{ padding: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)' }}>
              Executing Line
            </div>
            <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              {step.line ? `Line ${step.line}` : 'Line unavailable'}
            </div>
          </div>
          <div style={{
            padding: '0.45rem 0.7rem',
            borderRadius: '999px',
            border: step.error ? '1px solid rgba(239, 68, 68, 0.3)' : '1px solid rgba(139, 92, 246, 0.25)',
            background: step.error ? 'rgba(239, 68, 68, 0.08)' : 'rgba(139, 92, 246, 0.08)',
            fontSize: '0.75rem',
            color: step.error ? 'var(--error)' : 'var(--accent-tertiary)',
            fontWeight: 600,
          }}>
            {step.error ? 'Error state' : 'Live state'}
          </div>
        </div>

        <div style={{
          marginTop: '0.9rem',
          padding: '0.9rem 1rem',
          borderRadius: 'var(--radius-md)',
          border: step.error ? '1px solid rgba(239, 68, 68, 0.35)' : '1px solid rgba(99, 102, 241, 0.2)',
          background: step.error ? 'rgba(239, 68, 68, 0.08)' : 'rgba(99, 102, 241, 0.08)',
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: '0.85rem',
          color: 'var(--text-primary)',
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
        }}>
          {step.code || step.source || 'Source line preview unavailable'}
        </div>

        {step.error && (
          <div style={{
            marginTop: '0.85rem',
            padding: '0.85rem 0.95rem',
            borderRadius: 'var(--radius-md)',
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.28)',
            color: '#fca5a5',
            fontSize: '0.82rem',
            lineHeight: 1.55,
          }}>
            {step.error}
          </div>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1rem' }}>
        <MemoryPanel variables={step.variables} previousVariables={previousStep?.variables || {}} />
        <StackPanel stack={step.stack} />
      </div>

      <div className="card" style={{ padding: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.8rem' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.45rem' }}>
            <TerminalSquare size={17} style={{ color: 'var(--success)' }} />
            <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)' }}>Console Output</div>
          </div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            <Activity size={13} />
            step stream
          </div>
        </div>

        <pre style={{
          margin: 0,
          minHeight: '96px',
          maxHeight: '180px',
          overflow: 'auto',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border-color)',
          background: 'rgba(255, 255, 255, 0.02)',
          padding: '0.9rem',
          fontSize: '0.8rem',
          lineHeight: 1.6,
          color: 'var(--text-secondary)',
          fontFamily: "'JetBrains Mono', monospace",
          whiteSpace: 'pre-wrap',
        }}>
          {step.output || 'No console output at this step.'}
        </pre>
      </div>
    </div>
  );
}
