
import { useCallback, useState, useEffect } from 'react';
import './Royalties.css';
import { API_BASE_URL } from '../api';

const Royalties = () => {
  const [books, setBooks] = useState([]);
  const [royalties, setRoyalties] = useState({
    totalEarned: 0,
    totalPaid: 0,
    totalPending: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchRoyaltyData = useCallback(async () => {
    try {
      setLoading(true);
      setError('');

      const token = localStorage.getItem('bookleaf_token');

      if (!token) {
        throw new Error('Your session has expired. Please log in again.');
      }

      const response = await fetch(`${API_BASE_URL}/books`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const contentType = response.headers.get('content-type') || '';

      if (!contentType.includes('application/json')) {
        throw new Error(
          'The books API returned HTML instead of JSON. Check the backend URL and /api/books route.'
        );
      }

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || data.error || 'Failed to fetch royalty data.'
        );
      }

      const list = Array.isArray(data)
        ? data
        : Array.isArray(data.books)
          ? data.books
          : [];

      const totalEarned = list.reduce(
        (sum, book) => sum + Number(book.earnedRoyalty || 0),
        0
      );

      const totalPaid = list.reduce(
        (sum, book) => sum + Number(book.paidRoyalty || 0),
        0
      );

      // Prefer backend-provided pending amounts. Otherwise calculate the
      // difference only when the API provides earned and paid amounts.
      const totalPending = list.reduce((sum, book) => {
        if (book.pendingRoyalty !== undefined && book.pendingRoyalty !== null) {
          return sum + Number(book.pendingRoyalty || 0);
        }

        return sum + Math.max(
          0,
          Number(book.earnedRoyalty || 0) - Number(book.paidRoyalty || 0)
        );
      }, 0);

      setBooks(list);
      setRoyalties({
        totalEarned,
        totalPaid,
        totalPending,
      });
    } catch (err) {
      setError(err.message || 'Unable to load royalty data.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      fetchRoyaltyData();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [fetchRoyaltyData]);

  const formatCurrency = (amount) =>
    `₹${Number(amount || 0).toLocaleString('en-IN', {
      maximumFractionDigits: 0,
    })}`;

  const paidPercentage =
    royalties.totalEarned > 0
      ? (royalties.totalPaid / royalties.totalEarned) * 100
      : 0;

  if (loading) {
    return (
      <div className="royalties-page">
        <p className="loading-state">Loading royalty data...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="royalties-page">
        <p className="error-state">Error: {error}</p>
        <button type="button" onClick={fetchRoyaltyData}>
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="royalties-page">
      <div className="summary-cards">
        <div className="summary-card">
          <div className="card-header">
            <span className="card-icon">₹</span>
            <p className="card-label">Total Earned</p>
          </div>
          <h2 className="card-value">
            {formatCurrency(royalties.totalEarned)}
          </h2>
        </div>

        <div className="summary-card">
          <div className="card-header">
            <span className="card-icon">✓</span>
            <p className="card-label">Royalty Paid</p>
          </div>
          <h2 className="card-value">
            {formatCurrency(royalties.totalPaid)}
          </h2>
        </div>

        <div className="summary-card pending-card">
          <div className="card-header">
            <span className="card-icon">⏱</span>
            <p className="card-label">Pending</p>
          </div>
          <h2 className="card-value">
            {formatCurrency(royalties.totalPending)}
          </h2>
        </div>
      </div>

      {royalties.totalEarned > 0 && (
        <div className="payment-progress">
          <div className="progress-header">
            <h2>Payment Progress</h2>
            <span className="percentage-badge">
              {paidPercentage.toFixed(1)}%
            </span>
          </div>

          <div
            className="progress-bar"
            role="progressbar"
            aria-valuenow={Math.min(paidPercentage, 100)}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Royalty payment progress"
          >
            <span
              style={{ width: `${Math.min(paidPercentage, 100)}%` }}
            />
          </div>

          <p className="progress-note">
            {formatCurrency(royalties.totalPaid)} paid out of{' '}
            {formatCurrency(royalties.totalEarned)} recorded earnings.
          </p>
        </div>
      )}

      <div className="royalty-by-book">
        <h2>Royalty by Book</h2>

        {books.length > 0 ? (
          <div className="table-wrap">
            <table className="royalty-table">
              <thead>
                <tr>
                  <th>Book Title</th>
                  <th>Copies Sold</th>
                  <th>Earned</th>
                  <th>Paid</th>
                  <th>Pending</th>
                </tr>
              </thead>

              <tbody>
                {books.map((book) => (
                  <tr key={book.id}>
                    <td className="book-title-cell">{book.title}</td>
                    <td>
                      {Number(book.copiesSold || 0).toLocaleString('en-IN')}
                    </td>
                    <td className="earned">
                      {formatCurrency(book.earnedRoyalty)}
                    </td>
                    <td className="paid">
                      {formatCurrency(book.paidRoyalty)}
                    </td>
                    <td className="pending">
                      {formatCurrency(
                        book.pendingRoyalty ??
                          Math.max(
                            0,
                            Number(book.earnedRoyalty || 0) -
                              Number(book.paidRoyalty || 0)
                          )
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="empty-state">No books with royalties yet.</p>
        )}
      </div>

      <div className="payment-policy">
        <h2>Royalty Payment Policy</h2>

        <div className="policy-content">
          <div className="policy-item">
            <h3>Calculation Period</h3>
            <p>
              Royalty statements are calculated and processed quarterly based
              on recorded book sales.
            </p>
          </div>

          <div className="policy-item">
            <h3>Minimum Payout Threshold</h3>
            <p>
              Payments are processed when the pending balance reaches ₹1,000.
              Smaller balances are carried forward to the next quarter.
            </p>
          </div>

          <div className="policy-item">
            <h3>Payment Timeline</h3>
            <p>
              Approved royalties are typically paid within 45 days after the
              end of the relevant quarter, subject to the applicable process.
            </p>
          </div>

          <div className="policy-item">
            <h3>Tax Compliance</h3>
            <p>
              Payments are subject to applicable tax requirements. Contact
              support if you need help with your royalty statement.
            </p>
          </div>
        </div>

        <p className="policy-note">
          For questions about royalty calculations or payment status, contact
          the support team.
        </p>
      </div>
    </div>
  );
};

export default Royalties;
