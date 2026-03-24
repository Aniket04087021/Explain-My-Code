import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Code2, Zap, Brain, GitBranch, Flame, Play, Github, Share2,
  Globe, ChevronRight, ArrowRight, Sparkles, Shield, Clock, CheckCircle2
} from 'lucide-react';

/**
 * Landing Page
 * Modern SaaS landing page with hero, features, how it works,
 * pricing, FAQ, and CTA sections.
 */
export default function Landing() {
  const { user } = useAuth();

  return (
    <div className="bg-grid" style={{ minHeight: '100vh' }}>
      {/* Hero Section */}
      <section className="bg-gradient-radial" style={{ padding: '6rem 0 4rem' }}>
        <div className="container" style={{ textAlign: 'center', maxWidth: '900px' }}>
          {/* Badge */}
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
            <Sparkles size={14} /> AI-Powered Code Analysis Platform
          </div>

          {/* Headline */}
          <h1 className="animate-fade-in stagger-1" style={{
            fontSize: 'clamp(2.5rem, 5vw, 4rem)',
            fontWeight: 900,
            lineHeight: 1.1,
            marginBottom: '1.5rem',
            letterSpacing: '-0.02em',
          }}>
            Understand Any Code{' '}
            <span className="gradient-text">In Seconds</span>
          </h1>

          {/* Subtitle */}
          <p className="animate-fade-in stagger-2" style={{
            fontSize: '1.2rem',
            color: 'var(--text-secondary)',
            maxWidth: '650px',
            margin: '0 auto 2.5rem',
            lineHeight: 1.6,
          }}>
            Paste your code and get instant AI explanations, flowcharts,
            complexity analysis, interview prep, and brutally honest code reviews.
          </p>

          {/* CTA Buttons */}
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
              {user ? 'Go to Dashboard' : 'Get Started Free'}
              <ArrowRight size={18} />
            </Link>
            <a
              href="#features"
              className="btn-secondary"
              style={{ padding: '0.9rem 2rem', fontSize: '1rem' }}
            >
              See Features
            </a>
          </div>

          {/* Stats Bar */}
          <div className="animate-fade-in stagger-4" style={{
            display: 'flex',
            justifyContent: 'center',
            gap: '3rem',
            marginTop: '4rem',
            flexWrap: 'wrap',
          }}>
            {[
              { value: '5+', label: 'Languages' },
              { value: 'AI', label: 'Powered' },
              { value: '∞', label: 'Analyses' },
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
              Powerful <span className="gradient-text">Features</span>
            </h2>
            <p style={{ color: 'var(--text-secondary)', maxWidth: '500px', margin: '0 auto' }}>
              Everything you need to understand, analyze, and improve your code
            </p>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '1.5rem',
          }}>
            {[
              { icon: <Brain size={24} />, title: 'AI Explanation', desc: 'Get plain English explanations of any code snippet in seconds', color: '#8b5cf6' },
              { icon: <GitBranch size={24} />, title: 'Flowchart Generation', desc: 'Auto-generate visual flowcharts with Mermaid.js, export as PNG/SVG', color: '#6366f1' },
              { icon: <Zap size={24} />, title: 'Complexity Analysis', desc: 'Instant Big O time and space complexity breakdown', color: '#3b82f6' },
              { icon: <Flame size={24} />, title: 'Roast My Code', desc: 'Get brutally honest but funny code reviews with a quality score', color: '#ef4444' },
              { icon: <Play size={24} />, title: 'Execution Simulator', desc: 'Watch your code execute step-by-step with animated visualization', color: '#22c55e' },
              { icon: <Github size={24} />, title: 'GitHub Analyzer', desc: 'Analyze entire GitHub repos for architecture and project insights', color: '#f59e0b' },
              { icon: <Share2 size={24} />, title: 'Code Sharing', desc: 'Generate shareable links for your analyses to share with others', color: '#ec4899' },
              { icon: <Globe size={24} />, title: 'Multi-Language', desc: 'Support for JavaScript, Python, Java, C++, and TypeScript', color: '#14b8a6' },
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

      {/* How It Works Section */}
      <section style={{ padding: '5rem 0', background: 'var(--bg-secondary)' }}>
        <div className="container">
          <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
            <h2 style={{ fontSize: '2.2rem', fontWeight: 800, marginBottom: '1rem' }}>
              How It <span className="gradient-text">Works</span>
            </h2>
            <p style={{ color: 'var(--text-secondary)', maxWidth: '500px', margin: '0 auto' }}>
              Three simple steps to understand any code
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
              { step: '01', title: 'Paste Your Code', desc: 'Drop your code into the Monaco Editor. Auto-detects the programming language.' },
              { step: '02', title: 'Choose Analysis Mode', desc: 'Pick between normal explanation, roast mode, or execution visualization.' },
              { step: '03', title: 'Get Instant Results', desc: 'Receive AI-powered explanation, flowchart, complexity analysis, and more.' },
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

      {/* Pricing Section */}
      <section id="pricing" style={{ padding: '5rem 0' }}>
        <div className="container">
          <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
            <h2 style={{ fontSize: '2.2rem', fontWeight: 800, marginBottom: '1rem' }}>
              Simple <span className="gradient-text">Pricing</span>
            </h2>
            <p style={{ color: 'var(--text-secondary)', maxWidth: '500px', margin: '0 auto' }}>
              Start free, scale as you grow
            </p>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '1.5rem',
            maxWidth: '900px',
            margin: '0 auto',
          }}>
            {/* Free Plan */}
            <div className="glass-card" style={{ padding: '2rem' }}>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Free</div>
              <div style={{ fontSize: '3rem', fontWeight: 800, margin: '0.5rem 0' }}>$0<span style={{ fontSize: '1rem', fontWeight: 400, color: 'var(--text-muted)' }}>/mo</span></div>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>Perfect for getting started</p>
              <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '2rem' }}>
                {['10 analyses per day', '5 languages supported', 'Code explanations', 'Basic flowcharts'].map((f, i) => (
                  <li key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                    <CheckCircle2 size={16} style={{ color: 'var(--success)', flexShrink: 0 }} /> {f}
                  </li>
                ))}
              </ul>
              <Link to="/signup" className="btn-secondary" style={{ width: '100%', justifyContent: 'center' }}>
                Get Started
              </Link>
            </div>

            {/* Pro Plan */}
            <div className="glass-card animate-pulse-glow" style={{
              padding: '2rem',
              border: '1px solid var(--accent-primary)',
              position: 'relative',
              overflow: 'hidden',
            }}>
              <div style={{
                position: 'absolute',
                top: '1rem',
                right: '-2rem',
                background: 'linear-gradient(135deg, var(--gradient-start), var(--gradient-end))',
                color: 'white',
                padding: '0.25rem 2.5rem',
                fontSize: '0.7rem',
                fontWeight: 600,
                transform: 'rotate(45deg)',
              }}>
                POPULAR
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--accent-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Pro</div>
              <div style={{ fontSize: '3rem', fontWeight: 800, margin: '0.5rem 0' }}>$19<span style={{ fontSize: '1rem', fontWeight: 400, color: 'var(--text-muted)' }}>/mo</span></div>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>Best for active developers</p>
              <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '2rem' }}>
                {['Unlimited analyses', 'All languages', 'Roast Mode 🔥', 'Execution simulator', 'GitHub repo analysis', 'Code sharing', 'Priority support'].map((f, i) => (
                  <li key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                    <CheckCircle2 size={16} style={{ color: 'var(--accent-primary)', flexShrink: 0 }} /> {f}
                  </li>
                ))}
              </ul>
              <Link to="/signup" className="btn-primary" style={{ width: '100%', justifyContent: 'center' }}>
                Start Pro Trial
              </Link>
            </div>

            {/* Enterprise Plan */}
            <div className="glass-card" style={{ padding: '2rem' }}>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Enterprise</div>
              <div style={{ fontSize: '3rem', fontWeight: 800, margin: '0.5rem 0' }}>Custom</div>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>For teams and organizations</p>
              <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '2rem' }}>
                {['Everything in Pro', 'Team collaboration', 'Custom AI models', 'API access', 'SSO & SAML', 'Dedicated support'].map((f, i) => (
                  <li key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                    <CheckCircle2 size={16} style={{ color: 'var(--success)', flexShrink: 0 }} /> {f}
                  </li>
                ))}
              </ul>
              <button className="btn-secondary" style={{ width: '100%', justifyContent: 'center' }}>
                Contact Sales
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section style={{ padding: '5rem 0', background: 'var(--bg-secondary)' }}>
        <div className="container" style={{ maxWidth: '700px' }}>
          <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
            <h2 style={{ fontSize: '2.2rem', fontWeight: 800, marginBottom: '1rem' }}>
              Frequently Asked <span className="gradient-text">Questions</span>
            </h2>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {[
              { q: 'What programming languages are supported?', a: 'We currently support JavaScript, Python, Java, C++, and TypeScript. More languages are coming soon.' },
              { q: 'How does the AI analysis work?', a: 'We use advanced LLMs (like Llama3 and CodeLlama) running locally via Ollama to analyze your code. Your code stays private and secure.' },
              { q: 'What is Roast Mode?', a: 'Roast Mode provides humorous but constructive code reviews. Think of it as a senior dev reviewing your code after a long day — honest, funny, and ultimately helpful.' },
              { q: 'Can I share my analysis results?', a: 'Yes! Every analysis generates a unique shareable link that you can send to colleagues, use in documentation, or post for code reviews.' },
              { q: 'Is my code stored securely?', a: 'Yes. All code is processed locally through Ollama and stored encrypted in our database. We never share your code with third parties.' },
              { q: 'Can I analyze GitHub repositories?', a: 'Yes! Paste any public GitHub repository URL and get a complete architecture analysis, language breakdown, and improvement suggestions.' },
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
            Ready to <span className="gradient-text">Understand</span> Your Code?
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem', marginBottom: '2rem' }}>
            Join thousands of developers who use ExplainMyCode AI to learn faster and code better.
          </p>
          <Link
            to={user ? '/dashboard' : '/signup'}
            className="btn-primary"
            style={{ padding: '1rem 2.5rem', fontSize: '1.05rem' }}
          >
            {user ? 'Go to Dashboard' : 'Start For Free'}
            <ArrowRight size={18} />
          </Link>
        </div>
      </section>

      {/* Footer */}
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
            <span>Explain<span className="gradient-text">MyCode</span> AI</span>
          </div>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
            © 2024 ExplainMyCode AI. All rights reserved.
          </div>
        </div>
      </footer>

      {/* FAQ details chevron rotate CSS */}
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
