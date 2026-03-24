import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { getShared } from '../services/api';
import FlowchartView from '../components/FlowchartView';
import RoastResult from '../components/RoastResult';
import { Code2, Loader2, AlertCircle, Copy, Check, Clock, MemoryStick } from 'lucide-react';

/**
 * Share Page
 * Public page displaying a shared analysis including code, explanation,
 * flowchart, complexity, and roast feedback.
 */
export default function Share() {
  const { shareId } = useParams();
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [copiedCode, setCopiedCode] = useState(false);

  useEffect(() => {
    const fetchAnalysis = async () => {
      try {
        const res = await getShared(shareId);
        setAnalysis(res.data);
      } catch (err) {
        setError(err.response?.data?.message || 'Analysis not found');
      } finally {
        setLoading(false);
      }
    };

    fetchAnalysis();
  }, [shareId]);

  const copyCode = () => {
    if (analysis?.code) {
      navigator.clipboard.writeText(analysis.code);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    }
  };

  if (loading) {
    return (
      <div style={{ minHeight: 'calc(100vh - 64px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <Loader2 size={40} className="animate-spin" style={{ color: 'var(--accent-primary)' }} />
          <p style={{ marginTop: '1rem', color: 'var(--text-secondary)' }}>Loading shared analysis...</p>
        </div>
      </div>
    );
  }

  if (error || !analysis) {
    return (
      <div style={{ minHeight: 'calc(100vh - 64px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="card" style={{ textAlign: 'center', maxWidth: '400px', padding: '3rem' }}>
          <AlertCircle size={48} style={{ color: '#ef4444', marginBottom: '1rem' }} />
          <h2 style={{ fontSize: '1.3rem', fontWeight: 700, marginBottom: '0.5rem' }}>Not Found</h2>
          <p style={{ color: 'var(--text-secondary)' }}>{error || 'This shared analysis does not exist.'}</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: 'calc(100vh - 64px)' }}>
      <div className="container" style={{ padding: '2rem 1.5rem', maxWidth: '900px' }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '2rem',
          flexWrap: 'wrap',
          gap: '0.5rem',
        }}>
          <div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Code2 size={24} className="gradient-text" /> Shared Analysis
            </h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '0.25rem' }}>
              Language: <strong>{analysis.language}</strong> • Mode: <strong>{analysis.mode || 'explain'}</strong>
            </p>
          </div>
        </div>

        {/* Code Block */}
        <div className="card" style={{
          padding: 0,
          overflow: 'hidden',
          marginBottom: '1.5rem',
        }}>
          <div style={{
            padding: '0.75rem 1rem',
            borderBottom: '1px solid var(--border-color)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>📄 Code</span>
            <button onClick={copyCode} className="btn-icon">
              {copiedCode ? <Check size={14} style={{ color: 'var(--success)' }} /> : <Copy size={14} />}
            </button>
          </div>
          <pre style={{
            padding: '1rem',
            fontSize: '0.85rem',
            fontFamily: "'JetBrains Mono', monospace",
            lineHeight: 1.6,
            overflow: 'auto',
            maxHeight: '400px',
            margin: 0,
            background: 'var(--bg-primary)',
            color: 'var(--text-secondary)',
          }}>
            {analysis.code}
          </pre>
        </div>

        {/* Explanation */}
        {analysis.explanation && (
          <div className="card" style={{ marginBottom: '1.5rem' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem' }}>📝 Explanation</h3>
            <p style={{ color: 'var(--text-secondary)', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
              {analysis.explanation}
            </p>
          </div>
        )}

        {/* Complexity */}
        {(analysis.timeComplexity || analysis.spaceComplexity) && (
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '1rem',
            marginBottom: '1.5rem',
          }}>
            <div className="card">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                <Clock size={16} style={{ color: 'var(--accent-primary)' }} />
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Time</span>
              </div>
              <p style={{ fontWeight: 600, fontSize: '0.9rem' }}>{analysis.timeComplexity}</p>
            </div>
            <div className="card">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                <MemoryStick size={16} style={{ color: 'var(--success)' }} />
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Space</span>
              </div>
              <p style={{ fontWeight: 600, fontSize: '0.9rem' }}>{analysis.spaceComplexity}</p>
            </div>
          </div>
        )}

        {/* Flowchart */}
        {analysis.flowchart && (
          <FlowchartView chart={analysis.flowchart} />
        )}

        {/* Roast Feedback */}
        {analysis.roastFeedback && (
          <RoastResult feedback={analysis.roastFeedback} score={analysis.codeQualityScore} />
        )}

        {/* Interview Questions */}
        {analysis.interviewQuestions && analysis.interviewQuestions.length > 0 && (
          <div className="card" style={{ marginTop: '1.5rem' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem' }}>🎯 Interview Questions</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {analysis.interviewQuestions.map((q, i) => (
                <div key={i} style={{
                  padding: '0.75rem',
                  borderRadius: 'var(--radius-sm)',
                  background: 'var(--bg-primary)',
                  display: 'flex',
                  gap: '0.5rem',
                }}>
                  <span style={{ color: 'var(--accent-primary)', fontWeight: 700, fontSize: '0.85rem' }}>Q{i + 1}.</span>
                  <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{q}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
