import { useEffect, useRef, useState, useCallback } from 'react';
import mermaid from 'mermaid';
import { toPng, toSvg } from 'html-to-image';
import { Download, Copy, Check } from 'lucide-react';

/**
 * FlowchartView Component
 * Renders a Mermaid.js flowchart from syntax string.
 * Provides export to PNG/SVG functionality.
 */
export default function FlowchartView({ chart }) {
  const containerRef = useRef(null);
  const [copied, setCopied] = useState(false);
  const [rendered, setRendered] = useState(false);

  // Initialize mermaid and render the chart
  useEffect(() => {
    if (!chart || !containerRef.current) return;

    mermaid.initialize({
      startOnLoad: false,
      theme: 'dark',
      themeVariables: {
        primaryColor: '#8b5cf6',
        primaryTextColor: '#e4e4e7',
        primaryBorderColor: '#6366f1',
        lineColor: '#a78bfa',
        secondaryColor: '#1a1a2e',
        tertiaryColor: '#12121a',
        background: '#0a0a0f',
        mainBkg: '#1a1a2e',
        nodeBorder: '#6366f1',
        clusterBkg: '#12121a',
        clusterBorder: '#6366f1',
        titleColor: '#e4e4e7',
        edgeLabelBackground: '#1a1a2e',
      },
      flowchart: {
        htmlLabels: true,
        curve: 'basis',
        padding: 15,
      }
    });

    const renderChart = async () => {
      try {
        containerRef.current.innerHTML = '';
        const id = `flowchart-${Date.now()}`;
        const { svg } = await mermaid.render(id, chart);
        if (containerRef.current) {
          containerRef.current.innerHTML = svg;
          setRendered(true);
        }
      } catch (err) {
        console.error('Mermaid render error:', err);
        if (containerRef.current) {
          containerRef.current.innerHTML = `
            <div style="padding: 1rem; color: var(--text-muted); text-align: center;">
              <p>⚠️ Could not render flowchart</p>
              <pre style="margin-top: 0.5rem; font-size: 0.75rem; text-align: left; overflow-x: auto;">${chart}</pre>
            </div>`;
        }
      }
    };

    renderChart();
  }, [chart]);

  // Export as PNG
  const exportPng = useCallback(async () => {
    if (!containerRef.current) return;
    try {
      const dataUrl = await toPng(containerRef.current, {
        backgroundColor: '#0a0a0f',
        pixelRatio: 2,
      });
      const link = document.createElement('a');
      link.download = 'flowchart.png';
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('PNG export error:', err);
    }
  }, []);

  // Export as SVG
  const exportSvg = useCallback(async () => {
    if (!containerRef.current) return;
    try {
      const dataUrl = await toSvg(containerRef.current, {
        backgroundColor: '#0a0a0f',
      });
      const link = document.createElement('a');
      link.download = 'flowchart.svg';
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('SVG export error:', err);
    }
  }, []);

  // Copy flowchart syntax
  const copySyntax = () => {
    navigator.clipboard.writeText(chart);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!chart) return null;

  return (
    <div className="card" style={{ marginTop: '1rem' }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '1rem',
      }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)' }}>
          📊 Flowchart
        </h3>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button onClick={copySyntax} className="btn-icon" title="Copy Mermaid syntax">
            {copied ? <Check size={16} style={{ color: 'var(--success)' }} /> : <Copy size={16} />}
          </button>
          {rendered && (
            <>
              <button onClick={exportPng} className="btn-secondary" style={{ fontSize: '0.75rem', padding: '0.4rem 0.75rem' }}>
                <Download size={14} /> PNG
              </button>
              <button onClick={exportSvg} className="btn-secondary" style={{ fontSize: '0.75rem', padding: '0.4rem 0.75rem' }}>
                <Download size={14} /> SVG
              </button>
            </>
          )}
        </div>
      </div>

      <div
        ref={containerRef}
        style={{
          background: 'var(--bg-primary)',
          borderRadius: 'var(--radius-md)',
          padding: '1.5rem',
          overflow: 'auto',
          minHeight: '200px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      />
    </div>
  );
}
