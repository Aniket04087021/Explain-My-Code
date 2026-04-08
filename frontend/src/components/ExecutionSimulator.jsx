import { useState, useEffect, useRef, useMemo } from 'react';
import { Play, Pause, RotateCcw, ChevronRight, SkipBack, SkipForward, Repeat } from 'lucide-react';

/**
 * ExecutionSimulator Component
 * Animated timeline that visually simulates code execution step-by-step.
 * Highlights the active step and provides play/pause/reset controls.
 */
export default function ExecutionSimulator({ steps = [], sourceCode = '', onHighlightLine }) {
  const [currentStep, setCurrentStep] = useState(-1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(1500); // ms per step
  const [isLooping, setIsLooping] = useState(false);
  const intervalRef = useRef(null);
  const stepRefs = useRef([]);
  const sourceCodeLines = useMemo(() => String(sourceCode || '').split('\n'), [sourceCode]);
  const normalizedSteps = useMemo(() => {
    if (!Array.isArray(steps)) return [];
    return steps
      .map((step, index) => {
        const description = String(step?.description || step?.text || '').trim();
        if (!description) return null;
        const line = Number(step?.line);
        const lineText = String(
          step?.code ??
          (Number.isFinite(line) && line > 0 ? sourceCodeLines[line - 1] : '')
        );
        return {
          step: index + 1,
          description,
          line: Number.isFinite(line) && line > 0 ? line : null,
          code: lineText,
        };
      })
      .filter(Boolean);
  }, [steps, sourceCodeLines]);

  const currentStepData = currentStep >= 0 ? normalizedSteps[currentStep] : null;
  const progress = currentStep >= 0 ? ((currentStep + 1) / normalizedSteps.length) * 100 : 0;
  const remainingSteps = currentStep >= 0 ? Math.max(0, normalizedSteps.length - (currentStep + 1)) : normalizedSteps.length;
  const etaSeconds = Math.ceil((remainingSteps * speed) / 1000);

  // Auto-advance steps when playing
  useEffect(() => {
    if (isPlaying && normalizedSteps.length > 0) {
      intervalRef.current = setInterval(() => {
        setCurrentStep(prev => {
          const safePrev = prev < 0 ? 0 : prev;
          const next = safePrev + 1;
          if (next >= normalizedSteps.length) {
            if (isLooping) return 0;
            setIsPlaying(false);
            return normalizedSteps.length - 1;
          }
          return next;
        });
      }, speed);
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isPlaying, speed, normalizedSteps.length, isLooping]);

  // Notify parent of the current line to highlight in editor
  useEffect(() => {
    if (currentStep >= 0 && currentStep < normalizedSteps.length && onHighlightLine) {
      onHighlightLine(normalizedSteps[currentStep].line);
    }
  }, [currentStep, normalizedSteps, onHighlightLine]);

  // Keep active step visible during playback/manual stepping
  useEffect(() => {
    if (currentStep < 0) return;
    const activeNode = stepRefs.current[currentStep];
    if (activeNode) {
      activeNode.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
      });
    }
  }, [currentStep]);

  const handlePlay = () => {
    if (currentStep < 0) setCurrentStep(0);
    if (currentStep >= normalizedSteps.length - 1) setCurrentStep(0);
    setIsPlaying(true);
  };

  const handlePause = () => setIsPlaying(false);

  const handleReset = () => {
    setIsPlaying(false);
    setCurrentStep(-1);
    if (onHighlightLine) onHighlightLine(null);
  };

  const handleStepClick = (index) => {
    setCurrentStep(index);
    setIsPlaying(false);
  };

  const handleNext = () => {
    setIsPlaying(false);
    setCurrentStep(prev => {
      if (normalizedSteps.length === 0) return -1;
      if (prev < 0) return 0;
      return Math.min(prev + 1, normalizedSteps.length - 1);
    });
  };

  const handlePrevious = () => {
    setIsPlaying(false);
    setCurrentStep(prev => Math.max(prev - 1, 0));
  };

  if (!normalizedSteps.length) return null;

  return (
    <div className="card" style={{ marginTop: '1rem' }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '1rem',
      }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)' }}>
          ▶️ Execution Simulator
        </h3>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <button onClick={handlePrevious} className="btn-secondary" style={{ padding: '0.4rem 0.6rem', fontSize: '0.75rem' }}>
            <SkipBack size={14} />
          </button>
          <button onClick={handleNext} className="btn-secondary" style={{ padding: '0.4rem 0.6rem', fontSize: '0.75rem' }}>
            <SkipForward size={14} />
          </button>
          <select
            value={speed}
            onChange={(e) => setSpeed(Number(e.target.value))}
            className="input"
            style={{ width: 'auto', padding: '0.3rem 0.5rem', fontSize: '0.75rem' }}
          >
            <option value={3000}>Slow+</option>
            <option value={2500}>Slow</option>
            <option value={1500}>Normal</option>
            <option value={800}>Fast</option>
            <option value={450}>Turbo</option>
          </select>
          <button
            onClick={() => setIsLooping(v => !v)}
            className={isLooping ? 'btn-primary' : 'btn-secondary'}
            style={{ padding: '0.4rem 0.75rem', fontSize: '0.75rem' }}
            title="Loop playback"
          >
            <Repeat size={14} /> Loop
          </button>
          {isPlaying ? (
            <button onClick={handlePause} className="btn-secondary" style={{ padding: '0.4rem 0.75rem', fontSize: '0.75rem' }}>
              <Pause size={14} /> Pause
            </button>
          ) : (
            <button onClick={handlePlay} className="btn-primary" style={{ padding: '0.4rem 0.75rem', fontSize: '0.75rem' }}>
              <Play size={14} /> Play
            </button>
          )}
          <button onClick={handleReset} className="btn-icon" style={{ padding: '0.4rem' }}>
            <RotateCcw size={14} />
          </button>
        </div>
      </div>

      {/* Status row */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
        gap: '0.5rem',
        marginBottom: '0.85rem',
      }}>
        <div style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', padding: '0.55rem 0.65rem' }}>
          <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Step</div>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-primary)', fontWeight: 600 }}>{currentStep >= 0 ? currentStep + 1 : 0} / {normalizedSteps.length}</div>
        </div>
        <div style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', padding: '0.55rem 0.65rem' }}>
          <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Progress</div>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-primary)', fontWeight: 600 }}>{Math.round(progress)}%</div>
        </div>
        <div style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', padding: '0.55rem 0.65rem' }}>
          <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>ETA</div>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-primary)', fontWeight: 600 }}>~{etaSeconds}s</div>
        </div>
      </div>

      {/* Progress Bar */}
      <div style={{
        height: '4px',
        background: 'var(--bg-tertiary)',
        borderRadius: '2px',
        marginBottom: '1rem',
        overflow: 'hidden',
      }}>
        <div style={{
          height: '100%',
          width: `${progress}%`,
          background: 'linear-gradient(90deg, var(--gradient-start), var(--gradient-end))',
          borderRadius: '2px',
          transition: 'width 0.3s ease',
        }} />
      </div>

      {/* Scrubber */}
      <input
        type="range"
        min={0}
        max={Math.max(0, normalizedSteps.length - 1)}
        value={Math.max(currentStep, 0)}
        onChange={(e) => {
          setIsPlaying(false);
          setCurrentStep(Number(e.target.value));
        }}
        style={{ width: '100%', marginBottom: '1rem', accentColor: 'var(--accent-primary)' }}
      />

      {/* Steps Timeline */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '340px', overflowY: 'auto', paddingRight: '0.3rem' }}>
        {normalizedSteps.map((step, index) => {
          const isActive = index === currentStep;
          const isCompleted = index < currentStep;
          const isPending = index > currentStep;

          return (
            <div
              key={index}
              ref={(node) => { stepRefs.current[index] = node; }}
              onClick={() => handleStepClick(index)}
              className={`execution-step ${isActive ? 'active' : ''} ${isCompleted ? 'completed' : ''}`}
              style={{
                opacity: isPending && currentStep >= 0 ? 0.4 : 1,
                padding: '0.75rem 1rem',
                borderRadius: 'var(--radius-sm)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                transition: 'all 0.3s ease',
                background: isActive ? 'rgba(139, 92, 246, 0.1)' : 'transparent',
                borderLeft: isActive ? '3px solid var(--accent-primary)' : isCompleted ? '3px solid var(--success)' : '3px solid var(--border-color)',
              }}
            >
              {/* Step Number */}
              <div style={{
                width: 28,
                height: 28,
                borderRadius: '50%',
                background: isActive
                  ? 'linear-gradient(135deg, var(--gradient-start), var(--gradient-end))'
                  : isCompleted
                    ? 'var(--success)'
                    : 'var(--bg-tertiary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '0.75rem',
                fontWeight: 600,
                color: isActive || isCompleted ? 'white' : 'var(--text-muted)',
                flexShrink: 0,
              }}>
                {isCompleted ? '✓' : step.step}
              </div>

              {/* Step Content */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontSize: '0.85rem',
                  fontWeight: isActive ? 600 : 400,
                  color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
                }}>
                  {step.description}
                </div>
                {step.line && (
                  <div style={{
                    fontSize: '0.7rem',
                    color: 'var(--text-muted)',
                    fontFamily: "'JetBrains Mono', monospace",
                    marginTop: '2px',
                  }}>
                    Line {step.line}
                  </div>
                )}
                <div style={{
                  marginTop: '0.35rem',
                  fontSize: '0.72rem',
                  color: 'var(--text-muted)',
                  fontFamily: "'JetBrains Mono', monospace",
                  background: 'var(--bg-primary)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '6px',
                  padding: '0.35rem 0.45rem',
                  whiteSpace: 'pre-wrap',
                }}>
                  {step.code || ' '}
                </div>
              </div>

              {isActive && (
                <ChevronRight size={16} style={{ color: 'var(--accent-primary)', flexShrink: 0 }} />
              )}
            </div>
          );
        })}
      </div>

      {/* Active step preview */}
      {currentStepData && (
        <div style={{
          marginTop: '0.85rem',
          borderRadius: 'var(--radius-sm)',
          border: '1px solid var(--border-color)',
          background: 'rgba(139, 92, 246, 0.06)',
          padding: '0.8rem',
        }}>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '0.3rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Active Step Detail
          </div>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-primary)', fontWeight: 500 }}>
            {currentStepData.description}
          </div>
          <div style={{
            marginTop: '0.45rem',
            fontSize: '0.78rem',
            color: 'var(--text-secondary)',
            fontFamily: "'JetBrains Mono', monospace",
            background: 'var(--bg-primary)',
            border: '1px solid var(--border-color)',
            borderRadius: '6px',
            padding: '0.45rem 0.55rem',
            whiteSpace: 'pre-wrap',
          }}>
            {currentStepData.code || ' '}
          </div>
        </div>
      )}
    </div>
  );
}
