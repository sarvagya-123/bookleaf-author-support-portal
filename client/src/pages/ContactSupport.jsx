import { useEffect, useRef, useState } from 'react';
import './ContactSupport.css';
import { API_BASE_URL } from '../api';

const MAX_FILES = 5;
const MAX_FILE_SIZE = 5 * 1024 * 1024;

const INITIAL_FORM = {
  subject: '',
  bookId: '',
  category: 'General Inquiry',
  message: '',
};

const FAQS = [
  {
    question: 'How long does it take to get a response?',
    answer:
      'Our support team typically responds within 24–48 business hours.',
  },
  {
    question: 'How do I check my ticket status?',
    answer:
      'Open My Tickets in your author workspace to view your requests, status updates, and replies.',
  },
  {
    question: 'Can I upload multiple files?',
    answer:
      'You can select up to five files, with a maximum size of 5 MB per file.',
  },
  {
    question: 'What issues can I report?',
    answer:
      'Contact us about publishing, ISBN and metadata, royalties, your account, or technical problems.',
  },
];

const ContactSupport = () => {
  const [books, setBooks] = useState([]);
  const [formData, setFormData] = useState(INITIAL_FORM);
  const [attachments, setAttachments] = useState([]);
  const [loadingBooks, setLoadingBooks] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [dragging, setDragging] = useState(false);

  const fileInputRef = useRef(null);
  const mountedRef = useRef(false);

  useEffect(() => {
    mountedRef.current = true;

    const fetchBooks = async () => {
      try {
        const token = localStorage.getItem('bookleaf_token');

        if (!token) {
          throw new Error('Your session has expired. Please log in again.');
        }

        const response = await fetch(`${API_BASE_URL}/books`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
          throw new Error(data.message || 'Unable to load your books.');
        }

        const bookList = Array.isArray(data)
          ? data
          : Array.isArray(data.books)
            ? data.books
            : Array.isArray(data.data)
              ? data.data
              : [];

        if (mountedRef.current) {
          setBooks(bookList);
        }
      } catch (err) {
        if (mountedRef.current) {
          setError(err.message || 'Unable to load your books.');
        }
      } finally {
        if (mountedRef.current) {
          setLoadingBooks(false);
        }
      }
    };

    fetchBooks();

    return () => {
      mountedRef.current = false;
    };
  }, []);

  const handleInputChange = (event) => {
    const { name, value } = event.target;

    setFormData((current) => ({
      ...current,
      [name]: value,
    }));

    setError('');
    setSuccess('');
  };

  const addFiles = (incomingFiles) => {
    const selectedFiles = Array.from(incomingFiles || []);

    if (!selectedFiles.length) return;

    setError('');
    setSuccess('');

    setAttachments((current) => {
      const next = [...current];
      const errors = [];

      for (const file of selectedFiles) {
        const duplicate = next.some(
          (existing) =>
            existing.name === file.name &&
            existing.size === file.size &&
            existing.lastModified === file.lastModified
        );

        if (duplicate) continue;

        if (file.size > MAX_FILE_SIZE) {
          errors.push(`${file.name} exceeds the 5 MB limit.`);
          continue;
        }

        if (next.length >= MAX_FILES) {
          errors.push('You can attach a maximum of 5 files.');
          break;
        }

        next.push(file);
      }

      if (errors.length) {
        setError(errors.join(' '));
      }

      return next;
    });

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeAttachment = (indexToRemove) => {
    setAttachments((current) =>
      current.filter((_, index) => index !== indexToRemove)
    );

    setError('');
    setSuccess('');
  };

  const handleFileChange = (event) => {
    addFiles(event.target.files);
  };

  const handleDrop = (event) => {
    event.preventDefault();
    setDragging(false);

    if (!submitting) {
      addFiles(event.dataTransfer.files);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    setError('');
    setSuccess('');

    if (!formData.subject.trim()) {
      setError('Please enter a subject.');
      return;
    }

    if (!formData.message.trim()) {
      setError('Please describe your issue.');
      return;
    }

    if (attachments.length > MAX_FILES) {
      setError('You can attach a maximum of 5 files.');
      return;
    }

    if (attachments.some((file) => file.size > MAX_FILE_SIZE)) {
      setError('Each attachment must be 5 MB or smaller.');
      return;
    }

    const token = localStorage.getItem('bookleaf_token');

    if (!token) {
      setError('Your session has expired. Please log in again.');
      return;
    }

    try {
      setSubmitting(true);

      const payload = {
        subject: formData.subject.trim(),
        message: formData.message.trim(),
        category: formData.category,
        bookId: formData.bookId || null,
      };

      const response = await fetch(`${API_BASE_URL}/tickets`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          data.message ||
            data.error ||
            'Unable to submit your ticket. Please try again.'
        );
      }

      const ticket = data.ticket || data.data || {};
      const ticketNumber =
        ticket.ticket_number || ticket.ticketNumber || ticket.id;

      setSuccess(
        ticketNumber
          ? `Your ticket #${ticketNumber} has been created successfully. You can track it in My Tickets.`
          : 'Your support ticket has been created. You can track it in My Tickets.'
      );

      setFormData(INITIAL_FORM);
      setAttachments([]);

      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return `${bytes} B`;

    if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(0)} KB`;
    }

    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const getBookId = (book) => book.book_id ?? book.id ?? book.bookId;

  const getBookTitle = (book) =>
    book.title ?? book.book_title ?? 'Untitled book';

  return (
    <main className="contact-support-page">
      <p className="support-page-intro">
        Tell us what you need help with. Our support team will review your
        request and respond through your ticket.
      </p>

      {success && (
        <div className="support-alert support-alert-success" role="status">
          <span className="alert-icon" aria-hidden="true">
            ✓
          </span>
          <div>
            <strong>Request submitted</strong>
            <p>{success}</p>
          </div>
        </div>
      )}

      {error && (
        <div className="support-alert support-alert-error" role="alert">
          <span className="alert-icon" aria-hidden="true">
            !
          </span>
          <div>
            <strong>Something needs your attention</strong>
            <p>{error}</p>
          </div>
        </div>
      )}

      <div className="support-layout">
        <section className="support-form-card">
          <div className="support-card-heading">
            <div>
              <span className="section-kicker">SEND A REQUEST</span>
              <h2>How can we help?</h2>
              <p>Fields marked with * are required.</p>
            </div>

            <div className="support-heading-icon" aria-hidden="true">
              ?
            </div>
          </div>

          <form className="support-form" onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="subject">
                Subject <span className="required-mark">*</span>
              </label>

              <input
                id="subject"
                name="subject"
                type="text"
                value={formData.subject}
                onChange={handleInputChange}
                placeholder="e.g. ISBN correction request"
                maxLength={150}
                required
                disabled={submitting}
              />

              <span className="field-hint">
                Summarize your issue in a few words.
              </span>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="category">Issue category</label>

                <select
                  id="category"
                  name="category"
                  value={formData.category}
                  onChange={handleInputChange}
                  disabled={submitting}
                >
                  <option value="General Inquiry">General inquiry</option>
                  <option value="Royalty & Payments">Royalties & payments</option>
                  <option value="ISBN & Metadata Issues">ISBN & metadata</option>
                  <option value="Printing & Quality">Printing & quality</option>
                  <option value="Distribution & Availability">
                    Distribution & availability
                  </option>
                  <option value="Book Status & Production Updates">
                    Book status & production updates
                  </option>
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="bookId">Related book</label>

                <select
                  id="bookId"
                  name="bookId"
                  value={formData.bookId}
                  onChange={handleInputChange}
                  disabled={submitting || loadingBooks}
                >
                  <option value="">
                    {loadingBooks ? 'Loading your books...' : 'No specific book'}
                  </option>

                  {books.map((book) => {
                    const id = getBookId(book);

                    if (id == null) return null;

                    return (
                      <option key={id} value={id}>
                        {getBookTitle(book)}
                      </option>
                    );
                  })}
                </select>

                {!loadingBooks && books.length === 0 && (
                  <span className="field-hint">
                    No linked books were found. You can still submit a request.
                  </span>
                )}
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="message">
                Message <span className="required-mark">*</span>
              </label>

              <textarea
                id="message"
                name="message"
                value={formData.message}
                onChange={handleInputChange}
                placeholder="Describe the issue, what happened, and what help you need..."
                rows={6}
                maxLength={5000}
                required
                disabled={submitting}
              />

              <div className="textarea-footer">
                <span className="field-hint">
                  Include relevant details so our team can help faster.
                </span>
                <span className="character-count">
                  {formData.message.length}/5000
                </span>
              </div>
            </div>

            <div className="form-group">
              <div className="attachment-heading">
                <label htmlFor="attachments">Attachments (optional)</label>
                <span className="attachment-count">
                  {attachments.length}/{MAX_FILES} files
                </span>
              </div>

              <div
                className={`file-dropzone ${dragging ? 'is-dragging' : ''} ${
                  attachments.length >= MAX_FILES ? 'is-full' : ''
                }`}
                onDragEnter={(event) => {
                  event.preventDefault();
                  setDragging(true);
                }}
                onDragOver={(event) => event.preventDefault()}
                onDragLeave={(event) => {
                  if (!event.currentTarget.contains(event.relatedTarget)) {
                    setDragging(false);
                  }
                }}
                onDrop={handleDrop}
              >
                <input
                  ref={fileInputRef}
                  id="attachments"
                  className="file-input"
                  type="file"
                  multiple
                  accept="image/*,.pdf,.doc,.docx,.txt,.csv,.xlsx"
                  onChange={handleFileChange}
                  disabled={submitting || attachments.length >= MAX_FILES}
                />

                <div className="upload-icon" aria-hidden="true">
                  <svg
                    viewBox="0 0 24 24"
                    width="26"
                    height="26"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.7"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M12 16V4" />
                    <path d="m7 9 5-5 5 5" />
                    <path d="M5 14v5a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-5" />
                  </svg>
                </div>

                <div className="upload-copy">
                  <strong>
                    {attachments.length >= MAX_FILES
                      ? 'Maximum number of files reached'
                      : 'Drop files here or browse'}
                  </strong>
                  <p>
                    {attachments.length >= MAX_FILES
                      ? 'Remove a file below to add another.'
                      : 'PDF, images, Word documents and spreadsheets'}
                  </p>
                </div>

                <label
                  className={`browse-files ${
                    submitting || attachments.length >= MAX_FILES
                      ? 'browse-disabled'
                      : ''
                  }`}
                  htmlFor="attachments"
                >
                  Browse files
                </label>
              </div>

              {attachments.length > 0 && (
                <div className="attachment-list">
                  {attachments.map((file, index) => (
                    <div
                      className="attachment-item"
                      key={`${file.name}-${file.size}-${file.lastModified}`}
                    >
                      <div className="attachment-file-icon" aria-hidden="true">
                        {file.name
                          .split('.')
                          .pop()
                          ?.toUpperCase()
                          .slice(0, 4)}
                      </div>

                      <div className="attachment-file-info">
                        <span className="attachment-file-name">{file.name}</span>
                        <span className="attachment-file-size">
                          {formatFileSize(file.size)}
                        </span>
                      </div>

                      <button
                        type="button"
                        className="remove-attachment"
                        onClick={() => removeAttachment(index)}
                        disabled={submitting}
                        aria-label={`Remove ${file.name}`}
                        title="Remove file"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <p className="field-hint">
                Files can be selected here, but they will not be uploaded until
                file-upload support is added to the API.
              </p>
            </div>

            <div className="form-actions">
              <p className="privacy-note">
                Your request will be linked to your author account.
              </p>

              <button
                type="submit"
                className="submit-btn"
                disabled={submitting || loadingBooks}
              >
                {submitting ? (
                  <>
                    <span className="submit-spinner" />
                    Submitting...
                  </>
                ) : (
                  <>
                    Submit ticket
                    <span aria-hidden="true">→</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </section>

        <aside className="support-sidebar">
          <section className="help-card">
            <div className="help-card-icon" aria-hidden="true">
              ✦
            </div>
            <h2>We're here to help</h2>
            <p>
              Share relevant details about your issue so our team can understand
              your request and find the right solution.
            </p>

            <div className="help-divider" />

            <div className="help-detail">
              <span className="help-detail-icon" aria-hidden="true">
                ↗
              </span>
              <div>
                <strong>Track your request</strong>
                <p>Follow replies and status updates in My Tickets.</p>
              </div>
            </div>
          </section>

          <section className="faq-section">
            <div className="faq-heading">
              <span className="section-kicker">QUICK ANSWERS</span>
              <h2>Frequently asked questions</h2>
            </div>

            <div className="faq-list">
              {FAQS.map((faq) => (
                <details className="faq-item" key={faq.question}>
                  <summary>{faq.question}</summary>
                  <p>{faq.answer}</p>
                </details>
              ))}
            </div>
          </section>
        </aside>
      </div>
    </main>
  );
};

export default ContactSupport;