import { Flame, AlertTriangle, ThumbsUp, ThumbsDown } from 'lucide-react';

/**
 * RoastResult Component
 * Displays roast feedback with fire styling, quality score gauge, and issue list.
 */
export default function RoastResult({ feedback, score }) {
  if (!feedback) return null;

  // Determine score color based on value
  const getScoreColor = (s) => {
    if (s >= 8) return '#22c55e';
    if (s >= 5) return '#f59e0b';
    return '#ef4444';
  };

  const getScoreLabel = (s) => {
    if (s >= 8) return 'Solid Code 👍';
    if (s >= 6) return 'Decent, But... 🤷';
    if (s >= 4) return 'Needs Work 🔧';
    return 'Ouch... 🔥';
  };

  const scoreColor = getScoreColor(score);

  return (
    <div className="card" style={{
      marginTop: '1rem',
      borderColor: 'rgba(239, 68, 68, 0.2)',
      background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.05), rgba(249, 115, 22, 0.05))',
    }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: '1rem',
        flexWrap: 'wrap',
        gap: '1rem',
      }}>
        {/* Header */}
        <div>
          <h3 style={{
            fontSize: '1.1rem',
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            color: '#ef4444',
          }}>
            <Flame size={20} /> Roast Mode
          </h3>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
            Brutally honest code review
          </p>
        </div>

        {/* Score Gauge */}
        <div style={{ textAlign: 'center' }}>
          <div className="quality-gauge" style={{
            background: `conic-gradient(${scoreColor} ${score * 36}deg, var(--bg-tertiary) ${score * 36}deg)`,
          }}>
            <div style={{
              width: '90px',
              height: '90px',
              borderRadius: '50%',
              background: 'var(--bg-secondary)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <span className="score" style={{
                fontSize: '1.5rem',
                fontWeight: 800,
                color: scoreColor,
              }}>
                {score}
              </span>
              <span style={{ fontSize: '0.6rem', color: 'var(--text-muted)' }}>/10</span>
            </div>
          </div>
          <div style={{
            marginTop: '0.5rem',
            fontSize: '0.75rem',
            fontWeight: 600,
            color: scoreColor,
          }}>
            {getScoreLabel(score)}
          </div>
        </div>
      </div>

      {/* Feedback Content */}
      <div style={{
        fontSize: '0.9rem',
        lineHeight: 1.7,
        color: 'var(--text-secondary)',
        whiteSpace: 'pre-wrap',
      }}>
        {feedback.split('\n').map((line, i) => (
          <p key={i} style={{
            marginBottom: line.startsWith('-') || line.startsWith('*') ? '0.3rem' : '0.6rem',
            paddingLeft: line.startsWith('-') || line.startsWith('*') ? '1rem' : 0,
          }}>
            {line.includes('**') ? (
              <span dangerouslySetInnerHTML={{
                __html: line.replace(/\*\*(.*?)\*\*/g, '<strong style="color: var(--text-primary)">$1</strong>')
              }} />
            ) : (
              line
            )}
          </p>
        ))}
      </div>
    </div>
  );
}
