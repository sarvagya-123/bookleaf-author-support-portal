import { useState, useEffect, useCallback } from 'react';
import './MyTickets.css';
import { API_BASE_URL } from '../api';

const MyTickets = () => {
  const [tickets, setTickets] = useState([]);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [messages, setMessages] = useState([]);
  const [replyText, setReplyText] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [messageError, setMessageError] = useState('');
  const [sending, setSending] = useState(false);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [mobileView, setMobileView] = useState('list'); // list | detail

  const getToken = useCallback(() => {
    const token =
      localStorage.getItem('bookleaf_token') || localStorage.getItem('token');

    if (!token) {
      throw new Error('Your session has expired. Please log in again.');
    }

    return token;
  }, []);

  const apiRequest = useCallback(async (url, options = {}) => {
    const token = getToken();

    const response = await fetch(`${API_BASE_URL}${url}`, {
      ...options,
      headers: {
        Authorization: `Bearer ${token}`,
        ...(options.body ? { 'Content-Type': 'application/json' } : {}),
        ...options.headers,
      },
    });

    const contentType = response.headers.get('content-type') || '';

    if (!contentType.includes('application/json')) {
      throw new Error(
        `The API endpoint ${url} did not return JSON. Check the backend route.`
      );
    }

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        data.message || data.error || `Request failed (${response.status}).`
      );
    }

    return data;
  }, [getToken]);

  const fetchTickets = useCallback(async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true);
      setError('');

      const data = await apiRequest('/tickets');
      const list = Array.isArray(data)
        ? data
        : Array.isArray(data.tickets)
          ? data.tickets
          : [];

      setTickets(list);

      setSelectedTicket((current) => {
        if (!current) return null;
        return list.find((ticket) => ticket.id === current.id) || null;
      });
    } catch (err) {
      setError(err.message || 'Unable to load support tickets.');
    } finally {
      if (showLoading) setLoading(false);
    }
  }, [apiRequest]);

  const fetchTicketMessages = useCallback(async (ticketId, showLoading = true) => {
    try {
      if (showLoading) setMessagesLoading(true);
      setMessageError('');

      const data = await apiRequest(`/tickets/${ticketId}/messages`);

      setMessages(
        Array.isArray(data)
          ? data
          : Array.isArray(data.messages)
            ? data.messages
            : []
      );
    } catch (err) {
      setMessages([]);
      setMessageError(err.message || 'Unable to load ticket messages.');
    } finally {
      if (showLoading) setMessagesLoading(false);
    }
  }, [apiRequest]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      fetchTickets();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [fetchTickets]);

  useEffect(() => {
    const refresh = window.setInterval(() => {
      fetchTickets(false);
    }, 15000);

    return () => window.clearInterval(refresh);
  }, [fetchTickets]);

  useEffect(() => {
    const ticketId = selectedTicket?.id;
    if (!ticketId) return undefined;

    const refresh = window.setInterval(() => {
      fetchTicketMessages(ticketId, false);
    }, 15000);

    return () => window.clearInterval(refresh);
  }, [selectedTicket?.id, fetchTicketMessages]);

  const handleSelectTicket = (ticket) => {
    setSelectedTicket(ticket);
    setMessages([]);
    setMessageError('');
    fetchTicketMessages(ticket.id);

    if (window.innerWidth <= 760) {
      setMobileView('detail');
    }
  };

  const handleReply = async (event) => {
    event.preventDefault();

    const message = replyText.trim();

    if (!message || !selectedTicket || sending) return;

    try {
      setSending(true);
      setMessageError('');

      await apiRequest(`/tickets/${selectedTicket.id}/messages`, {
        method: 'POST',
        body: JSON.stringify({ message }),
      });

      setReplyText('');

      await fetchTicketMessages(selectedTicket.id);
      await fetchTickets();
    } catch (err) {
      setMessageError(err.message || 'Unable to send your reply.');
    } finally {
      setSending(false);
    }
  };

  const getStatusBadgeClass = (status) =>
    `status-${(status || 'open').toLowerCase().replace(/\s+/g, '-')}`;

  const formatDate = (date) => {
    if (!date) return 'Date unavailable';

    const parsedDate = new Date(date);

    if (Number.isNaN(parsedDate.getTime())) {
      return 'Date unavailable';
    }

    return parsedDate.toLocaleDateString(undefined, {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const formatDateTime = (date) => {
    if (!date) return '';

    const parsedDate = new Date(date);

    if (Number.isNaN(parsedDate.getTime())) {
      return '';
    }

    return parsedDate.toLocaleString(undefined, {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const getTicketDescription = (ticket) =>
    ticket.description || ticket.message || 'No description provided.';

  const isTicketClosed = ['closed', 'resolved'].includes(
    (selectedTicket?.status || '').toLowerCase()
  );

  if (loading && tickets.length === 0 && !error) {
    return (
      <main className="mytickets-page">
        <div className="tickets-loading">
          <span className="loading-spinner" />
          <p>Loading your support tickets...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="mytickets-page">
      <section className="tickets-container">
        <aside
          className={`tickets-list-section ${
            mobileView === 'detail' ? 'mobile-hidden' : ''
          }`}
        >
          <div className="section-heading">
            <div>
              <h2>Support Tickets</h2>
              <p className="section-description">
                {tickets.length} {tickets.length === 1 ? 'request' : 'requests'}
              </p>
            </div>

            <button
              type="button"
              className="btn btn-secondary"
              onClick={fetchTickets}
              disabled={loading}
              title="Refresh tickets list"
            >
              {loading ? 'Refreshing…' : 'Refresh'}
            </button>
          </div>

          {error && (
            <div className="error-state" role="alert">
              <p>{error}</p>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={fetchTickets}
                disabled={loading}
              >
                Try again
              </button>
            </div>
          )}

          {!error && tickets.length === 0 && (
            <div className="empty-state">
              <div className="empty-state-icon" aria-hidden="true">
                ✉
              </div>
              <h3>No support tickets yet</h3>
              <p>
                Your support requests will appear here when you create one.
              </p>
            </div>
          )}

          {tickets.length > 0 && (
            <div className="tickets-list">
              {tickets.map((ticket) => {
                const isSelected = selectedTicket?.id === ticket.id;

                return (
                  <button
                    type="button"
                    key={ticket.id}
                    className={`ticket-item ${isSelected ? 'active' : ''}`}
                    aria-pressed={isSelected}
                    onClick={() => handleSelectTicket(ticket)}
                    title={`Click to view: ${
                      ticket.subject || 'Untitled request'
                    }`}
                  >
                    <div className="ticket-item-top">
                      <span className="ticket-item-icon" aria-hidden="true">
                        #
                      </span>

                      <span
                        className={`status ${getStatusBadgeClass(ticket.status)}`}
                      >
                        {ticket.status || 'Open'}
                      </span>
                    </div>

                    <span className="ticket-item-title">
                      {ticket.subject || 'Untitled request'}
                    </span>

                    <span className="ticket-item-meta">
                      <span>
                        {formatDate(ticket.createdAt || ticket.created_at)}
                      </span>
                      <span className="ticket-meta-separator">·</span>
                      <span>
                        {ticket.bookTitle ||
                          ticket.book_title ||
                          'General inquiry'}
                      </span>
                    </span>

                    <span className="ticket-item-preview">
                      {getTicketDescription(ticket)}
                    </span>

                    <span className="ticket-item-cta" aria-hidden="true">
                      Click to view conversation →
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </aside>

        <section
          className={`ticket-detail-section ${
            mobileView === 'list' && !selectedTicket ? '' : ''
          }`}
        >
          {selectedTicket && (
            <button
              type="button"
              className="mobile-back-btn"
              onClick={() => setMobileView('list')}
            >
              ← Back to tickets
            </button>
          )}

          {!selectedTicket ? (
            <div className="no-selection">
              <div className="detail-empty-icon" aria-hidden="true">
                ☰
              </div>
              <h2>Select a support ticket</h2>
              <p>
                Choose a request from the list to view the conversation and send
                a reply.
              </p>
              <div className="hint-box">
                <span className="hint-icon">💡</span>
                <p>Click any ticket to open its conversation thread</p>
              </div>
            </div>
          ) : (
            <>
              <header className="ticket-detail-header">
                <div className="ticket-detail-title-row">
                  <div className="ticket-detail-heading">
                    <p className="detail-eyebrow">SUPPORT CONVERSATION</p>
                    <h2>{selectedTicket.subject || 'Untitled request'}</h2>
                  </div>

                  <span
                    className={`status ${getStatusBadgeClass(
                      selectedTicket.status
                    )}`}
                  >
                    {selectedTicket.status || 'Open'}
                  </span>
                </div>

                <div className="ticket-detail-meta">
                  <span>
                    Submitted{' '}
                    {formatDate(
                      selectedTicket.createdAt || selectedTicket.created_at
                    )}
                  </span>
                  <span className="ticket-meta-separator">·</span>
                  <span>
                    {selectedTicket.bookTitle ||
                      selectedTicket.book_title ||
                      'General inquiry'}
                  </span>
                </div>
              </header>

              <div className="original-message">
                <div className="original-message-heading">
                  <span className="original-message-dot" />
                  <p className="original-message-label">Original message</p>
                </div>
                <p className="original-message-text">
                  {getTicketDescription(selectedTicket)}
                </p>
              </div>

              <div className="conversation-heading">
                <h3>Conversation</h3>
                <span className="message-count">
                  {messages.length} {messages.length === 1 ? 'message' : 'messages'}
                </span>
              </div>

              {messageError && (
                <div className="error-state message-error" role="alert">
                  {messageError}
                </div>
              )}

              <div
                className="messages-thread"
                aria-live="polite"
                aria-label="Conversation messages"
              >
                {messagesLoading ? (
                  <div className="conversation-loading">
                    <span className="loading-spinner" />
                    <p>Loading conversation...</p>
                  </div>
                ) : messages.length === 0 ? (
                  <div className="no-messages">
                    <p>No replies yet.</p>
                    <span>Start the conversation by sending a message below.</span>
                  </div>
                ) : (
                  messages.map((msg) => {
                    const sender = (
                      msg.sender_role ||
                      msg.sender ||
                      msg.role ||
                      ''
                    ).toLowerCase();

                    const isAdmin = sender === 'admin';

                    return (
                      <article
                        key={msg.id}
                        className={`message-bubble ${
                          isAdmin ? 'admin-message' : 'author-message'
                        }`}
                      >
                        <div className="message-bubble-header">
                          <span className="message-avatar" aria-hidden="true">
                            {isAdmin ? 'S' : 'Y'}
                          </span>
                          <span className="message-sender">
                            {isAdmin ? 'BookLeaf Support' : 'You'}
                          </span>
                          <span className="message-time">
                            {formatDateTime(msg.createdAt || msg.created_at)}
                          </span>
                        </div>

                        <p className="message-text">
                          {msg.message || msg.body || ''}
                        </p>
                      </article>
                    );
                  })
                )}
              </div>

              {isTicketClosed ? (
                <div className="closed-ticket-notice">
                  <span aria-hidden="true">✓</span>
                  This ticket is {selectedTicket.status.toLowerCase()}. Replies
                  are disabled.
                </div>
              ) : (
                <form className="reply-form" onSubmit={handleReply}>
                  <div className="reply-form-header">
                    <label htmlFor="ticket-reply">Your reply</label>
                    <span className="reply-helper">
                      Type your message below to respond to support
                    </span>
                  </div>

                  <textarea
                    id="ticket-reply"
                    placeholder="Write your message to the BookLeaf support team..."
                    value={replyText}
                    onChange={(event) => setReplyText(event.target.value)}
                    rows={4}
                    maxLength={5000}
                    required
                    disabled={sending}
                    aria-describedby="char-count"
                  />

                  <div className="reply-form-footer">
                    <span className="reply-hint" id="char-count">
                      {replyText.length}/5000 characters
                    </span>

                    <button
                      type="submit"
                      className="btn btn-primary send-btn"
                      disabled={!replyText.trim() || sending}
                      title="Send your message to support team"
                    >
                      {sending ? 'Sending…' : 'Send reply'}
                      {!sending && <span aria-hidden="true"> →</span>}
                    </button>
                  </div>
                </form>
              )}
            </>
          )}
        </section>
      </section>
    </main>
  );
};

export default MyTickets;