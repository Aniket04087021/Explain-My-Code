import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Code2, Moon, Sun, Menu, X, LogOut, History, LayoutDashboard } from 'lucide-react';

/**
 * Navbar Component
 * Top navigation bar with logo, nav links, dark mode toggle, and auth controls.
 * Responsive with a mobile hamburger menu.
 */
export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [darkMode, setDarkMode] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);

  // Initialize theme from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('theme');
    if (saved === 'light') {
      setDarkMode(false);
      document.documentElement.setAttribute('data-theme', 'light');
    }
  }, []);

  const toggleTheme = () => {
    const newMode = !darkMode;
    setDarkMode(newMode);
    document.documentElement.setAttribute('data-theme', newMode ? 'dark' : 'light');
    localStorage.setItem('theme', newMode ? 'dark' : 'light');
  };

  const handleLogout = () => {
    logout();
    navigate('/');
    setMobileOpen(false);
  };

  const isActive = (path) => location.pathname === path;

  return (
    <nav style={{
      position: 'sticky',
      top: 0,
      zIndex: 50,
      background: 'var(--bg-glass)',
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
      borderBottom: '1px solid var(--border-color)',
    }}>
      <div className="container" style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        height: '64px',
      }}>
        {/* Logo */}
        <Link to="/" style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          textDecoration: 'none',
          color: 'var(--text-primary)',
          fontWeight: 700,
          fontSize: '1.125rem',
        }}>
          <div style={{
            width: 36,
            height: 36,
            borderRadius: 'var(--radius-sm)',
            background: 'linear-gradient(135deg, var(--gradient-start), var(--gradient-end))',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <Code2 size={20} color="white" />
          </div>
          <span>Explain<span className="gradient-text">MyCode</span></span>
        </Link>

        {/* Desktop Nav Links */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
        }} className="desktop-nav">
          {user ? (
            <>
              <Link
                to="/dashboard"
                className={isActive('/dashboard') ? 'btn-primary' : 'btn-secondary'}
                style={{ fontSize: '0.8rem', padding: '0.5rem 1rem' }}
              >
                <LayoutDashboard size={16} /> Dashboard
              </Link>
              <Link
                to="/history"
                className={isActive('/history') ? 'btn-primary' : 'btn-secondary'}
                style={{ fontSize: '0.8rem', padding: '0.5rem 1rem' }}
              >
                <History size={16} /> History
              </Link>
              <button onClick={toggleTheme} className="btn-icon" title="Toggle theme">
                {darkMode ? <Sun size={18} /> : <Moon size={18} />}
              </button>
              <button onClick={handleLogout} className="btn-secondary" style={{ fontSize: '0.8rem', padding: '0.5rem 1rem' }}>
                <LogOut size={16} /> Logout
              </button>
            </>
          ) : (
            <>
              <button onClick={toggleTheme} className="btn-icon" title="Toggle theme">
                {darkMode ? <Sun size={18} /> : <Moon size={18} />}
              </button>
              <Link to="/login" className="btn-secondary" style={{ fontSize: '0.8rem', padding: '0.5rem 1rem' }}>
                Login
              </Link>
              <Link to="/signup" className="btn-primary" style={{ fontSize: '0.8rem', padding: '0.5rem 1rem' }}>
                Get Started
              </Link>
            </>
          )}
        </div>

        {/* Mobile Menu Toggle */}
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="btn-icon mobile-toggle"
          style={{ display: 'none' }}
        >
          {mobileOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* Mobile Menu */}
      {mobileOpen && (
        <div style={{
          padding: '1rem',
          borderTop: '1px solid var(--border-color)',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.5rem',
          background: 'var(--bg-secondary)',
        }}>
          {user ? (
            <>
              <Link to="/dashboard" className="btn-secondary" onClick={() => setMobileOpen(false)} style={{ justifyContent: 'center' }}>
                <LayoutDashboard size={16} /> Dashboard
              </Link>
              <Link to="/history" className="btn-secondary" onClick={() => setMobileOpen(false)} style={{ justifyContent: 'center' }}>
                <History size={16} /> History
              </Link>
              <button onClick={handleLogout} className="btn-danger" style={{ justifyContent: 'center' }}>
                <LogOut size={16} /> Logout
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="btn-secondary" onClick={() => setMobileOpen(false)} style={{ justifyContent: 'center' }}>
                Login
              </Link>
              <Link to="/signup" className="btn-primary" onClick={() => setMobileOpen(false)} style={{ justifyContent: 'center' }}>
                Get Started
              </Link>
            </>
          )}
        </div>
      )}

      {/* Responsive CSS */}
      <style>{`
        @media (max-width: 768px) {
          .desktop-nav { display: none !important; }
          .mobile-toggle { display: inline-flex !important; }
        }
      `}</style>
    </nav>
  );
}
