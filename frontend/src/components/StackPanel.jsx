import { Layers3 } from 'lucide-react';

function getFrameName(frame, index) {
  if (typeof frame === 'string') return frame;
  return frame?.name || frame?.label || frame?.scope || `Frame ${index + 1}`;
}

function getFrameVars(frame) {
  if (!frame || typeof frame === 'string') return {};
  return frame.variables || frame.locals || frame.state || {};
}

function formatValue(value) {
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

function isCompactToken(value) {
  if (typeof value !== 'string') return false;
  const trimmed = value.trim().replace(/^"+|"+$/g, '');
  return (
    (trimmed.startsWith('[Function:') && trimmed.endsWith(']')) ||
    (trimmed.startsWith('[Native:') && trimmed.endsWith(']')) ||
    trimmed === '[Function]'
  );
}

export default function StackPanel({ stack = [] }) {
  const frames = Array.isArray(stack) ? stack : [];
  const activeIndex = frames.length - 1;

  return (
    <div className="card" style={{ padding: '1rem', minHeight: 0 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.9rem' }}>
        <div>
          <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)' }}>
            Runtime Stack
          </div>
          <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)' }}>
            Call Stack
          </div>
        </div>
        <Layers3 size={18} style={{ color: 'var(--accent-tertiary)' }} />
      </div>

      {frames.length === 0 ? (
        <div style={{
          border: '1px dashed var(--border-color)',
          borderRadius: 'var(--radius-md)',
          padding: '1rem',
          color: 'var(--text-muted)',
          fontSize: '0.85rem',
          textAlign: 'center',
        }}>
          No stack frames recorded for this step.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.7rem' }}>
          {frames.map((frame, index) => {
            const vars = Object.entries(getFrameVars(frame));
            const isActive = index === activeIndex;

            return (
              <div
                key={`${getFrameName(frame, index)}-${index}`}
                className={isActive ? 'viz-stack-frame viz-stack-frame-active' : 'viz-stack-frame'}
                style={{
                  borderRadius: 'var(--radius-md)',
                  border: isActive ? '1px solid rgba(139, 92, 246, 0.4)' : '1px solid var(--border-color)',
                  background: isActive ? 'rgba(139, 92, 246, 0.12)' : 'rgba(255, 255, 255, 0.02)',
                  padding: '0.85rem',
                  boxShadow: isActive ? '0 8px 30px rgba(99, 102, 241, 0.16)' : 'none',
                }}
              >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: vars.length ? '0.6rem' : 0, gap: '0.75rem' }}>
                    <div style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                      {getFrameName(frame, index)}
                    </div>
                  <div style={{
                    fontSize: '0.68rem',
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                    color: isActive ? 'var(--accent-tertiary)' : 'var(--text-muted)',
                  }}>
                    {isActive ? 'Current frame' : 'Frame'}
                  </div>
                </div>

                {vars.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                    {vars.map(([name, value]) => (
                      <div
                        key={name}
                        style={{
                          display: 'flex',
                          alignItems: 'baseline',
                          justifyContent: 'space-between',
                          gap: '0.75rem',
                          fontSize: '0.78rem',
                          fontFamily: "'JetBrains Mono', monospace",
                        }}
                      >
                        <span style={{ color: 'var(--text-secondary)' }}>{name}</span>
                        {isCompactToken(value) ? (
                          <span
                            style={{
                              color: 'var(--text-primary)',
                              textAlign: 'right',
                              maxWidth: '60%',
                              overflowX: 'auto',
                              overflowY: 'hidden',
                              whiteSpace: 'nowrap',
                              fontSize: '0.74rem',
                              padding: '0.2rem 0.45rem',
                              borderRadius: '8px',
                              background: 'rgba(99, 102, 241, 0.08)',
                              border: '1px solid rgba(99, 102, 241, 0.15)',
                              scrollbarWidth: 'thin',
                            }}
                            title={formatValue(value)}
                          >
                            {formatValue(value)}
                          </span>
                        ) : (
                          <span style={{ color: 'var(--text-primary)', textAlign: 'right', wordBreak: 'break-word', overflowWrap: 'anywhere' }}>{formatValue(value)}</span>
                        )}
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
