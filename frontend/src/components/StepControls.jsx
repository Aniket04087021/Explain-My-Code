import { Play, Pause, SkipBack, SkipForward, RotateCcw, Gauge, Orbit } from 'lucide-react';

const SPEED_OPTIONS = [
  { label: '0.5x', value: 0.5 },
  { label: '1x', value: 1 },
  { label: '2x', value: 2 },
];

export default function StepControls({
  currentStep = 0,
  totalSteps = 0,
  isPlaying = false,
  speed = 1,
  onRun,
  onPause,
  onPrevious,
  onNext,
  onReplay,
  onStepChange,
  onSpeedChange,
  disabled = false,
}) {
  const max = Math.max(totalSteps - 1, 0);

  return (
    <div className="card" style={{ padding: '1rem' }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '0.75rem',
        flexWrap: 'wrap',
        marginBottom: '0.85rem',
      }}>
        <div>
          <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)' }}>
            Timeline Control
          </div>
          <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)' }}>
            Step {totalSteps ? currentStep + 1 : 0} / {totalSteps}
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.45rem', flexWrap: 'wrap' }}>
          <button type="button" className="btn-primary" onClick={onRun} disabled={disabled || totalSteps === 0}>
            <Play size={16} />
            Run
          </button>
          <button type="button" className="btn-secondary" onClick={onPause} disabled={disabled || !isPlaying}>
            <Pause size={16} />
            Pause
          </button>
          <button type="button" className="btn-secondary" onClick={onPrevious} disabled={disabled || totalSteps === 0}>
            <SkipBack size={16} />
            Previous
          </button>
          <button type="button" className="btn-secondary" onClick={onNext} disabled={disabled || totalSteps === 0}>
            <SkipForward size={16} />
            Next
          </button>
          <button type="button" className="btn-secondary" onClick={onReplay} disabled={disabled || totalSteps === 0}>
            <RotateCcw size={16} />
            Replay
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto', gap: '0.85rem', alignItems: 'center' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
              <Orbit size={13} />
              Execution Timeline
            </span>
            <span>{totalSteps ? `${currentStep + 1} of ${totalSteps}` : 'No steps yet'}</span>
          </div>
          <input
            type="range"
            min={0}
            max={max}
            value={Math.min(currentStep, max)}
            onChange={(e) => onStepChange(Number(e.target.value))}
            disabled={disabled || totalSteps === 0}
            style={{ width: '100%', accentColor: 'var(--accent-primary)' }}
          />
        </div>

        <label style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
            <Gauge size={13} />
            Speed
          </span>
          <select
            className="input"
            value={speed}
            onChange={(e) => onSpeedChange(Number(e.target.value))}
            disabled={disabled}
            style={{ width: 'auto', minWidth: '84px', padding: '0.45rem 0.75rem' }}
          >
            {SPEED_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </label>
      </div>
    </div>
  );
}
