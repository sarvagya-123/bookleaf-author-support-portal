
import { useCallback, useEffect, useMemo, useState } from "react";
import "./AdminDashboard.css";
import { API_BASE_URL } from "../api";
import { findSimilarTickets } from "./similarTickets";

const CATEGORIES = [
  "Royalty & Payments",
  "ISBN & Metadata Issues",
  "Printing & Quality",
  "Distribution & Availability",
  "Book Status & Production Updates",
  "General Inquiry",
];

const PRIORITIES = ["Critical", "High", "Medium", "Low"];
const STATUSES = ["Open", "In Progress", "Resolved", "Closed"];
const AGING_THRESHOLD_MS = 48 * 60 * 60 * 1000;

function isUnresolved(ticket) {
  return !["resolved", "closed"].includes(
    String(ticket.status || "").toLowerCase()
  );
}

function isAging(ticket, now = Date.now()) {
  const createdAt = new Date(ticket.created_at || "").getTime();
  return isUnresolved(ticket) &&
    Number.isFinite(createdAt) &&
    now - createdAt >= AGING_THRESHOLD_MS;
}

function formatAge(value) {
  const createdAt = new Date(value || "").getTime();
  if (!Number.isFinite(createdAt)) return "Age unavailable";

  const hours = Math.max(0, Math.floor((Date.now() - createdAt) / 3600000));
  if (hours < 1) return "Less than 1h old";
  if (hours < 24) return `${hours}h old`;

  const days = Math.floor(hours / 24);
  const remainingHours = hours % 24;
  return remainingHours ? `${days}d ${remainingHours}h old` : `${days}d old`;
}

function getToken() {
  return localStorage.getItem("bookleaf_token") ||
    sessionStorage.getItem("bookleaf_token") ||
    "";
}

async function apiRequest(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${getToken()}`,
      ...options.headers,
    },
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.message || data.error || `Request failed (${response.status})`);
  }

  return data;
}

function normalizeList(data, key) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.[key])) return data[key];
  if (Array.isArray(data?.tickets)) return data.tickets;
  if (Array.isArray(data?.data)) return data.data;
  return [];
}

function formatDate(value) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "—"
    : date.toLocaleString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
}

function getTicketId(ticket) {
  return ticket?.id ?? ticket?.ticket_id ?? "";
}

function getErrorMessage(error) {
  return error instanceof Error ? error.message : "Something went wrong.";
}

export default function AdminDashboard({ logout = () => {} }) {
  const [tickets, setTickets] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [priorityFilter, setPriorityFilter] = useState("All");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [dateFilter, setDateFilter] = useState("");
  const [sortBy, setSortBy] = useState("urgent");
  const [agingOnly, setAgingOnly] = useState(false);

  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const [reply, setReply] = useState("");
  const [note, setNote] = useState("");
  const [notes, setNotes] = useState([]);
  const [classification, setClassification] = useState(null);

  const selectedTicket = tickets.find(
    (ticket) => String(getTicketId(ticket)) === String(selectedId)
  ) || null;
  const similarTickets = useMemo(
    () => findSimilarTickets(selectedTicket, tickets),
    [selectedTicket, tickets]
  );

  function openTicket(ticket) {
    const ticketId = getTicketId(ticket);
    setSelectedId(ticketId);
    setReply("");
    setNote("");
    setNotes([]);
    setClassification(null);
    loadNotes(ticketId);
  }

  const loadTickets = useCallback(async (showLoading = true) => {
    if (showLoading) setLoading(true);

    try {
      const data = await apiRequest("/admin/tickets");
      const list = normalizeList(data, "tickets");

      setTickets(list);
      setError("");

      setSelectedId((current) => {
        if (current == null) return current;
        return list.some(
          (ticket) => String(getTicketId(ticket)) === String(current)
        ) ? current : null;
      });
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      if (showLoading) setLoading(false);
    }
  }, []);

  const loadNotes = useCallback(async (ticketId) => {
    if (!ticketId) {
      setNotes([]);
      return;
    }

    try {
      const data = await apiRequest(`/admin/tickets/${ticketId}/notes`);
      setNotes(normalizeList(data, "notes"));
    } catch {
      setNotes([]);
      setError("Could not load internal notes for this ticket.");
    }
  }, []);

  useEffect(() => {
    const initialLoad = window.setTimeout(() => {
      loadTickets();
    }, 0);

    // Near-real-time refresh without requiring a manual browser reload.
    const timer = window.setInterval(() => {
      loadTickets(false);
    }, 15000);

    return () => {
      window.clearTimeout(initialLoad);
      window.clearInterval(timer);
    };
  }, [loadTickets]);

  const visibleTickets = useMemo(() => {
    const query = search.trim().toLowerCase();

    const filtered = tickets.filter((ticket) => {
      const matchesSearch = !query || [
        ticket.subject,
        ticket.description,
        ticket.ticket_number,
        ticket.author_name,
        ticket.author_email,
        ticket.email,
      ].some((value) => String(value || "").toLowerCase().includes(query));

      const matchesStatus =
        statusFilter === "All" ||
        String(ticket.status || "").toLowerCase() === statusFilter.toLowerCase();

      const matchesPriority =
        priorityFilter === "All" ||
        String(ticket.priority || "").toLowerCase() === priorityFilter.toLowerCase();

      const matchesCategory =
        categoryFilter === "All" ||
        String(ticket.category || "").toLowerCase() === categoryFilter.toLowerCase();

      const created = ticket.created_at ? new Date(ticket.created_at) : null;
      const matchesDate =
        !dateFilter ||
        (created && !Number.isNaN(created.getTime()) &&
          created.toISOString().slice(0, 10) === dateFilter);
      const matchesAge = !agingOnly || isAging(ticket);

      return matchesSearch && matchesStatus && matchesPriority &&
        matchesCategory && matchesDate && matchesAge;
    });

    const priorityRank = { critical: 0, high: 1, medium: 2, low: 3 };
    return filtered.sort((a, b) => {
      if (sortBy === "oldest") {
        return new Date(a.created_at || 0) - new Date(b.created_at || 0);
      }

      if (sortBy === "newest") {
        return new Date(b.created_at || 0) - new Date(a.created_at || 0);
      }

      const aPriority = priorityRank[String(a.priority || "medium").toLowerCase()] ?? 2;
      const bPriority = priorityRank[String(b.priority || "medium").toLowerCase()] ?? 2;

      if (isUnresolved(a) !== isUnresolved(b)) return isUnresolved(a) ? -1 : 1;
      if (aPriority !== bPriority) return aPriority - bPriority;

      return new Date(a.created_at || 0) - new Date(b.created_at || 0);
    });
  }, [tickets, search, statusFilter, priorityFilter, categoryFilter, dateFilter, sortBy, agingOnly]);

  const stats = useMemo(() => ({
    total: tickets.length,
    open: tickets.filter((t) => String(t.status).toLowerCase() === "open").length,
    progress: tickets.filter((t) => String(t.status).toLowerCase() === "in progress").length,
    urgent: tickets.filter((t) =>
      ["critical", "high"].includes(String(t.priority || "").toLowerCase()) &&
      isUnresolved(t)
    ).length,
    aging: tickets.filter((ticket) => isAging(ticket)).length,
    resolved: tickets.filter((t) =>
      ["resolved", "closed"].includes(String(t.status || "").toLowerCase())
    ).length,
  }), [tickets]);

  async function updateTicket(fields) {
    if (!selectedTicket) return;

    setBusy(true);
    setError("");
    setNotice("");

    try {
      await apiRequest(`/admin/tickets/${getTicketId(selectedTicket)}`, {
        method: "PATCH",
        body: JSON.stringify(fields),
      });

      setNotice("Ticket updated successfully.");
      await loadTickets(false);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function classifyTicket() {
    if (!selectedTicket) return;

    setBusy(true);
    setError("");
    setNotice("");

    try {
      const data = await apiRequest("/ai/classify", {
        method: "POST",
        body: JSON.stringify({
          ticket: {
            subject: selectedTicket.subject,
            description: selectedTicket.description,
            ticket_id: getTicketId(selectedTicket),
            category: selectedTicket.category,
            priority: selectedTicket.priority,
            author_name: selectedTicket.author_name,
            book_title: selectedTicket.book_title,
          },
        }),
      });

      const suggestion = data.classification || data.result || data.suggestion || data;
      setClassification(suggestion);
      setNotice("AI classification generated. Review it before applying.");
    } catch (err) {
      setError(`Could not classify ticket: ${getErrorMessage(err)}`);
    } finally {
      setBusy(false);
    }
  }

  async function applyClassification() {
    if (!classification) return;

    const category =
      classification.category ||
      classification.suggested_category;

    const priority =
      classification.priority ||
      classification.suggested_priority;

    const fields = {};
    if (category && CATEGORIES.includes(category)) fields.category = category;
    if (priority && PRIORITIES.includes(
      String(priority).charAt(0).toUpperCase() + String(priority).slice(1).toLowerCase()
    )) {
      fields.priority =
        String(priority).charAt(0).toUpperCase() + String(priority).slice(1).toLowerCase();
    }

    if (!Object.keys(fields).length) {
      setError("The AI result did not include a recognized category or priority.");
      return;
    }

    await updateTicket(fields);
    setClassification(null);
  }

  async function generateDraft() {
    if (!selectedTicket) return;

    setBusy(true);
    setError("");
    setNotice("");

    try {
      const data = await apiRequest("/ai/draft-reply", {
        method: "POST",
        body: JSON.stringify({
          ticket: {
            ticket_id: getTicketId(selectedTicket),
            subject: selectedTicket.subject,
            description: selectedTicket.description,
            category: selectedTicket.category,
            priority: selectedTicket.priority,
            author_name: selectedTicket.author_name,
            book_title: selectedTicket.book_title,
          },
        }),
      });

      const draft =
        data.draft ||
        data.reply ||
        data.response ||
        data.message;

      if (!draft || typeof draft !== "string") {
        throw new Error("The AI service returned no draft text.");
      }

      setReply(draft);
      setNotice("AI draft generated. Review and edit it before sending.");
    } catch (err) {
      setError(`Could not generate draft: ${getErrorMessage(err)}`);
    } finally {
      setBusy(false);
    }
  }

  async function sendReply(event) {
    event.preventDefault();

    if (!selectedTicket || !reply.trim()) return;

    setBusy(true);
    setError("");
    setNotice("");

    try {
      await apiRequest(`/admin/tickets/${getTicketId(selectedTicket)}/replies`, {
        method: "POST",
        body: JSON.stringify({ message: reply.trim(), reply: reply.trim() }),
      });

      setReply("");
      setNotice("Reply sent successfully.");
      await loadTickets(false);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function addNote(event) {
    event.preventDefault();

    if (!selectedTicket || !note.trim()) return;

    setBusy(true);
    setError("");
    setNotice("");

    try {
      await apiRequest(`/admin/tickets/${getTicketId(selectedTicket)}/notes`, {
        method: "POST",
        body: JSON.stringify({ note: note.trim() }),
      });

      setNote("");
      await loadNotes(getTicketId(selectedTicket));
      setNotice("Internal note saved. It is not visible to the author.");
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function assignToMe() {
    if (!selectedTicket) return;

    setBusy(true);
    setError("");
    setNotice("");

    try {
      await apiRequest(`/admin/tickets/${getTicketId(selectedTicket)}/assign`, {
        method: "PATCH",
        body: JSON.stringify({}),
      });

      setNotice("Ticket assigned to you.");
      await loadTickets(false);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  function resetFilters() {
    setSearch("");
    setStatusFilter("All");
    setPriorityFilter("All");
    setCategoryFilter("All");
    setDateFilter("");
    setSortBy("urgent");
    setAgingOnly(false);
  }

  return (
    <div className="admin-page">
      <header className="admin-topbar">
        <div className="admin-brand">
          <span className="admin-brand-mark">B</span>
          <div>
            <strong>BOOKLEAF</strong>
            <span>SUPPORT OPERATIONS</span>
          </div>
        </div>

        <div className="admin-topbar-right">
          <span className="admin-live-indicator">
            <span /> Operations workspace
          </span>
          <button className="admin-logout" onClick={logout}>
            Log out
          </button>
        </div>
      </header>

      <main className="admin-content">
        <section className="admin-page-heading">
          <div>
            <p className="admin-eyebrow">AUTHOR COMMUNICATION</p>
            <h1>Support dashboard</h1>
            <p className="admin-page-description">
              Review incoming queries, prioritize urgent issues, and respond to authors.
            </p>
          </div>
          <button
            className="admin-button admin-button-secondary"
            onClick={() => loadTickets()}
            disabled={loading || busy}
          >
            ↻ Refresh queue
          </button>
        </section>

        {error && <div className="admin-alert admin-alert-error">{error}</div>}
        {notice && <div className="admin-alert admin-alert-success">{notice}</div>}

        <section className="admin-stats-grid">
          <Stat label="Total tickets" value={stats.total} icon="▤" />
          <Stat label="Open" value={stats.open} icon="◷" />
          <Stat label="In progress" value={stats.progress} icon="↻" />
          <Stat label="Urgent · Critical/High" value={stats.urgent} icon="!" urgent />
          <Stat
            label="Unresolved over 48h"
            value={stats.aging}
            icon="⌛"
            urgent={stats.aging > 0}
            action={() => {
              setAgingOnly((current) => !current);
              setStatusFilter("All");
            }}
            active={agingOnly}
          />
          <Stat label="Resolved / Closed" value={stats.resolved} icon="✓" />
        </section>

        <section className="admin-workspace">
          <aside className="admin-ticket-column">
            <div className="admin-panel-heading">
              <div>
                <h2>Ticket queue</h2>
                <p>
                  {visibleTickets.length} matching tickets
                  {agingOnly ? " · unresolved over 48 hours" : ""}
                </p>
              </div>
              <span className="admin-queue-count">{visibleTickets.length}</span>
            </div>

            <div className="admin-filters">
              <label className="admin-search">
                <span>⌕</span>
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search tickets or authors"
                />
              </label>

              <div className="admin-filter-grid">
                <label>
                  <span>Status</span>
                  <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                    <option>All</option>
                    {STATUSES.map((value) => <option key={value}>{value}</option>)}
                  </select>
                </label>

                <label>
                  <span>Priority</span>
                  <select value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)}>
                    <option>All</option>
                    {PRIORITIES.map((value) => <option key={value}>{value}</option>)}
                  </select>
                </label>

                <label className="admin-filter-wide">
                  <span>Category</span>
                  <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
                    <option>All</option>
                    {CATEGORIES.map((value) => <option key={value}>{value}</option>)}
                  </select>
                </label>

                <label>
                  <span>Created date</span>
                  <input type="date" value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} />
                </label>

                <label>
                  <span>Sort by</span>
                  <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
                    <option value="urgent">Urgency first</option>
                    <option value="oldest">Oldest first</option>
                    <option value="newest">Newest first</option>
                  </select>
                </label>
              </div>

              <button className="admin-reset-filters" onClick={resetFilters}>
                Clear filters
              </button>
            </div>

            <div className="admin-ticket-list">
              {loading ? (
                <div className="admin-empty-state">Loading tickets…</div>
              ) : visibleTickets.length === 0 ? (
                <div className="admin-empty-state">
                  <span>▤</span>
                  <strong>No tickets found</strong>
                  <p>Try changing your search or filters.</p>
                </div>
              ) : visibleTickets.map((ticket) => {
                const id = getTicketId(ticket);
                const isSelected = String(id) === String(selectedId);
                const priority = String(ticket.priority || "Medium").toLowerCase();
                const status = ticket.status || "Open";

                return (
                  <button
                    type="button"
                    key={id}
                    className={`admin-ticket-card ${isSelected ? "is-selected" : ""}`}
                    onClick={() => openTicket(ticket)}
                  >
                    <div className="admin-ticket-card-top">
                      <span className="admin-ticket-number">
                        {ticket.ticket_number || `Ticket ${String(id).slice(0, 8)}`}
                      </span>
                      <span className={`admin-priority priority-${priority}`}>
                        {ticket.priority || "Medium"}
                      </span>
                    </div>

                    <h3>{ticket.subject || "Untitled ticket"}</h3>
                    <p className="admin-ticket-preview">
                      {ticket.description || "No description provided."}
                    </p>

                    <div className="admin-ticket-card-bottom">
                      <span className="admin-ticket-author">
                        {ticket.author_name || ticket.author_email || ticket.email || "Author"}
                      </span>
                      <span className={`admin-status status-${String(status).toLowerCase().replace(/\s+/g, "-")}`}>
                        {status}
                      </span>
                    </div>

                    <div className="admin-ticket-card-meta">
                      <span>{ticket.category || "General Inquiry"}</span>
                      <span>{formatDate(ticket.created_at)}</span>
                    </div>
                    <div className="admin-ticket-card-age">
                      <span className={isAging(ticket) ? "is-aging" : ""}>
                        {formatAge(ticket.created_at)}
                      </span>
                      <span>
                        {ticket.assigned_to ? "Assigned" : "Unassigned"}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </aside>

          <section className="admin-detail-column">
            {!selectedTicket ? (
              <div className="admin-detail-empty">
                <div className="admin-detail-empty-icon">↖</div>
                <h2>Select a ticket</h2>
                <p>Choose a ticket from the queue to review the request and respond.</p>
              </div>
            ) : (
              <>
                <div className="admin-detail-header">
                  <div className="admin-detail-title">
                    <p className="admin-eyebrow">
                      {selectedTicket.ticket_number || `Ticket ${String(getTicketId(selectedTicket)).slice(0, 8)}`}
                    </p>
                    <h2>{selectedTicket.subject || "Untitled ticket"}</h2>
                    <p>
                      From {selectedTicket.author_name || selectedTicket.author_email ||
                        selectedTicket.email || "Unknown author"}
                      {" · "}
                      {formatDate(selectedTicket.created_at)}
                    </p>
                  </div>

                  <div className="admin-detail-header-actions">
                    <span className={`admin-priority priority-${String(selectedTicket.priority || "Medium").toLowerCase()}`}>
                      {selectedTicket.priority || "Medium"} priority
                    </span>
                    <button className="admin-button admin-button-secondary" onClick={assignToMe} disabled={busy}>
                      Assign to me
                    </button>
                  </div>
                </div>

                <div className="admin-detail-scroll">
                  <section className="admin-section-card">
                    <SectionHeading title="Original request" subtitle="The message submitted by the author" />
                    <div className="admin-original-message">
                      {selectedTicket.description || "No description provided."}
                    </div>
                    <div className="admin-ticket-context">
                      <span><strong>Category</strong>{selectedTicket.category || "General Inquiry"}</span>
                      <span><strong>Priority</strong>{selectedTicket.priority || "Medium"}</span>
                      <span><strong>Status</strong>{selectedTicket.status || "Open"}</span>
                      <span><strong>Age</strong>{formatAge(selectedTicket.created_at)}</span>
                      <span><strong>Owner</strong>{selectedTicket.assigned_to ? "Assigned" : "Unassigned"}</span>
                    </div>
                  </section>

                  <section className="admin-section-card">
                    <SectionHeading
                      title="Related tickets"
                      subtitle="Heuristic matches based on shared wording and category; review before treating these as duplicates."
                    />
                    {similarTickets.length === 0 ? (
                      <p className="admin-related-empty">
                        No strongly related tickets found in the current queue.
                      </p>
                    ) : (
                      <div className="admin-related-list">
                        {similarTickets.map(({ ticket, score, sharedTerms, sameCategory }) => (
                          <button
                            type="button"
                            key={getTicketId(ticket)}
                            className="admin-related-ticket"
                            onClick={() => openTicket(ticket)}
                          >
                            <span className="admin-related-ticket-heading">
                              <strong>
                                {ticket.ticket_number || `Ticket ${String(getTicketId(ticket)).slice(0, 8)}`}
                              </strong>
                              <span>{Math.round(score * 100)}% match</span>
                            </span>
                            <span className="admin-related-ticket-subject">
                              {ticket.subject || "Untitled ticket"}
                            </span>
                            <span className="admin-related-ticket-meta">
                              {sameCategory ? `${ticket.category} · ` : ""}
                              Shared terms: {sharedTerms.join(", ")}
                            </span>
                          </button>
                        ))}
                      </div>
                    )}
                  </section>

                  <section className="admin-section-card">
                    <SectionHeading title="Ticket management" subtitle="Review and override the ticket fields" />
                    <div className="admin-management-grid">
                      <label>
                        <span>Status</span>
                        <select
                          value={selectedTicket.status || "Open"}
                          disabled={busy}
                          onChange={(e) => updateTicket({ status: e.target.value })}
                        >
                          {STATUSES.map((value) => <option key={value}>{value}</option>)}
                        </select>
                      </label>

                      <label>
                        <span>Priority</span>
                        <select
                          value={selectedTicket.priority || "Medium"}
                          disabled={busy}
                          onChange={(e) => updateTicket({ priority: e.target.value })}
                        >
                          {PRIORITIES.map((value) => <option key={value}>{value}</option>)}
                        </select>
                      </label>

                      <label className="admin-management-wide">
                        <span>Category</span>
                        <select
                          value={selectedTicket.category || "General Inquiry"}
                          disabled={busy}
                          onChange={(e) => updateTicket({ category: e.target.value })}
                        >
                          {CATEGORIES.map((value) => <option key={value}>{value}</option>)}
                        </select>
                      </label>
                    </div>
                  </section>

                  <section className="admin-section-card">
                    <SectionHeading
                      title="AI assistance"
                      subtitle="Generate suggestions for an administrator to review"
                    />

                    <div className="admin-ai-actions">
                      <button className="admin-button admin-button-primary" onClick={classifyTicket} disabled={busy}>
                        ✦ Classify with AI
                      </button>
                      <button className="admin-button admin-button-secondary" onClick={generateDraft} disabled={busy}>
                        ✦ Draft a reply
                      </button>
                    </div>

                    {classification && (
                      <div className="admin-ai-result">
                        <div className="admin-ai-result-heading">
                          <strong>Suggested classification</strong>
                          <span>Review before applying</span>
                        </div>
                        <p>
                          Category: <strong>{classification.category || classification.suggested_category || "Not provided"}</strong>
                        </p>
                        <p>
                          Priority: <strong>{classification.priority || classification.suggested_priority || "Not provided"}</strong>
                        </p>
                        {(classification.reason || classification.explanation) && (
                          <p className="admin-ai-reason">
                            {classification.reason || classification.explanation}
                          </p>
                        )}
                        <button className="admin-button admin-button-primary" onClick={applyClassification} disabled={busy}>
                          Apply AI suggestions
                        </button>
                      </div>
                    )}
                  </section>

                  <section className="admin-section-card">
                    <SectionHeading
                      title="Reply to author"
                      subtitle="Review and edit the message before sending"
                    />
                    <form onSubmit={sendReply}>
                      <textarea
                        className="admin-textarea"
                        value={reply}
                        onChange={(e) => setReply(e.target.value)}
                        placeholder="Write a helpful response to the author…"
                        rows={6}
                        required
                      />
                      <div className="admin-compose-footer">
                        <span>{reply.length} characters</span>
                        <button
                          type="submit"
                          className="admin-button admin-button-primary"
                          disabled={busy || !reply.trim()}
                        >
                          {busy ? "Please wait…" : "Send reply"}
                        </button>
                      </div>
                    </form>
                  </section>

                  <section className="admin-section-card">
                    <SectionHeading
                      title="Internal notes"
                      subtitle="Private notes visible only to administrators"
                    />

                    <form onSubmit={addNote} className="admin-note-form">
                      <textarea
                        className="admin-textarea admin-note-textarea"
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        placeholder="Add an internal note for your team…"
                        rows={3}
                        required
                      />
                      <div className="admin-compose-footer">
                        <span>Not visible to the author</span>
                        <button type="submit" className="admin-button admin-button-secondary" disabled={busy || !note.trim()}>
                          Add note
                        </button>
                      </div>
                    </form>

                    <div className="admin-notes-list">
                      {notes.length === 0 ? (
                        <p className="admin-notes-empty">No internal notes yet.</p>
                      ) : notes.map((item) => (
                        <article className="admin-note-item" key={item.id}>
                          <div>
                            <strong>{item.admin_email || "Administrator"}</strong>
                            <time>{formatDate(item.created_at)}</time>
                          </div>
                          <p>{item.note}</p>
                        </article>
                      ))}
                    </div>
                  </section>
                </div>
              </>
            )}
          </section>
        </section>

        <footer className="admin-footer">
          BookLeaf Support Operations <span>·</span> Internal workspace
        </footer>
      </main>
    </div>
  );
}

function Stat({ label, value, icon, urgent = false, action, active = false }) {
  const className = `admin-stat-card ${urgent ? "admin-stat-urgent" : ""} ${active ? "is-active" : ""}`;

  if (action) {
    return (
      <button type="button" className={className} onClick={action} aria-pressed={active}>
        <div className="admin-stat-icon">{icon}</div>
        <div className="admin-stat-copy">
          <span>{label}</span>
          <strong>{value}</strong>
        </div>
      </button>
    );
  }

  return (
    <article className={className}>
      <div className="admin-stat-icon">{icon}</div>
      <div className="admin-stat-copy">
        <span>{label}</span>
        <strong>{value}</strong>
      </div>
    </article>
  );
}

function SectionHeading({ title, subtitle }) {
  return (
    <div className="admin-section-title">
      <div>
        <h3>{title}</h3>
        <p>{subtitle}</p>
      </div>
    </div>
  );
}
