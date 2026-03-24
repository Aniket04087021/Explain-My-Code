import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getHistory } from '../services/api';
import { Clock, Code2, Brain, Flame, ExternalLink, Loader2, Inbox } from 'lucide-react';

/**
 * History Page
 * Displays a list of the user's past code analyses.
 * Each entry shows language, mode, timestamp, and a link to the shared version.
 */
export default function History() {
  const [analyses, setAnalyses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      const res = await getHistory();
      setAnalyses(res.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch history');
    } finally {
      setLoading(false);
    }
  };

  // Format date for display
  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now - date;
    const mins = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  // Truncate code for preview
  const truncateCode = (code, maxLength = 100) => {
    if (!code) return '';
    const cleaned = code.replace(/\n/g, ' ').trim();
    return cleaned.length > maxLength ? cleaned.substring(0, maxLength) + '...' : cleaned;
  };

  const langColors = {
    javascript: '#f7df1e',
    python: '#3776ab',
    java: '#ed8b00',
    cpp: '#00599c',
    typescript: '#3178c6',
  };

  if (loading) {
    return (
      <div style={{ minHeight: 'calc(100vh - 64px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <Loader2 size={40} className="animate-spin" style={{ color: 'var(--accent-primary)' }} />
          <p style={{ marginTop: '1rem', color: 'var(--text-secondary)' }}>Loading history...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: 'calc(100vh - 64px)' }}>
      <div className="container" style={{ padding: '2rem 1.5rem', maxWidth: '900px' }}>
        {/* Header */}
        <div style={{ marginBottom: '2rem' }}>
          <h1 style={{ fontSize: '1.8rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Clock size={24} className="gradient-text" /> Analysis History
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '0.5rem' }}>
            {analyses.length} {analyses.length === 1 ? 'analysis' : 'analyses'} saved
          </p>
        </div>

        {error && (
          <div style={{
            padding: '1rem',
            borderRadius: 'var(--radius-md)',
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.2)',
            color: '#ef4444',
            marginBottom: '1.5rem',
          }}>
            {error}
          </div>
        )}

        {/* Empty State */}
        {analyses.length === 0 && !error && (
          <div className="card" style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '4rem 2rem',
            textAlign: 'center',
          }}>
            <div style={{
              width: 80,
              height: 80,
              borderRadius: '50%',
              background: 'rgba(139, 92, 246, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '1.5rem',
            }}>
              <Inbox size={36} style={{ color: 'var(--accent-primary)' }} />
            </div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '0.5rem' }}>No analyses yet</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
              Go to the dashboard and analyze some code to see your history here.
            </p>
            <Link to="/dashboard" className="btn-primary">Go to Dashboard</Link>
          </div>
        )}

        {/* History List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {analyses.map((analysis) => (
            <div
              key={analysis._id}
              className="glass-card"
              style={{ padding: '1.25rem 1.5rem', cursor: 'default' }}
            >
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                gap: '1rem',
                flexWrap: 'wrap',
              }}>
                {/* Left: Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                    {/* Language Badge */}
                    <span style={{
                      padding: '0.2rem 0.5rem',
                      borderRadius: '999px',
                      fontSize: '0.7rem',
                      fontWeight: 600,
                      background: `${langColors[analysis.language] || '#666'}20`,
                      color: langColors[analysis.language] || '#999',
                      border: `1px solid ${langColors[analysis.language] || '#666'}40`,
                    }}>
                      {analysis.language}
                    </span>

                    {/* Mode Badge */}
                    <span style={{
                      padding: '0.2rem 0.5rem',
                      borderRadius: '999px',
                      fontSize: '0.7rem',
                      fontWeight: 600,
                      background: analysis.mode === 'roast' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(139, 92, 246, 0.1)',
                      color: analysis.mode === 'roast' ? '#ef4444' : 'var(--accent-primary)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.25rem',
                    }}>
                      {analysis.mode === 'roast' ? <Flame size={10} /> : <Brain size={10} />}
                      {analysis.mode === 'roast' ? 'Roast' : 'Explain'}
                    </span>

                    {/* Quality Score */}
                    {analysis.codeQualityScore > 0 && (
                      <span style={{
                        fontSize: '0.7rem',
                        fontWeight: 600,
                        color: analysis.codeQualityScore >= 7 ? 'var(--success)' : analysis.codeQualityScore >= 4 ? '#f59e0b' : '#ef4444',
                      }}>
                        {analysis.codeQualityScore}/10
                      </span>
                    )}
                  </div>

                  {/* Code Preview */}
                  <div style={{
                    fontSize: '0.8rem',
                    fontFamily: "'JetBrains Mono', monospace",
                    color: 'var(--text-muted)',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}>
                    {truncateCode(analysis.code)}
                  </div>
                </div>

                {/* Right: Timestamp + Link */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexShrink: 0 }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    {formatDate(analysis.createdAt)}
                  </span>
                  {analysis.shareId && (
                    <Link
                      to={`/share/${analysis.shareId}`}
                      className="btn-icon"
                      title="View shared analysis"
                    >
                      <ExternalLink size={14} />
                    </Link>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
