import { useState, useEffect } from 'react';
import './Sidebar.css';

const Sidebar = ({ currentPage, onNavigate, onLogout }) => {
  const [isOpen, setIsOpen] = useState(false);

  const menuItems = [
    { id: 'overview', label: 'Overview', icon: '📊' },
    { id: 'my-books', label: 'My Books', icon: '📖' },
    { id: 'royalties', label: 'Royalties', icon: '💰' },
    { id: 'my-tickets', label: 'My Tickets', icon: '🎫' },
    { id: 'contact-support', label: 'Contact Support', icon: '💬' },
  ];

  const handleNavClick = (pageId) => {
    onNavigate(pageId);
    if (window.innerWidth <= 900) {
      setIsOpen(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('userEmail');
    onLogout();
    if (window.innerWidth <= 900) {
      setIsOpen(false);
    }
  };

  const toggleSidebar = () => {
    setIsOpen((prev) => !prev);
  };

  const closeSidebar = () => {
    setIsOpen(false);
  };

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth > 900) {
        setIsOpen(false);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <>
      {/* Mobile / Tablet Toggle Button */}
      <button className="sidebar-toggle" onClick={toggleSidebar}>
        ☰
      </button>

      {/* Overlay for mobile/tablet */}
      <div
        className={`sidebar-overlay ${isOpen ? 'show' : ''}`}
        onClick={closeSidebar}
      ></div>

      <div className={`sidebar ${isOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <h1 className="sidebar-brand">BOOKLEAF</h1>
          <p className="sidebar-label">AUTHOR PORTAL</p>
        </div>

        <nav className="sidebar-nav">
          {menuItems.map((item) => (
            <button
              key={item.id}
              className={`nav-button ${currentPage === item.id ? 'active' : ''}`}
              onClick={() => handleNavClick(item.id)}
            >
              <span className="nav-icon">{item.icon}</span>
              <span className="nav-label">{item.label}</span>
            </button>
          ))}
        </nav>

        <button className="logout" onClick={handleLogout}>
          Log out
        </button>
      </div>
    </>
  );
};

export default Sidebar;