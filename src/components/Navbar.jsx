import { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import './Navbar.css';

export default function Navbar() {
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handler);
    return () => document.removeEventListener('fullscreenchange', handler);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  return (
    <nav className="navbar">
      <div className="navbar-brand">
        <span className="navbar-logo">🏏</span>
        <span className="navbar-title">Star Champions League</span>
      </div>
      <div className="navbar-links">
        <NavLink to="/" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
          <span className="nav-icon">⚡</span> Auction
        </NavLink>
        <NavLink to="/teams" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
          <span className="nav-icon">🛡️</span> Team Details
        </NavLink>
        <button className="nav-fullscreen-btn" onClick={toggleFullscreen} title={isFullscreen ? 'Exit Fullscreen (ESC)' : 'Fullscreen'}>
          {isFullscreen ? '⊠' : '⛶'}
        </button>
      </div>
    </nav>
  );
}
