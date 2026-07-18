import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { 
  Sun, 
  Moon, 
  Wifi, 
  WifiOff, 
  Search, 
  Store,
  Menu
} from 'lucide-react';

export default function Navbar() {
  const { profile } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'light');
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [navSearch, setNavSearch] = useState('');

  // Sync navbar search with billing page query param when navigating away
  useEffect(() => {
    if (location.pathname !== '/billing') {
      setNavSearch('');
    }
  }, [location.pathname]);

  const handleNavSearchKeyDown = (e) => {
    if (e.key === 'Enter' && navSearch.trim()) {
      navigate(`/billing?q=${encodeURIComponent(navSearch.trim())}`);
    }
  };

  // Monitor network status for PWA offline capabilities
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Sync theme to DOM element
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  const headerStyle = {
    height: '64px',
    background: 'var(--bg-card)',
    backdropFilter: 'var(--glass-blur)',
    borderBottom: '1px solid var(--border)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 24px',
    position: 'sticky',
    top: 0,
    zIndex: 9,
    boxShadow: 'var(--shadow-sm)'
  };

  const searchContainerStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    background: 'var(--bg-app)',
    padding: '8px 16px',
    borderRadius: '24px',
    border: '1px solid var(--border)',
    maxWidth: '360px',
    width: '100%',
    transition: 'border-color var(--transition-fast)'
  };

  const actionGroupStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: '16px'
  };

  const roundBtnStyle = {
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: '1px solid var(--border)',
    cursor: 'pointer',
    background: 'var(--bg-card)',
    transition: 'all var(--transition-fast)'
  };

  return (
    <header style={headerStyle} className="no-print">
      {/* Mobile brand logo */}
      <div className="mobile-only-flex" style={{ alignItems: 'center', gap: '8px' }}>
        <div style={{ background: 'var(--primary)', padding: '6px', borderRadius: '8px' }}>
          <Store size={18} color="white" />
        </div>
        <h1 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Retail POS</h1>
      </div>

      {/* Desktop Search Everywhere */}
      <div className="desktop-only" style={searchContainerStyle}>
        <Search size={18} color="var(--text-light)" />
        <input 
          type="text" 
          placeholder="Search menu or scan barcode..." 
          value={navSearch}
          onChange={(e) => setNavSearch(e.target.value)}
          onKeyDown={handleNavSearchKeyDown}
          style={{ width: '100%', fontSize: '0.875rem' }} 
        />
      </div>

      <div style={actionGroupStyle}>
        {/* Connection status */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem' }}>
          {isOnline ? (
            <>
              <Wifi size={16} color="var(--success)" />
              <span className="desktop-only" style={{ color: 'var(--success)', fontWeight: 600 }}>Online</span>
            </>
          ) : (
            <>
              <WifiOff size={16} color="var(--danger)" />
              <span style={{ color: 'var(--danger)', fontWeight: 600 }}>Offline Mode</span>
            </>
          )}
        </div>

        {/* Theme Toggle Button */}
        <button 
          onClick={toggleTheme} 
          style={roundBtnStyle}
          onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--text-light)'}
          onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--border)'}
          title={`Switch to ${theme === 'light' ? 'Dark' : 'Light'} Mode`}
        >
          {theme === 'light' ? (
            <Moon size={18} color="var(--text-primary)" />
          ) : (
            <Sun size={18} color="var(--warning)" />
          )}
        </button>

        {/* Profile indicator for Mobile */}
        <div className="mobile-only-flex" style={{
          width: '32px',
          height: '32px',
          borderRadius: '50%',
          background: 'var(--primary-light)',
          color: 'var(--primary)',
          alignItems: 'center',
          justifyContent: 'center',
          fontWeight: 'bold',
          fontSize: '0.8rem'
        }}>
          {profile?.name ? profile.name[0].toUpperCase() : 'U'}
        </div>
      </div>
    </header>
  );
}
