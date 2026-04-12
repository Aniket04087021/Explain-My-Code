import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Code2, Zap, Brain, GitBranch, Flame, Play, Github, Share2,
  Globe, ChevronRight, ArrowRight, Sparkles, Terminal,
} from 'lucide-react';

const SUPPORTED_LANGS = [
  { id: 'javascript', name: 'JavaScript', blurb: 'Explain, trace, and refactor modern JS and Node-style code.', accent: '#f7df1e' },
  { id: 'python', name: 'Python', blurb: 'Step through scripts and data-style snippets with clear narratives.', accent: '#3776ab' },
  { id: 'java', name: 'Java', blurb: 'Classes, methods, and JVM-oriented patterns explained in context.', accent: '#ed8b00' },
  { id: 'cpp', name: 'C++', blurb: 'STL-style and classic C++: complexity, flow, and structure.', accent: '#00599c' },
  { id: 'c', name: 'C', blurb: 'Procedural C: pointers, structs, and control flow made readable.', accent: '#a8b9cc' },
];

/**
 * Landing Page
 * Product-focused page for developers: hero, features, languages, workflow, FAQ, CTA.
 */
export default function Landing() {
  const { user } = useAuth();

  return (
    <div className="bg-grid" style={{ minHeight: '100vh' }}>
      {/* Hero Section */}
      <section className="bg-gradient-radial" style={{ padding: '6rem 0 4rem' }}>
        <div className="container" style={{ textAlign: 'center', maxWidth: '920px' }}>
          <div className="animate-fade-in" style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.4rem 1rem',
            borderRadius: '999px',
            background: 'rgba(139, 92, 246, 0.1)',
            border: '1px solid rgba(139, 92, 246, 0.2)',
            fontSize: '0.8rem',
            color: 'var(--accent-tertiary)',
            marginBottom: '2rem',
          }}>
            <Terminal size={14} /> Software development companion
          </div>

          <h1 className="animate-fade-in stagger-1" style={{
            fontSize: 'clamp(2.5rem, 5vw, 3.75rem)',
            fontWeight: 900,
            lineHeight: 1.12,
            marginBottom: '1.5rem',
            letterSpacing: '-0.02em',
          }}>
            Ship better code{' '}
            <span className="gradient-text">with clarity</span>
          </h1>

          <p className="animate-fade-in stagger-2" style={{
            fontSize: '1.15rem',
            color: 'var(--text-secondary)',
            maxWidth: '640px',
            margin: '0 auto 2.5rem',
            lineHeight: 1.65,
          }}>
            ExplainMyCode helps you read, debug, and review real production snippets across
            JavaScript, Python, Java, C, and C++. Get AI explanations, flowcharts, complexity notes,
            execution-style traces, and honest reviews—without leaving your workflow.
          </p>

          <div className="animate-fade-in stagger-3" style={{
            display: 'flex',
            justifyContent: 'center',
            gap: '1rem',
            flexWrap: 'wrap',
          }}>
            <Link
              to={user ? '/dashboard' : '/signup'}
              className="btn-primary"
              style={{ padding: '0.9rem 2rem', fontSize: '1rem' }}
            >
              {user ? 'Open workspace' : 'Start analyzing code'}
              <ArrowRight size={18} />
            </Link>
            <a
              href="#languages"
              className="btn-secondary"
              style={{ padding: '0.9rem 2rem', fontSize: '1rem' }}
            >
              Supported languages
            </a>
          </div>

          <div className="animate-fade-in stagger-4" style={{
            display: 'flex',
            justifyContent: 'center',
            gap: '3rem',
            marginTop: '3.5rem',
            flexWrap: 'wrap',
          }}>
            {[
              { value: '5', label: 'Core languages' },
              { value: 'AI', label: 'Local / private' },
              { value: '1 flow', label: 'Editor to insight' },
            ].map((stat, i) => (
              <div key={i} style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '1.8rem', fontWeight: 800 }} className="gradient-text">{stat.value}</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" style={{ padding: '5rem 0' }}>
        <div className="container">
          <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
            <h2 style={{ fontSize: '2.2rem', fontWeight: 800, marginBottom: '1rem' }}>
              Built for <span className="gradient-text">daily development</span>
            </h2>
            <p style={{ color: 'var(--text-secondary)', maxWidth: '520px', margin: '0 auto' }}>
              From onboarding on a legacy module to prepping for a review—the same toolkit in one place.
            </p>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '1.5rem',
          }}>
            {[
              { icon: <Brain size={24} />, title: 'Deep explanations', desc: 'Plain-language breakdowns of what each part of the code is doing and why it matters.', color: '#8b5cf6' },
              { icon: <GitBranch size={24} />, title: 'Flowcharts', desc: 'Mermaid diagrams you can export—handy for docs, PRs, and design discussions.', color: '#6366f1' },
              { icon: <Zap size={24} />, title: 'Complexity', desc: 'Time and space complexity callouts so you can spot hot paths early.', color: '#3b82f6' },
              { icon: <Flame size={24} />, title: 'Roast mode', desc: 'A blunt, good-humored review when you want feedback that cuts through politeness.', color: '#ef4444' },
              { icon: <Play size={24} />, title: 'Execution traces', desc: 'Step-through style visualization: strong for JS/TS/Python; guided timeline for Java, C, and C++.', color: '#22c55e' },
              { icon: <Github size={24} />, title: 'GitHub perspective', desc: 'Paste a public repo URL for a quick architecture and language snapshot.', color: '#f59e0b' },
              { icon: <Share2 size={24} />, title: 'Shareable analyses', desc: 'Link results to teammates without re-pasting the whole snippet.', color: '#ec4899' },
              { icon: <Globe size={24} />, title: 'JavaScript · Python · Java · C · C++', desc: 'First-class support across these five stacks in the editor and API. TypeScript is supported where noted in the app.', color: '#14b8a6' },
            ].map((feature, i) => (
              <div
                key={i}
                className="glass-card"
                style={{
                  padding: '2rem',
                  opacity: 0,
                  animation: `fadeInUp 0.6s ease-out forwards`,
                  animationDelay: `${i * 0.1}s`,
                }}
              >
                <div style={{
                  width: 48,
                  height: 48,
                  borderRadius: 'var(--radius-md)',
                  background: `${feature.color}15`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: feature.color,
                  marginBottom: '1rem',
                }}>
                  {feature.icon}
                </div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '0.5rem' }}>
                  {feature.title}
                </h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.5 }}>
                  {feature.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Languages Section */}
      <section id="languages" style={{ padding: '5rem 0', background: 'var(--bg-secondary)' }}>
        <div className="container">
          <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
            <h2 style={{ fontSize: '2.2rem', fontWeight: 800, marginBottom: '1rem' }}>
              Languages that <span className="gradient-text">work end-to-end</span>
            </h2>
            <p style={{ color: 'var(--text-secondary)', maxWidth: '560px', margin: '0 auto' }}>
              Pick a language in the editor for correct highlighting and analysis. Java, C, and C++ use a structured execution timeline when the sandboxed simulator does not apply.
            </p>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
            gap: '1.25rem',
            maxWidth: '1000px',
            margin: '0 auto',
          }}>
            {SUPPORTED_LANGS.map((lang) => (
              <div
                key={lang.id}
                className="glass-card"
                style={{
                  padding: '1.5rem 1.75rem',
                  borderLeft: `4px solid ${lang.accent}`,
                }}
              >
                <div style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '0.5rem' }}>
                  {lang.name}
                </div>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.55, margin: 0 }}>
                  {lang.blurb}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section style={{ padding: '5rem 0' }}>
        <div className="container">
          <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
            <h2 style={{ fontSize: '2.2rem', fontWeight: 800, marginBottom: '1rem' }}>
              How it <span className="gradient-text">fits your workflow</span>
            </h2>
            <p style={{ color: 'var(--text-secondary)', maxWidth: '500px', margin: '0 auto' }}>
              Three steps from raw code to something you can act on
            </p>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
            gap: '2rem',
            maxWidth: '900px',
            margin: '0 auto',
          }}>
            {[
              { step: '01', title: 'Paste or write code', desc: 'Use the Monaco editor with syntax highlighting. Language auto-detection keeps the right mode selected.' },
              { step: '02', title: 'Choose how you want insight', desc: 'Explain, roast, flowchart, complexity, execution view, or GitHub repo analysis.' },
              { step: '03', title: 'Use the output', desc: 'Copy explanations, export diagrams, share links, or step through execution for debugging and learning.' },
            ].map((item, i) => (
              <div key={i} style={{
                textAlign: 'center',
                padding: '2rem',
                position: 'relative',
              }}>
                <div style={{
                  fontSize: '4rem',
                  fontWeight: 900,
                  opacity: 0.1,
                  position: 'absolute',
                  top: '0.5rem',
                  left: '50%',
                  transform: 'translateX(-50%)',
                }} className="gradient-text">
                  {item.step}
                </div>
                <div style={{
                  width: 56,
                  height: 56,
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, var(--gradient-start), var(--gradient-end))',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 1.5rem',
                  fontSize: '1.2rem',
                  fontWeight: 700,
                  color: 'white',
                }}>
                  {item.step}
                </div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '0.5rem' }}>{item.title}</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section style={{ padding: '5rem 0', background: 'var(--bg-secondary)' }}>
        <div className="container" style={{ maxWidth: '700px' }}>
          <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
            <h2 style={{ fontSize: '2.2rem', fontWeight: 800, marginBottom: '1rem' }}>
              Frequently asked <span className="gradient-text">questions</span>
            </h2>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {[
              { q: 'Which programming languages are supported?', a: 'JavaScript, Python, Java, C, and C++ are fully supported for analysis, history, and sharing. TypeScript is available in the editor where the app exposes it. Execution simulation is deepest for JavaScript/TypeScript and Python; Java, C, and C++ use a line-by-line execution timeline suited for learning and review.' },
              { q: 'How does the AI analysis work?', a: 'We use large language models (for example Llama and CodeLlama) via Ollama when configured. Your snippets are analyzed in that environment; configure the stack to keep processing on infrastructure you trust.' },
              { q: 'What is roast mode?', a: 'Roast mode is a humorous but constructive code review tone—useful when you want sharp feedback without a formal review meeting.' },
              { q: 'Can I share results?', a: 'Yes. Analyses can get a shareable link so collaborators see the same explanation and metadata without resending the raw code.' },
              { q: 'Can I analyze a GitHub repository?', a: 'Yes. Paste a public repository URL to get a quick read on structure, languages, and suggested improvements.' },
            ].map((faq, i) => (
              <details
                key={i}
                className="glass-card"
                style={{
                  padding: '1.25rem 1.5rem',
                  cursor: 'pointer',
                }}
              >
                <summary style={{
                  fontWeight: 600,
                  fontSize: '0.95rem',
                  listStyle: 'none',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}>
                  {faq.q}
                  <ChevronRight size={18} style={{ flexShrink: 0, color: 'var(--text-muted)' }} />
                </summary>
                <p style={{
                  marginTop: '0.75rem',
                  color: 'var(--text-secondary)',
                  fontSize: '0.9rem',
                  lineHeight: 1.6,
                }}>
                  {faq.a}
                </p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section style={{ padding: '5rem 0' }}>
        <div className="container" style={{ textAlign: 'center', maxWidth: '700px' }}>
          <h2 style={{ fontSize: '2.5rem', fontWeight: 800, marginBottom: '1rem' }}>
            Ready to <span className="gradient-text">read code faster</span>?
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '1.05rem', marginBottom: '2rem', lineHeight: 1.6 }}>
            Use ExplainMyCode as part of your software development toolkit—whether you are learning a stack or maintaining one.
          </p>
          <Link
            to={user ? '/dashboard' : '/signup'}
            className="btn-primary"
            style={{ padding: '1rem 2.5rem', fontSize: '1.05rem' }}
          >
            {user ? 'Go to workspace' : 'Get started'}
            <ArrowRight size={18} />
          </Link>
        </div>
      </section>

      <footer style={{
        padding: '2rem 0',
        borderTop: '1px solid var(--border-color)',
      }}>
        <div className="container" style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600 }}>
            <Code2 size={18} className="gradient-text" />
            <span>Explain<span className="gradient-text">MyCode</span></span>
          </div>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
            © 2026 ExplainMyCode. All rights reserved.
          </div>
        </div>
      </footer>

      <style>{`
        details[open] summary svg:last-child {
          transform: rotate(90deg);
          transition: transform 0.2s ease;
        }
        details summary svg:last-child {
          transition: transform 0.2s ease;
        }
        details summary::-webkit-details-marker { display: none; }
      `}</style>
    </div>
  );
}
