import { useState } from 'react';
import { analyzeGithub } from '../services/api';
import { Github, Loader2, ExternalLink, Star, GitFork, FileCode } from 'lucide-react';

/**
 * GitHubAnalyzer Component
 * Form for GitHub URL input that triggers repository analysis.
 * Displays architecture analysis, language breakdown, and suggestions.
 */
export default function GitHubAnalyzer() {
  const [repoUrl, setRepoUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const handleAnalyze = async (e) => {
    e.preventDefault();
    if (!repoUrl.trim()) return;

    setLoading(true);
    setError('');
    setResult(null);

    try {
      const res = await analyzeGithub(repoUrl.trim());
      setResult(res.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to analyze repository');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card" style={{ marginTop: '1rem' }}>
      <h3 style={{
        fontSize: '1rem',
        fontWeight: 600,
        color: 'var(--text-primary)',
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        marginBottom: '1rem',
      }}>
        <Github size={18} /> GitHub Repository Analyzer
      </h3>

      <form onSubmit={handleAnalyze} style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
        <input
          type="text"
          value={repoUrl}
          onChange={(e) => setRepoUrl(e.target.value)}
          placeholder="https://github.com/owner/repo"
          className="input"
          style={{ flex: 1 }}
        />
        <button
          type="submit"
          className="btn-primary"
          disabled={loading || !repoUrl.trim()}
          style={{ whiteSpace: 'nowrap' }}
        >
          {loading ? <><Loader2 size={16} className="animate-spin" /> Analyzing...</> : 'Analyze'}
        </button>
      </form>

      {error && (
        <div style={{
          padding: '0.75rem',
          borderRadius: 'var(--radius-sm)',
          background: 'rgba(239, 68, 68, 0.1)',
          border: '1px solid rgba(239, 68, 68, 0.2)',
          color: '#ef4444',
          fontSize: '0.85rem',
        }}>
          {error}
        </div>
      )}

      {result && (
        <div style={{ marginTop: '0.5rem' }}>
          {/* Repo Stats */}
          <div style={{
            display: 'flex',
            gap: '1rem',
            flexWrap: 'wrap',
            marginBottom: '1rem',
          }}>
            {result.repoData && (
              <>
                <div className="glass-card" style={{ padding: '0.75rem 1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Star size={16} style={{ color: '#f59e0b' }} />
                  <span style={{ fontWeight: 600 }}>{result.repoData.stars}</span>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>stars</span>
                </div>
                <div className="glass-card" style={{ padding: '0.75rem 1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <GitFork size={16} style={{ color: 'var(--accent-primary)' }} />
                  <span style={{ fontWeight: 600 }}>{result.repoData.forks}</span>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>forks</span>
                </div>
                <div className="glass-card" style={{ padding: '0.75rem 1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <FileCode size={16} style={{ color: 'var(--success)' }} />
                  <span style={{ fontWeight: 600 }}>{result.repoData.fileCount}+</span>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>files</span>
                </div>
              </>
            )}
          </div>

          {/* Analysis Grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '0.75rem',
            marginBottom: '1rem',
          }}>
            <div style={{
              padding: '1rem',
              background: 'var(--bg-tertiary)',
              borderRadius: 'var(--radius-sm)',
            }}>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Project Type</div>
              <div style={{ fontWeight: 600, marginTop: '0.25rem' }}>{result.projectType}</div>
            </div>
            <div style={{
              padding: '1rem',
              background: 'var(--bg-tertiary)',
              borderRadius: 'var(--radius-sm)',
            }}>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Architecture</div>
              <div style={{ fontWeight: 600, marginTop: '0.25rem' }}>{result.architecture}</div>
            </div>
            <div style={{
              padding: '1rem',
              background: 'var(--bg-tertiary)',
              borderRadius: 'var(--radius-sm)',
            }}>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Languages</div>
              <div style={{ fontWeight: 600, marginTop: '0.25rem' }}>{result.languages}</div>
            </div>
          </div>

          {/* Full Analysis */}
          {result.analysis && (
            <div style={{
              padding: '1rem',
              background: 'var(--bg-primary)',
              borderRadius: 'var(--radius-sm)',
              fontSize: '0.85rem',
              lineHeight: 1.7,
              color: 'var(--text-secondary)',
              whiteSpace: 'pre-wrap',
            }}>
              {result.analysis.split('\n').map((line, i) => (
                <p key={i} style={{
                  marginBottom: '0.3rem',
                  fontWeight: line.startsWith('#') ? 600 : 400,
                  color: line.startsWith('#') ? 'var(--text-primary)' : 'var(--text-secondary)',
                  fontSize: line.startsWith('#') ? '1rem' : '0.85rem',
                }}>
                  {line.replace(/^#+\s*/, '')}
                </p>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
