import { useState } from 'react';
import { Share2, Copy, Check, ExternalLink } from 'lucide-react';

/**
 * CodeShareButton Component
 * Generates and copies a shareable link for the current analysis.
 */
export default function CodeShareButton({ shareId }) {
  const [copied, setCopied] = useState(false);

  if (!shareId) return null;

  const shareUrl = `${window.location.origin}/share/${shareId}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const input = document.createElement('input');
      input.value = shareUrl;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleOpen = () => {
    window.open(shareUrl, '_blank');
  };

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '0.5rem',
      padding: '0.75rem 1rem',
      background: 'var(--bg-tertiary)',
      borderRadius: 'var(--radius-md)',
      marginTop: '1rem',
    }}>
      <Share2 size={16} style={{ color: 'var(--accent-primary)', flexShrink: 0 }} />
      <input
        type="text"
        value={shareUrl}
        readOnly
        className="input"
        style={{
          flex: 1,
          fontSize: '0.8rem',
          padding: '0.4rem 0.75rem',
          fontFamily: "'JetBrains Mono', monospace",
        }}
      />
      <button
        onClick={handleCopy}
        className="btn-secondary"
        style={{ padding: '0.4rem 0.75rem', fontSize: '0.75rem', whiteSpace: 'nowrap' }}
      >
        {copied ? <><Check size={14} style={{ color: 'var(--success)' }} /> Copied!</> : <><Copy size={14} /> Copy</>}
      </button>
      <button
        onClick={handleOpen}
        className="btn-icon"
        style={{ padding: '0.4rem' }}
        title="Open in new tab"
      >
        <ExternalLink size={14} />
      </button>
    </div>
  );
}
