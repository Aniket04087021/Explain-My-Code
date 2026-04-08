import { Binary, Sparkles } from 'lucide-react';

function formatValue(value) {
  if (value === null) return 'null';
  if (value === undefined) return 'undefined';
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (
      (trimmed.startsWith('[Function:') && trimmed.endsWith(']')) ||
      (trimmed.startsWith('"[Function:') && trimmed.endsWith(']"')) ||
      (trimmed.startsWith('[Native:') && trimmed.endsWith(']')) ||
      (trimmed.startsWith('"[Native:') && trimmed.endsWith(']"'))
    ) {
      return trimmed.replace(/^"+|"+$/g, '');
    }
    return `"${value}"`;
  }
  if (typeof value === 'object') {
    try {
      return JSON.stringify(value, null, 2);
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
    (trimmed.startsWith('[Function]') && trimmed.endsWith(']'))
  );
}

export default function MemoryPanel({ variables = {}, previousVariables = {} }) {
  const entries = Object.entries(variables || {});

  return (
    <div className="card" style={{ padding: '1rem', minHeight: 0 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.9rem' }}>
        <div>
          <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)' }}>
            Memory State
          </div>
          <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)' }}>
            Variables
          </div>
        </div>
        <Binary size={18} style={{ color: 'var(--accent-primary)' }} />
      </div>

      {entries.length === 0 ? (
        <div style={{
          border: '1px dashed var(--border-color)',
          borderRadius: 'var(--radius-md)',
          padding: '1rem',
          color: 'var(--text-muted)',
          fontSize: '0.85rem',
          textAlign: 'center',
        }}>
          No variables captured for this step.
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '0.75rem',
        }}>
          {entries.map(([key, value]) => {
            const previousValue = previousVariables?.[key];
            const isChanged = JSON.stringify(previousValue) !== JSON.stringify(value);

            return (
              <div
                key={key}
                className={isChanged ? 'viz-memory-card viz-memory-card-changed' : 'viz-memory-card'}
                style={{
                  position: 'relative',
                  padding: '0.85rem',
                  borderRadius: 'var(--radius-md)',
                  border: isChanged ? '1px solid rgba(34, 197, 94, 0.35)' : '1px solid var(--border-color)',
                  background: isChanged ? 'rgba(34, 197, 94, 0.08)' : 'rgba(255, 255, 255, 0.02)',
                  overflow: 'hidden',
                }}
              >
                {isChanged && (
                  <div style={{
                    position: 'absolute',
                    top: '0.65rem',
                    right: '0.65rem',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.2rem',
                    color: 'var(--success)',
                    fontSize: '0.7rem',
                    fontWeight: 600,
                  }}>
                    <Sparkles size={12} />
                    changed
                  </div>
                )}

                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', letterSpacing: '0.02em', marginBottom: '0.45rem', fontFamily: "'JetBrains Mono', monospace" }}>
                  {key}
                </div>
                {isCompactToken(value) ? (
                  <div
                    className="viz-value-fade"
                    style={{
                      display: 'block',
                      alignItems: 'center',
                      width: '100%',
                      padding: '0.38rem 0.55rem',
                      borderRadius: '10px',
                      background: 'rgba(99, 102, 241, 0.08)',
                      border: '1px solid rgba(99, 102, 241, 0.18)',
                      fontSize: '0.76rem',
                      lineHeight: 1.3,
                      color: 'var(--text-primary)',
                      fontFamily: "'JetBrains Mono', monospace",
                      whiteSpace: 'nowrap',
                      overflowX: 'auto',
                      overflowY: 'hidden',
                      scrollbarWidth: 'thin',
                    }}
                    title={formatValue(value)}
                  >
                    {formatValue(value)}
                  </div>
                ) : (
                  <pre
                    className="viz-value-fade"
                    style={{
                      margin: 0,
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-word',
                      overflowWrap: 'anywhere',
                      fontSize: '0.85rem',
                      lineHeight: 1.55,
                      color: 'var(--text-primary)',
                      fontFamily: "'JetBrains Mono', monospace",
                    }}
                  >
                    {formatValue(value)}
                  </pre>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
