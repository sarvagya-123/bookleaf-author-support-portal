
import { useState, useCallback } from 'react';
import './App.css';

import { API_BASE_URL } from './api';
import Landing from './Landing';
import Sidebar from './components/Sidebar';
import Topbar from './components/Topbar';
import Overview from './pages/Overview';
import Books from './pages/Books';
import Royalties from './pages/Royalties';
import MyTickets from './pages/MyTickets';
import ContactSupport from './pages/ContactSupport';
import AdminDashboard from './admin/AdminDashboard';

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

const DEMO_ACCOUNT_EMAILS = new Set([
  'demo.admin@bookleaf-demo.com',
  'rohit.kapoor@email.com',
]);

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
  const [initialSession] = useState(() => {
    const token = localStorage.getItem('bookleaf_token');
    const savedUser = localStorage.getItem('bookleaf_user');
    const savedRole = localStorage.getItem('role');

    if (token && savedUser && ['author', 'admin'].includes(savedRole)) {
      return { savedUser, savedRole };
    }

    clearStoredSession();
    return null;
  });
  const [isLoggedIn, setIsLoggedIn] = useState(Boolean(initialSession));
  const [userEmail, setUserEmail] = useState(initialSession?.savedUser || '');
  const [currentPage, setCurrentPage] = useState('overview');
  const [role, setRole] = useState(initialSession?.savedRole || null);
  const [authRole, setAuthRole] = useState(null);
  const isDemoAccount = DEMO_ACCOUNT_EMAILS.has(userEmail.toLowerCase());

  async function handleLogin(email, password, loginRole) {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
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

    completeAuthentication(data, email, actualRole);
  }

  async function handleRegister({ email, password, name, inviteCode }, signupRole) {
    const endpoint =
      signupRole === 'admin' ? '/auth/register-admin' : '/auth/register';
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({ email: email.trim(), password, name, inviteCode }),
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(data.message || data.error || 'Account creation failed.');
    }

    if (!data.token) {
      throw new Error('The server did not return an authentication token.');
    }

    completeAuthentication(data, email, signupRole);
  }

  function completeAuthentication(data, email, expectedRole) {
    const actualRole = data.user?.role || data.role;

    if (actualRole !== expectedRole || !data.token) {
      throw new Error('The server returned an invalid account session.');
    }

    const savedEmail = data.user?.email || email.trim();
    clearStoredSession();
    localStorage.setItem('bookleaf_token', data.token);
    localStorage.setItem('bookleaf_user', savedEmail);
    localStorage.setItem('role', actualRole);

    setUserEmail(savedEmail);
    setRole(actualRole);
    setAuthRole(null);
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

  if (!isLoggedIn) {
    if (!authRole) {
      return <Landing onSelect={setAuthRole} />;
    }

    return (
      <PortalAuth
        role={authRole}
        onBack={() => setAuthRole(null)}
        onLogin={handleLogin}
        onRegister={handleRegister}
      />
    );
  }

  // Admin has its own layout. Do not render author navigation here.
  if (role === 'admin') {
    return (
      <div className="admin-app">
        {isDemoAccount && (
          <div className="demo-account-banner" role="status">
            Public demo admin: changes are limited to the demo author’s
            tickets.
          </div>
        )}
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

          {isDemoAccount && (
            <div className="demo-account-banner" role="status">
              Public demo account: you can explore the seeded books and
              royalties, and manage your demo support requests.
            </div>
          )}

          <div className="overview-stack">{renderAuthorPage()}</div>
        </div>
      </main>
    </div>
  );
}

function PortalAuth({ role, onBack, onLogin, onRegister }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [mode, setMode] = useState('login');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const isAdmin = role === 'admin';

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      if (mode === 'register') {
        await onRegister({ email, password, name, inviteCode }, role);
      } else {
        await onLogin(email, password, role);
      }
    } catch (err) {
      setError(err.message || 'Login failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="auth-login">
      <div className="auth-card">
        <button className="auth-back" type="button" onClick={onBack}>
          ← Choose another workspace
        </button>
        <p className="brand">BOOKLEAF</p>

        <h1>{isAdmin ? 'Operations desk' : 'Author workspace'}</h1>
        <p className="subtitle">
          {mode === 'register'
            ? 'Create an account to access your workspace.'
            : 'Sign in to your account.'}
        </p>

        <div className="auth-mode-switch" role="tablist" aria-label="Account access">
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'login'}
            className={mode === 'login' ? 'active' : ''}
            onClick={() => {
              setMode('login');
              setError('');
            }}
          >
            Sign in
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'register'}
            className={mode === 'register' ? 'active' : ''}
            onClick={() => {
              setMode('register');
              setError('');
            }}
          >
            Create account
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          {mode === 'register' && (
            <label htmlFor="register-name">
              Full name
              <input
                id="register-name"
                type="text"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Enter your name"
                autoComplete="name"
                maxLength={120}
                required
              />
            </label>
          )}

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

          {mode === 'register' && isAdmin && (
            <label htmlFor="admin-invite-code">
              Admin invitation code
              <input
                id="admin-invite-code"
                type="password"
                value={inviteCode}
                onChange={(event) => setInviteCode(event.target.value)}
                autoComplete="off"
                required
              />
            </label>
          )}

          <label htmlFor="login-password">Password</label>
          <input
            id="login-password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Enter your password"
            autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
            minLength={mode === 'register' ? 8 : undefined}
            maxLength={128}
            required
          />

          {error && (
            <div className="error" role="alert">
              {error}
            </div>
          )}

          <button
            type="submit"
            className={isAdmin ? 'auth-submit-admin' : 'auth-submit-author'}
            disabled={submitting}
          >
            {submitting
              ? mode === 'register'
                ? 'Creating account...'
                : 'Signing in...'
              : mode === 'register'
                ? 'Create account'
                : 'Sign in'}
          </button>
        </form>

        <p className="footer">
          {isAdmin
            ? 'Admin accounts require a valid invitation code.'
            : 'Your account is securely connected to your author profile.'}
        </p>
      </div>
    </div>
  );
}

export default App;
