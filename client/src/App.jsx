
import { useState, useEffect, useCallback } from 'react';
import './App.css';

import Sidebar from './components/Sidebar';
import Topbar from './components/Topbar';
import Overview from './pages/Overview';
import Books from './pages/Books';
import Royalties from './pages/Royalties';
import MyTickets from './pages/MyTickets';
import ContactSupport from './pages/ContactSupport';
import AdminDashboard from './admin/AdminDashboard';

const API = 'http://localhost:5000/api';

const PAGE_ALIASES = {
  dashboard: 'overview',
  overview: 'overview',
  books: 'my-books',
  'my-books': 'my-books',
  tickets: 'my-tickets',
  'my-tickets': 'my-tickets',
  'new-ticket': 'contact-support',
  'contact-support': 'contact-support',
  royalties: 'royalties',
};

const PAGE_TITLES = {
  overview: 'Dashboard',
  'my-books': 'My Books',
  royalties: 'Royalties',
  'my-tickets': 'My Tickets',
  'contact-support': 'Contact Support',
};

function clearStoredSession() {
  [
    'bookleaf_token',
    'bookleaf_user',
    'role',
    'token',
    'userEmail',
  ].forEach((key) => localStorage.removeItem(key));

  sessionStorage.removeItem('bookleaf_token');
}

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userEmail, setUserEmail] = useState('');
  const [currentPage, setCurrentPage] = useState('overview');
  const [role, setRole] = useState(null);
  const [checkingSession, setCheckingSession] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('bookleaf_token');
    const savedUser = localStorage.getItem('bookleaf_user');
    const savedRole = localStorage.getItem('role');

    if (token && savedUser && ['author', 'admin'].includes(savedRole)) {
      setUserEmail(savedUser);
      setRole(savedRole);
      setIsLoggedIn(true);
    } else {
      clearStoredSession();
    }

    setCheckingSession(false);
  }, []);

  async function handleLogin(email, password, loginRole) {
    const response = await fetch(`${API}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        email: email.trim(),
        password,
      }),
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(
        data.message || data.error || 'Login failed. Check your credentials.'
      );
    }

    if (!data.token) {
      throw new Error('The server did not return an authentication token.');
    }

    const actualRole = data.user?.role || data.role;

    if (!['author', 'admin'].includes(actualRole)) {
      throw new Error('The server returned an unsupported account role.');
    }

    if (actualRole !== loginRole) {
      throw new Error(
        `This account is registered as "${actualRole}". Please choose the correct login type.`
      );
    }

    const savedEmail = data.user?.email || email.trim();

    clearStoredSession();
    localStorage.setItem('bookleaf_token', data.token);
    localStorage.setItem('bookleaf_user', savedEmail);
    localStorage.setItem('role', actualRole);

    setUserEmail(savedEmail);
    setRole(actualRole);
    setCurrentPage('overview');
    setIsLoggedIn(true);
  }

  function handleLogout() {
    clearStoredSession();
    setIsLoggedIn(false);
    setUserEmail('');
    setRole(null);
    setCurrentPage('overview');
  }

  const handleNavigate = useCallback((pageId) => {
    const normalizedPage = PAGE_ALIASES[pageId];

    if (normalizedPage) {
      setCurrentPage(normalizedPage);
    } else {
      console.warn(`Unknown navigation page: ${pageId}`);
    }
  }, []);

  function handleRefresh() {
    window.location.reload();
  }

  if (checkingSession) {
    return (
      <div className="loading-container" role="status">
        Loading BookLeaf...
      </div>
    );
  }

  if (!isLoggedIn) {
    return <LoginPage onLogin={handleLogin} />;
  }

  // Admin has its own layout. Do not render author navigation here.
  if (role === 'admin') {
    return (
      <div className="admin-app">
        <AdminDashboard logout={handleLogout} />
      </div>
    );
  }

  function renderAuthorPage() {
    switch (currentPage) {
      case 'overview':
        return <Overview onNavigate={handleNavigate} />;
      case 'my-books':
        return <Books />;
      case 'royalties':
        return <Royalties />;
      case 'my-tickets':
        return <MyTickets />;
      case 'contact-support':
        return <ContactSupport />;
      default:
        return <Overview onNavigate={handleNavigate} />;
    }
  }

  return (
    <div className="dashboard">
      <Sidebar
        currentPage={currentPage}
        onNavigate={handleNavigate}
        userEmail={userEmail}
        onLogout={handleLogout}
      />

      <main className="main-content">
        <div className="main-shell">
          <Topbar
            pageTitle={PAGE_TITLES[currentPage] || 'Dashboard'}
            eyebrow="AUTHOR WORKSPACE"
            userEmail={userEmail}
            onRefresh={handleRefresh}
          />

          <div className="overview-stack">{renderAuthorPage()}</div>
        </div>
      </main>
    </div>
  );
}

function LoginPage({ onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginRole, setLoginRole] = useState('author');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      await onLogin(email, password, loginRole);
    } catch (err) {
      setError(err.message || 'Login failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="auth-login">
      <div className="auth-card">
        <p className="brand">BOOKLEAF</p>

        <h1>{loginRole === 'admin' ? 'Admin Panel' : 'Author Portal'}</h1>
        <p className="subtitle">Sign in to your account</p>

        <form onSubmit={handleSubmit}>
          <label htmlFor="login-email">Email Address</label>
          <input
            id="login-email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="Enter your email"
            autoComplete="username"
            required
          />

          <label htmlFor="login-password">Password</label>
          <input
            id="login-password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Enter your password"
            autoComplete="current-password"
            required
          />

          <label htmlFor="login-role">Login As</label>
          <select
            id="login-role"
            value={loginRole}
            onChange={(event) => setLoginRole(event.target.value)}
          >
            <option value="author">Author</option>
            <option value="admin">Admin</option>
          </select>

          {error && (
            <div className="error" role="alert">
              {error}
            </div>
          )}

          <button
            type="submit"
            className={
              loginRole === 'admin'
                ? 'auth-submit-admin'
                : 'auth-submit-author'
            }
            disabled={submitting}
          >
            {submitting ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <p className="footer">
          Sign in using an account already created in your database.
        </p>
      </div>
    </div>
  );
}

export default App;
