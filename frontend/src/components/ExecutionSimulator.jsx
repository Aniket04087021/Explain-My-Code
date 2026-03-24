import { useState, useEffect, useRef } from 'react';
import { Play, Pause, RotateCcw, ChevronRight } from 'lucide-react';

/**
 * ExecutionSimulator Component
 * Animated timeline that visually simulates code execution step-by-step.
 * Highlights the active step and provides play/pause/reset controls.
 */
export default function ExecutionSimulator({ steps = [], onHighlightLine }) {
  const [currentStep, setCurrentStep] = useState(-1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(1500); // ms per step
  const intervalRef = useRef(null);

  // Auto-advance steps when playing
  useEffect(() => {
    if (isPlaying && steps.length > 0) {
      intervalRef.current = setInterval(() => {
        setCurrentStep(prev => {
          const next = prev + 1;
          if (next >= steps.length) {
            setIsPlaying(false);
            return prev;
          }
          return next;
        });
      }, speed);
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isPlaying, speed, steps.length]);

  // Notify parent of the current line to highlight in editor
  useEffect(() => {
    if (currentStep >= 0 && currentStep < steps.length && onHighlightLine) {
      onHighlightLine(steps[currentStep].line);
    }
  }, [currentStep, steps, onHighlightLine]);

  const handlePlay = () => {
    if (currentStep >= steps.length - 1) {
      setCurrentStep(0);
    }
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

  if (!steps || steps.length === 0) return null;

  // Calculate progress percentage
  const progress = currentStep >= 0 ? ((currentStep + 1) / steps.length) * 100 : 0;

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
          <select
            value={speed}
            onChange={(e) => setSpeed(Number(e.target.value))}
            className="input"
            style={{ width: 'auto', padding: '0.3rem 0.5rem', fontSize: '0.75rem' }}
          >
            <option value={2500}>Slow</option>
            <option value={1500}>Normal</option>
            <option value={800}>Fast</option>
          </select>
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

      {/* Steps Timeline */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {steps.map((step, index) => {
          const isActive = index === currentStep;
          const isCompleted = index < currentStep;
          const isPending = index > currentStep;

          return (
            <div
              key={index}
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
              </div>

              {isActive && (
                <ChevronRight size={16} style={{ color: 'var(--accent-primary)', flexShrink: 0 }} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
