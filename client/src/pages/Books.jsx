import { useCallback, useState, useEffect } from 'react';
import './Books.css';
import { API_BASE_URL } from '../api';

const Books = () => {
  const [books, setBooks] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchBooks = useCallback(async () => {
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
          'The books API returned HTML instead of JSON. Check the configured API URL and /api/books route.'
        );
      }

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || data.error || 'Failed to fetch books.');
      }

      const list = Array.isArray(data)
        ? data
        : Array.isArray(data.books)
        ? data.books
        : [];

      setBooks(list);
    } catch (err) {
      setError(err.message || 'Unable to load books.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      fetchBooks();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [fetchBooks]);

  const filteredBooks = books.filter((book) => {
    const title = book.title || '';
    const status = (book.status || '').toLowerCase();

    const matchesSearch = title
      .toLowerCase()
      .includes(searchTerm.toLowerCase());

    const matchesStatus =
      filterStatus === 'all' ||
      status === filterStatus ||
      (filterStatus === 'published' && status === 'published-live');

    return matchesSearch && matchesStatus;
  });

  const formatCurrency = (amount) =>
    `₹${Number(amount || 0).toLocaleString('en-IN', {
      maximumFractionDigits: 0,
    })}`;

  const getStatusBadgeClass = (status) => {
    switch ((status || '').toLowerCase()) {
      case 'published':
      case 'published-live':
        return 'badge-published';
      case 'printing':
        return 'badge-printing';
      case 'editing':
        return 'badge-editing';
      case 'draft':
        return 'badge-draft';
      default:
        return 'badge-draft';
    }
  };

  if (loading) {
    return (
      <div className="books-page">
        <p>Loading books...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="books-page">
        <p className="error">Error: {error}</p>
        <button type="button" onClick={fetchBooks}>
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="books-page">
      <div className="books-toolbar">
        <div className="books-search">
          <input
            type="search"
            placeholder="Search books..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            aria-label="Search books"
          />
        </div>

        <div className="books-filters">
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            aria-label="Filter by publication status"
          >
            <option value="all">All Status</option>
            <option value="draft">Draft</option>
            <option value="editing">Editing</option>
            <option value="printing">Printing</option>
            <option value="published">Published</option>
          </select>
        </div>
      </div>

      {/* Desktop Table */}
      <div className="books-table-wrap">
        <table className="books-table">
          <thead>
            <tr>
              <th>Book Title</th>
              <th>Status</th>
              <th>Copies Sold</th>
              <th>Earned</th>
              <th>Paid</th>
              <th>Pending</th>
            </tr>
          </thead>

          <tbody>
            {filteredBooks.length > 0 ? (
              filteredBooks.map((book) => (
                <tr key={book.id}>
                  <td>
                    <div className="book-table-cell">
                      {book.coverImage ? (
                        <img
                          src={book.coverImage}
                          alt={`Cover of ${book.title}`}
                          className="book-table-cover"
                        />
                      ) : (
                        <div className="book-table-cover book-cover-fallback">
                          B
                        </div>
                      )}

                      <div className="book-table-meta">
                        <strong>{book.title || 'Untitled book'}</strong>
                        <span>{book.author || 'BookLeaf Author'}</span>
                      </div>
                    </div>
                  </td>

                  <td>
                    <span className={`book-badge ${getStatusBadgeClass(book.status)}`}>
                      {book.status || 'Unknown'}
                    </span>
                  </td>

                  <td>{Number(book.copiesSold || 0).toLocaleString('en-IN')}</td>
                  <td className="royalty-earned">{formatCurrency(book.earnedRoyalty)}</td>
                  <td className="royalty-paid">{formatCurrency(book.paidRoyalty)}</td>
                  <td className="royalty-pending">{formatCurrency(book.pendingRoyalty)}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6} className="empty-state">
                  No books found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile / Tablet Cards */}
      <div className="books-cards">
        {filteredBooks.length > 0 ? (
          filteredBooks.map((book) => (
            <div className="book-card" key={book.id}>
              <div className="book-card-top">
                {book.coverImage ? (
                  <img
                    src={book.coverImage}
                    alt={`Cover of ${book.title}`}
                    className="book-card-cover"
                  />
                ) : (
                  <div className="book-card-cover book-cover-fallback">B</div>
                )}

                <div className="book-card-info">
                  <strong>{book.title || 'Untitled book'}</strong>
                  <span>{book.author || 'BookLeaf Author'}</span>
                  <span className={`book-badge ${getStatusBadgeClass(book.status)}`}>
                    {book.status || 'Unknown'}
                  </span>
                </div>
              </div>

              <div className="book-card-stats">
                <div>
                  <label>Copies Sold</label>
                  <p>{Number(book.copiesSold || 0).toLocaleString('en-IN')}</p>
                </div>
                <div>
                  <label>Earned</label>
                  <p className="royalty-earned">{formatCurrency(book.earnedRoyalty)}</p>
                </div>
                <div>
                  <label>Paid</label>
                  <p className="royalty-paid">{formatCurrency(book.paidRoyalty)}</p>
                </div>
                <div>
                  <label>Pending</label>
                  <p className="royalty-pending">{formatCurrency(book.pendingRoyalty)}</p>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="empty-state">No books found.</div>
        )}
      </div>
    </div>
  );
};

export default Books;