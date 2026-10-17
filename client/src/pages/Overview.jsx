import { useCallback, useEffect, useState } from 'react';
import './Overview.css';

const API = 'http://localhost:5000/api';

const EMPTY_ROYALTIES = {
  earned: 0,
  paid: 0,
  pending: 0,
};

const getToken = () =>
  localStorage.getItem('bookleaf_token') ||
  localStorage.getItem('token') ||
  '';

function getErrorMessage(error, fallback) {
  return error instanceof Error ? error.message : fallback;
}

async function apiRequest(path, token) {
  const response = await fetch(`${API}${path}`, {
    headers: {
      Accept: 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  const contentType = response.headers.get('content-type') || '';

  if (!contentType.includes('application/json')) {
    throw new Error(
      `Unexpected response from ${path}. Check that the backend is running on port 5000.`
    );
  }

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data.message || data.error || `Request failed (${response.status})`
    );
  }

  return data;
}

function getRows(data, key) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.[key])) return data[key];
  if (Array.isArray(data?.data)) return data.data;
  return [];
}

function getNumber(...values) {
  for (const value of values) {
    if (value !== undefined && value !== null && value !== '') {
      const number = Number(value);
      if (Number.isFinite(number)) return number;
    }
  }

  return 0;
}

function getBookTitle(book) {
  return book.title || book.book_title || book.name || 'Untitled book';
}

function getBookStatus(book) {
  return book.status || book.publication_status || 'Status unavailable';
}

function getTicketStatus(ticket) {
  return ticket.status || 'Open';
}

function formatCurrency(amount) {
  return `₹${getNumber(amount).toLocaleString('en-IN', {
    maximumFractionDigits: 2,
  })}`;
}

function formatDate(value) {
  if (!value) return 'Date unavailable';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return 'Date unavailable';

  return date.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function getStoredUser() {
  const storedUser = localStorage.getItem('bookleaf_user');

  if (!storedUser) return {};

  try {
    const parsed = JSON.parse(storedUser);

    if (parsed && typeof parsed === 'object') return parsed;

    if (typeof parsed === 'string') return { email: parsed };
  } catch {
    // Older versions may store the email as plain text.
  }

  return { email: storedUser };
}

function getDisplayName() {
  const user = getStoredUser();
  const name = user.name || user.full_name || user.fullName;

  if (name) return String(name);

  const email = user.email || '';
  if (!email) return 'Author';

  return email
    .split('@')[0]
    .replace(/[._-]+/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function getGreeting() {
  const hour = new Date().getHours();

  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';

  return 'Good evening';
}

function getBookRoyalties(books) {
  return books.reduce(
    (totals, book) => ({
      earned:
        totals.earned +
        getNumber(
          book.earnedRoyalty,
          book.royalty_earned,
          book.royaltyEarned,
          book.total_royalty_earned,
          book.total_royalty,
          book.totalRoyalty,
          book.earned
        ),
      paid:
        totals.paid +
        getNumber(
          book.paidRoyalty,
          book.royalty_paid,
          book.royaltyPaid,
          book.paid
        ),
      pending:
        totals.pending +
        getNumber(
          book.pendingRoyalty,
          book.royalty_pending,
          book.royaltyPending,
          book.pending
        ),
    }),
    { ...EMPTY_ROYALTIES }
  );
}

function getRoyaltySummary(data) {
  const source = data?.royalties || data?.data || data || {};

  return {
    earned: getNumber(source.totalEarned, source.total_earned, source.earned),
    paid: getNumber(source.totalPaid, source.total_paid, source.paid),
    pending: getNumber(source.totalPending, source.total_pending, source.pending),
  };
}

const Overview = ({ onNavigate }) => {
  const [books, setBooks] = useState([]);
  const [royalties, setRoyalties] = useState(EMPTY_ROYALTIES);
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [lastUpdated, setLastUpdated] = useState(null);

  const fetchOverviewData = useCallback(async () => {
    try {
      setLoading(true);
      setError('');

      const token = getToken();

      if (!token) {
        setBooks([]);
        setTickets([]);
        setRoyalties(EMPTY_ROYALTIES);
        setError('Your session has expired. Please sign in again.');
        return;
      }

      const results = await Promise.allSettled([
        apiRequest('/books', token),
        apiRequest('/books/royalties/summary', token),
        apiRequest('/tickets?limit=3', token),
      ]);

      const problems = [];
      let bookRows = [];

      if (results[0].status === 'fulfilled') {
        bookRows = getRows(results[0].value, 'books');
        setBooks(bookRows.slice(0, 2));
        setRoyalties(getBookRoyalties(bookRows));
      } else {
        setBooks([]);
        setRoyalties(EMPTY_ROYALTIES);
        problems.push(
          `Books: ${getErrorMessage(results[0].reason, 'Could not load books.')}`
        );
      }

      if (results[1].status === 'fulfilled') {
        const summary = getRoyaltySummary(results[1].value);

        const hasRoyaltyData =
          summary.earned !== 0 ||
          summary.paid !== 0 ||
          summary.pending !== 0;

        if (hasRoyaltyData || bookRows.length === 0) {
          setRoyalties(summary);
        }
      } else {
        console.warn(
          'Royalty endpoint unavailable; using book-level values when available.'
        );
      }

      if (results[2].status === 'fulfilled') {
        setTickets(getRows(results[2].value, 'tickets').slice(0, 3));
      } else {
        setTickets([]);
        problems.push(
          `Tickets: ${getErrorMessage(
            results[2].reason,
            'Could not load recent support tickets.'
          )}`
        );
      }

      setError(problems.join(' '));
      setLastUpdated(new Date());
    } catch (err) {
      setBooks([]);
      setTickets([]);
      setRoyalties(EMPTY_ROYALTIES);
      setError(getErrorMessage(err, 'Unable to load dashboard data.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOverviewData();
  }, [fetchOverviewData]);

  const goTo = (page) => {
    if (typeof onNavigate === 'function') {
      onNavigate(page);
    }
  };

  const royaltyProgress =
    royalties.earned > 0
      ? Math.min((royalties.paid / royalties.earned) * 100, 100)
      : 0;

  return (
    <div className="overview-page">
      {error && (
        <div className="overview-alert" role="status">
          <span aria-hidden="true">!</span>
          <div>
            <strong>Some dashboard data may be missing.</strong>
            <p>{error}</p>
          </div>
          <button
            type="button"
            onClick={fetchOverviewData}
            disabled={loading}
          >
            Try again
          </button>
        </div>
      )}

      <section className="welcome-panel">
        <div className="welcome-copy">
          <span className="welcome-kicker">YOUR AUTHOR JOURNEY</span>
          <h2>
            {getGreeting()}, {getDisplayName()}
          </h2>
          <p>Your books, royalties and support in one place.</p>
        </div>

        <button
          className="hero-cta"
          type="button"
          onClick={() => goTo('contact-support')}
        >
          Open a ticket <span aria-hidden="true">→</span>
        </button>
      </section>

      <section className="stats-grid stats-grid-4" aria-label="Account summary">
        <div className="stat-card">
          <div className="stat-head">
            <span className="stat-icon" aria-hidden="true">▤</span>
            <p>My Books</p>
          </div>
          <h2>{loading ? '—' : books.length}</h2>
          <span className="stat-caption">Your latest book records</span>
        </div>

        <div className="stat-card">
          <div className="stat-head">
            <span className="stat-icon" aria-hidden="true">₹</span>
            <p>Total Earned</p>
          </div>
          <h2>{loading ? '—' : formatCurrency(royalties.earned)}</h2>
          <span className="stat-caption">Royalty earnings recorded</span>
        </div>

        <div className="stat-card">
          <div className="stat-head">
            <span className="stat-icon" aria-hidden="true">✓</span>
            <p>Royalty Paid</p>
          </div>
          <h2>{loading ? '—' : formatCurrency(royalties.paid)}</h2>
          <span className="stat-caption">Payments recorded</span>
        </div>

        <div className="stat-card">
          <div className="stat-head">
            <span className="stat-icon" aria-hidden="true">◷</span>
            <p>Royalty Pending</p>
          </div>
          <h2>{loading ? '—' : formatCurrency(royalties.pending)}</h2>
          <span className="stat-caption">Awaiting payment</span>
        </div>
      </section>

      {!loading && royalties.earned > 0 && (
        <section className="royalty-progress">
          <div className="royalty-progress-head">
            <div>
              <span className="eyebrow">PAYMENT OVERVIEW</span>
              <h3>Royalty payment progress</h3>
              <p>
                {formatCurrency(royalties.paid)} paid of{' '}
                {formatCurrency(royalties.earned)} earned
              </p>
            </div>
            <strong>{royaltyProgress.toFixed(1)}%</strong>
          </div>

          <div
            className="royalty-bar"
            role="progressbar"
            aria-label="Royalty payment progress"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(royaltyProgress)}
          >
            <span style={{ width: `${royaltyProgress}%` }} />
          </div>

          <p className="royalty-note">
            {royalties.pending > 0
              ? `${formatCurrency(royalties.pending)} pending`
              : 'All recorded earnings have been paid.'}
          </p>
        </section>
      )}

      <section className="panel">
        <div className="section-heading">
          <div>
            <span className="eyebrow">YOUR CATALOGUE</span>
            <h2>My Books</h2>
            <p>Keep track of your published titles.</p>
          </div>
          <button
            className="section-heading-button"
            type="button"
            onClick={() => goTo('my-books')}
          >
            View all <span aria-hidden="true">→</span>
          </button>
        </div>

        {loading ? (
          <div className="empty-state">Loading your books…</div>
        ) : books.length > 0 ? (
          <div className="book-preview-grid">
            {books.map((book, index) => {
              const title = getBookTitle(book);
              const cover =
                book.coverImage ||
                book.cover_image ||
                book.cover_url ||
                book.coverUrl;

              return (
                <article
                  key={book.id || book.book_id || `${title}-${index}`}
                  className="book-card"
                >
                  {cover ? (
                    <img
                      src={cover}
                      alt={`Cover of ${title}`}
                      className="book-cover"
                    />
                  ) : (
                    <div
                      className="book-cover book-cover-fallback"
                      aria-hidden="true"
                    >
                      {title.charAt(0).toUpperCase()}
                    </div>
                  )}

                  <div className="book-card-info">
                    <h3 className="book-title">{title}</h3>
                    <span className="book-status">{getBookStatus(book)}</span>
                    <span className="book-sales">
                      {getNumber(
                        book.copiesSold,
                        book.copies_sold,
                        book.sales
                      )}{' '}
                      copies sold
                    </span>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="empty-state">
            <span className="empty-icon" aria-hidden="true">▤</span>
            <strong>No books found</strong>
            <p>Your linked book records will appear here when available.</p>
          </div>
        )}
      </section>

      <section className="panel">
        <div className="section-heading">
          <div>
            <span className="eyebrow">AUTHOR SUPPORT</span>
            <h2>Recent Support Tickets</h2>
            <p>Follow your questions and support updates.</p>
          </div>
          <button
            className="section-heading-button"
            type="button"
            onClick={() => goTo('my-tickets')}
          >
            View all <span aria-hidden="true">→</span>
          </button>
        </div>

        {loading ? (
          <div className="empty-state">Loading your support tickets…</div>
        ) : tickets.length > 0 ? (
          <div className="tickets-list">
            {tickets.map((ticket, index) => {
              const status = getTicketStatus(ticket);
              const bookTitle =
                ticket.bookTitle ||
                ticket.book_title ||
                ticket.book_name ||
                'General inquiry';

              const createdAt =
                ticket.createdAt ||
                ticket.created_at ||
                ticket.created_on;

              const description =
                ticket.description ||
                ticket.message ||
                ticket.body ||
                '';

              return (
                <article
                  key={ticket.id || ticket.ticket_id || index}
                  className="ticket-row"
                >
                  <div className="ticket-row-main">
                    <strong>{ticket.subject || 'Support request'}</strong>
                    <p className="ticket-meta-line">
                      {formatDate(createdAt)}{' '}
                      <span aria-hidden="true">·</span> {bookTitle}
                    </p>
                    {description && (
                      <p className="ticket-desc">{description}</p>
                    )}
                  </div>

                  <span
                    className={`status status-${String(status)
                      .toLowerCase()
                      .replace(/\s+/g, '-')}`}
                  >
                    {status}
                  </span>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="empty-state">
            <span className="empty-icon" aria-hidden="true">✉</span>
            <strong>No support tickets yet</strong>
            <p>Need help with a book or royalty? Send our team a message.</p>
            <button
              className="text-action"
              type="button"
              onClick={() => goTo('contact-support')}
            >
              Contact support →
            </button>
          </div>
        )}
      </section>

      <section className="panel">
        <div className="section-heading">
          <div>
            <span className="eyebrow">RESOURCES</span>
            <h2>Quick Help</h2>
            <p>Helpful information for your publishing journey.</p>
          </div>
        </div>

        <div className="help-grid">
          <button
            type="button"
            className="help-link"
            onClick={() => goTo('royalties')}
          >
            <span className="help-icon" aria-hidden="true">₹</span>
            <strong>How do royalties work?</strong>
            <p>Learn about royalty rates and payment schedules.</p>
            <span className="help-read">View royalties →</span>
          </button>

          <button
            type="button"
            className="help-link"
            onClick={() => goTo('my-books')}
          >
            <span className="help-icon" aria-hidden="true">▤</span>
            <strong>Manage your books</strong>
            <p>Review your titles and their publication details.</p>
            <span className="help-read">View books →</span>
          </button>

          <button
            type="button"
            className="help-link"
            onClick={() => goTo('my-books')}
          >
            <span className="help-icon" aria-hidden="true">↗</span>
            <strong>Track your sales</strong>
            <p>Review available sales information for your books.</p>
            <span className="help-read">View book records →</span>
          </button>

          <button
            type="button"
            className="help-link"
            onClick={() => goTo('contact-support')}
          >
            <span className="help-icon" aria-hidden="true">✉</span>
            <strong>Contact support</strong>
            <p>Get help from the BookLeaf support team.</p>
            <span className="help-read">Get help →</span>
          </button>
        </div>
      </section>

      {lastUpdated && (
        <p className="overview-updated">
          Last refreshed{' '}
          {lastUpdated.toLocaleTimeString('en-IN', {
            hour: '2-digit',
            minute: '2-digit',
          })}
          {' · '}
          <button
            type="button"
            onClick={fetchOverviewData}
            disabled={loading}
          >
            {loading ? 'Refreshing…' : 'Refresh data'}
          </button>
        </p>
      )}
    </div>
  );
};

export default Overview;