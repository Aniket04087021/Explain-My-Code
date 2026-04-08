import { useEffect, useRef, useCallback } from 'react';
import {
  Play, Pause, SkipBack, SkipForward, ChevronsLeft, ChevronsRight, Terminal, Layers, AlertCircle
} from 'lucide-react';

/**
 * PythonTutor-style panel: output, execution controls, memory frames, timeline.
 */
const LANG_LABEL = {
  python: 'Python',
  javascript: 'JavaScript',
  typescript: 'TypeScript',
};

export default function CodeExecutionVisualizer({
  steps = [],
  sourceLines = [],
  language = 'javascript',
  index,
  onIndexChange,
  playing,
  onPlayingChange,
  speed = 650,
  error = null,
  loading = false,
  onSpeedChange,
}) {
  const playRef = useRef(null);

  const total = steps.length;
  const safeIndex = total ? Math.min(Math.max(0, index), total - 1) : 0;
  const step = total ? steps[safeIndex] : null;
  const line = step?.line ?? null;
  const prevLine = safeIndex > 0 ? steps[safeIndex - 1]?.line : null;
  const nextLine = total && safeIndex < total - 1 ? steps[safeIndex + 1]?.line : null;

  const lineText = (n) => {
    if (!n || n < 1) return '—';
    return sourceLines[n - 1] ?? '—';
  };

  useEffect(() => {
    if (!playing || total <= 0) {
      if (playRef.current) {
        clearInterval(playRef.current);
        playRef.current = null;
      }
      return;
    }
    playRef.current = setInterval(() => {
      onIndexChange((i) => {
        if (i >= total - 1) {
          onPlayingChange(false);
          return total - 1;
        }
        return i + 1;
      });
    }, speed);
    return () => {
      if (playRef.current) clearInterval(playRef.current);
    };
  }, [playing, total, speed, onIndexChange, onPlayingChange]);

  const goFirst = useCallback(() => { onIndexChange(0); onPlayingChange(false); }, [onIndexChange, onPlayingChange]);
  const goPrev = useCallback(() => { onIndexChange((i) => Math.max(0, i - 1)); onPlayingChange(false); }, [onIndexChange, onPlayingChange]);
  const goNext = useCallback(() => { onIndexChange((i) => Math.min(total - 1, i + 1)); onPlayingChange(false); }, [onIndexChange, onPlayingChange, total]);
  const goLast = useCallback(() => { onIndexChange(Math.max(0, total - 1)); onPlayingChange(false); }, [onIndexChange, onPlayingChange, total]);

  if (loading) {
    return (
      <div className="card" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
        <div className="loader" style={{ margin: '0 auto 1rem' }} />
        Simulating execution safely (no raw eval)…
      </div>
    );
  }

  if (error) {
    return (
      <div className="card" style={{
        borderColor: 'rgba(239, 68, 68, 0.35)',
        background: 'rgba(239, 68, 68, 0.06)',
        display: 'flex',
        gap: '0.75rem',
        alignItems: 'flex-start',
      }}>
        <AlertCircle size={20} style={{ color: 'var(--error)', flexShrink: 0, marginTop: 2 }} />
        <div>
          <div style={{ fontWeight: 600, color: 'var(--error)', marginBottom: '0.35rem' }}>Visualization error</div>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>{error}</div>
        </div>
      </div>
    );
  }

  if (!total) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
        <Terminal size={36} style={{ margin: '0 auto 1rem', opacity: 0.35 }} />
        <p style={{ fontSize: '0.9rem' }}>Click <strong>Run Code Visualization</strong> to step through memory like PythonTutor.</p>
        <p style={{ fontSize: '0.75rem', marginTop: '0.75rem' }}>JavaScript / TypeScript and Python subsets are interpreted in a sandbox on the server.</p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', minHeight: 0 }}>
      {/* Line context */}
      <div style={{
        display: 'grid',
        gridTemplateRows: 'auto auto auto',
        gap: '0.35rem',
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: '0.72rem',
      }}>
        <div style={{
          padding: '0.45rem 0.55rem',
          borderRadius: 'var(--radius-sm)',
          background: 'rgba(34, 197, 94, 0.12)',
          border: '1px solid rgba(34, 197, 94, 0.25)',
          color: 'var(--text-secondary)',
        }}>
          <span style={{ color: 'var(--success)', fontWeight: 600, marginRight: '0.5rem' }}>Previous</span>
          L{prevLine ?? '—'}: {lineText(prevLine)}
        </div>
        <div style={{
          padding: '0.45rem 0.55rem',
          borderRadius: 'var(--radius-sm)',
          background: 'rgba(234, 179, 8, 0.15)',
          border: '1px solid rgba(234, 179, 8, 0.35)',
          color: 'var(--text-primary)',
        }}>
          <span style={{ color: '#eab308', fontWeight: 700, marginRight: '0.5rem' }}>Current</span>
          L{line ?? '—'}: {lineText(line)}
        </div>
        <div style={{
          padding: '0.45rem 0.55rem',
          borderRadius: 'var(--radius-sm)',
          background: 'rgba(239, 68, 68, 0.1)',
          border: '1px solid rgba(239, 68, 68, 0.25)',
          color: 'var(--text-secondary)',
        }}>
          <span style={{ color: 'var(--error)', fontWeight: 600, marginRight: '0.5rem' }}>Next</span>
          L{nextLine ?? '—'}: {lineText(nextLine)}
        </div>
      </div>

      {/* Controls */}
      <div className="card" style={{ padding: '0.75rem' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', alignItems: 'center', marginBottom: '0.65rem' }}>
          <button type="button" className="btn-secondary" style={{ padding: '0.35rem 0.5rem', fontSize: '0.7rem' }} onClick={goFirst} title="First">
            <ChevronsLeft size={16} />
          </button>
          <button type="button" className="btn-secondary" style={{ padding: '0.35rem 0.5rem', fontSize: '0.7rem' }} onClick={goPrev} title="Previous">
            <SkipBack size={16} />
          </button>
          <button type="button" className="btn-primary" style={{ padding: '0.35rem 0.65rem', fontSize: '0.75rem' }} onClick={() => onPlayingChange(!playing)}>
            {playing ? <Pause size={14} /> : <Play size={14} />}
            {playing ? ' Pause' : ' Play'}
          </button>
          <button type="button" className="btn-secondary" style={{ padding: '0.35rem 0.5rem', fontSize: '0.7rem' }} onClick={goNext} title="Next">
            <SkipForward size={16} />
          </button>
          <button type="button" className="btn-secondary" style={{ padding: '0.35rem 0.5rem', fontSize: '0.7rem' }} onClick={goLast} title="Last">
            <ChevronsRight size={16} />
          </button>
          <span style={{
            marginLeft: 'auto',
            fontSize: '0.75rem',
            fontWeight: 600,
            color: 'var(--text-primary)',
          }}>
            Step {total ? safeIndex + 1 : 0} of {total}
          </span>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <label style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Timeline</label>
          <input
            type="range"
            min={0}
            max={total - 1}
            value={safeIndex}
            onChange={(e) => {
              onPlayingChange(false);
              onIndexChange(Number(e.target.value));
            }}
            style={{ flex: 1, minWidth: '120px', accentColor: 'var(--accent-primary)' }}
          />
          {onSpeedChange && (
            <select
              className="input"
              value={speed}
              onChange={(e) => onSpeedChange(Number(e.target.value))}
              style={{ width: 'auto', padding: '0.25rem 0.4rem', fontSize: '0.7rem' }}
            >
              <option value={1200}>Slow</option>
              <option value={650}>Normal</option>
              <option value={350}>Fast</option>
              <option value={150}>Turbo</option>
            </select>
          )}
        </div>
      </div>

      {/* Output */}
      <div className="card" style={{ padding: '0.75rem', flex: 1, minHeight: '100px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.5rem' }}>
          <Terminal size={14} style={{ color: 'var(--accent-primary)' }} />
          <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>Console output</span>
        </div>
        <pre style={{
          margin: 0,
          padding: '0.5rem',
          background: 'var(--bg-primary)',
          borderRadius: 'var(--radius-sm)',
          border: '1px solid var(--border-color)',
          fontSize: '0.75rem',
          fontFamily: "'JetBrains Mono', monospace",
          color: 'var(--text-secondary)',
          minHeight: '72px',
          whiteSpace: 'pre-wrap',
          overflow: 'auto',
        }}>
          {step?.output || ' '}
        </pre>
      </div>

      {/* Memory / frames */}
      <div className="card" style={{ padding: '0.75rem', maxHeight: '240px', overflowY: 'auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.5rem' }}>
          <Layers size={14} style={{ color: 'var(--success)' }} />
          <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>Memory: stack &amp; variables</span>
        </div>
        {(step?.frames || []).map((fr, fi) => (
          <div
            key={fi}
            style={{
              marginBottom: '0.65rem',
              padding: '0.5rem',
              background: 'var(--bg-primary)',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border-color)',
            }}
          >
            <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginBottom: '0.35rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              {fr.name} <span style={{ opacity: 0.7 }}>({fr.scope})</span>
            </div>
            {Object.keys(fr.variables || {}).length === 0 ? (
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>— empty —</div>
            ) : (
              Object.entries(fr.variables || {}).map(([k, v]) => (
                <div key={k} style={{ fontSize: '0.72rem', fontFamily: "'JetBrains Mono', monospace", marginBottom: '0.2rem', color: 'var(--text-secondary)' }}>
                  <span style={{ color: 'var(--accent-tertiary)' }}>{k}</span>
                  {' = '}
                  <span style={{ color: 'var(--text-primary)' }}>{typeof v === 'object' ? JSON.stringify(v) : String(v)}</span>
                </div>
              ))
            )}
          </div>
        ))}
      </div>

      {step?.code && (
        <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontFamily: "'JetBrains Mono', monospace" }}>
          Instruction: <span style={{ color: 'var(--text-secondary)' }}>{step.code}</span>
        </div>
      )}
    </div>
  );
}
