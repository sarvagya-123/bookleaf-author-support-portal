const express = require("express");
const pool = require("../db");
const {
  authenticateToken,
  DEMO_AUTHOR_ID,
  isDemoAdmin,
  requireRole,
} = require("../middleware/auth");

const router = express.Router();

const STATUSES = ["Open", "In Progress", "Resolved", "Closed"];
const PRIORITIES = ["Critical", "High", "Medium", "Low"];

const CATEGORIES = [
  "Royalty & Payments",
  "ISBN & Metadata Issues",
  "Printing & Quality",
  "Distribution & Availability",
  "Book Status & Production Updates",
  "General Inquiry",
];

// GET: List and filter all tickets
router.get(
  "/tickets",
  authenticateToken,
  requireRole("admin"),
  async (req, res) => {
    try {
      const { status, category, priority, from_date } = req.query;
      const conditions = [];
      const values = [];

      if (isDemoAdmin(req.user)) {
        values.push(DEMO_AUTHOR_ID);
        conditions.push(`t.author_id = $${values.length}`);
      }

      if (status) {
        if (!STATUSES.includes(status)) {
          return res.status(400).json({
            success: false,
            message: "Invalid status.",
          });
        }
        values.push(status);
        conditions.push(`t.status = $${values.length}`);
      }

      if (category) {
        if (!CATEGORIES.includes(category)) {
          return res.status(400).json({
            success: false,
            message: "Invalid category.",
          });
        }
        values.push(category);
        conditions.push(`t.category = $${values.length}`);
      }

      if (priority) {
        if (!PRIORITIES.includes(priority)) {
          return res.status(400).json({
            success: false,
            message: "Invalid priority.",
          });
        }
        values.push(priority);
        conditions.push(`t.priority = $${values.length}`);
      }

      if (from_date) {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(from_date)) {
          return res.status(400).json({
            success: false,
            message: 'Invalid from_date. Use YYYY-MM-DD.',
          });
        }

        values.push(from_date);
        conditions.push(`t.created_at >= $${values.length}::date`);
      }

      const whereClause = conditions.length
        ? `WHERE ${conditions.join(" AND ")}`
        : "";

      const result = await pool.query(
        `SELECT
            t.id,
            t.ticket_number,
            t.author_id,
            a.name AS author_name,
            t.subject,
            t.description,
            t.category,
            t.priority,
            t.status,
            t.assigned_to,
            t.created_at,
            t.updated_at,
            b.title AS book_title
           FROM public.tickets t
           JOIN public.authors a ON a.author_id = t.author_id
           LEFT JOIN public.books b ON b.book_id = t.book_id
           ${whereClause}
           ORDER BY
             CASE t.priority
               WHEN 'Critical' THEN 1
               WHEN 'High' THEN 2
               WHEN 'Medium' THEN 3
               WHEN 'Low' THEN 4
             END,
             t.created_at ASC`,
        values
      );

      return res.json({
        success: true,
        count: result.rowCount,
        tickets: result.rows,
      });
    } catch (error) {
      console.error("Admin list tickets:", error.message);
      return res.status(500).json({
        success: false,
        message: "Could not fetch tickets.",
      });
    }
  }
);

// PATCH: Update ticket status, priority, and/or category
router.patch(
  "/tickets/:ticketId",
  authenticateToken,
  requireRole("admin"),
  async (req, res) => {
    try {
      const { ticketId } = req.params;
      const { status, priority, category } = req.body;

      if (status === undefined && priority === undefined && category === undefined) {
        return res.status(400).json({
          success: false,
          message: "Provide a status, priority, or category.",
        });
      }

      if (status !== undefined && !STATUSES.includes(status)) {
        return res.status(400).json({
          success: false,
          message: "Invalid status.",
        });
      }

      if (priority !== undefined && !PRIORITIES.includes(priority)) {
        return res.status(400).json({
          success: false,
          message: "Invalid priority.",
        });
      }

      if (category !== undefined && !CATEGORIES.includes(category)) {
        return res.status(400).json({
          success: false,
          message: "Invalid category.",
        });
      }

      const result = await pool.query(
        `UPDATE public.tickets
         SET status = COALESCE($1, status),
             priority = COALESCE($2, priority),
             category = COALESCE($3, category),
             resolved_at = CASE
               WHEN $1 = 'Resolved' AND status <> 'Resolved'
                 THEN NOW()
               WHEN $1 IS NOT NULL AND $1 <> 'Resolved'
                 THEN NULL
               ELSE resolved_at
             END,
             closed_at = CASE
               WHEN $1 = 'Closed' AND status <> 'Closed'
                 THEN NOW()
               WHEN $1 IS NOT NULL AND $1 <> 'Closed'
                 THEN NULL
               ELSE closed_at
             END,
             updated_at = NOW()
         WHERE id = $4
         RETURNING id, ticket_number, status, priority, category, updated_at`,
        [status ?? null, priority ?? null, category ?? null, ticketId]
      );

      if (!result.rowCount) {
        return res.status(404).json({
          success: false,
          message: "Ticket not found.",
        });
      }

      return res.json({ success: true, ticket: result.rows[0] });
    } catch (error) {
      console.error("Admin update ticket:", error.message);
      return res.status(500).json({
        success: false,
        message: "Could not update ticket.",
      });
    }
  }
);

// POST: Reply to an author
router.post(
  "/tickets/:ticketId/replies",
  authenticateToken,
  requireRole("admin"),
  async (req, res) => {
    try {
      const { ticketId } = req.params;
      const { message } = req.body;

      if (
        typeof message !== "string" ||
        !message.trim() ||
        message.trim().length > 10000
      ) {
        return res.status(400).json({
          success: false,
          message: "A message of 1–10,000 characters is required.",
        });
      }

      const ticketResult = await pool.query(
        `SELECT id
         FROM public.tickets
         WHERE id = $1`,
        [ticketId]
      );

      if (ticketResult.rowCount === 0) {
        return res.status(404).json({
          success: false,
          message: "Ticket not found.",
        });
      }

      const result = await pool.query(
        `INSERT INTO public.ticket_messages
          (ticket_id, sender_user_id, message)
         VALUES ($1, $2, $3)
         RETURNING id, ticket_id, message, created_at`,
        [ticketId, req.user.id, message.trim()]
      );

      await pool.query(
        `UPDATE public.tickets
         SET updated_at = NOW()
         WHERE id = $1`,
        [ticketId]
      );

      return res.status(201).json({
        success: true,
        message: "Reply sent successfully.",
        reply: result.rows[0],
      });
    } catch (error) {
      console.error("Send admin reply error:", error.message);
      return res.status(500).json({
        success: false,
        message: "Could not send reply.",
      });
    }
  }
);

// POST: Add private internal note
router.post(
  "/tickets/:ticketId/notes",
  authenticateToken,
  requireRole("admin"),
  async (req, res) => {
    try {
      const { ticketId } = req.params;
      const { note } = req.body;

      if (
        typeof note !== "string" ||
        !note.trim() ||
        note.trim().length > 5000
      ) {
        return res.status(400).json({
          success: false,
          message: "A note of 1–5,000 characters is required.",
        });
      }

      const ticketResult = await pool.query(
        `SELECT id
         FROM public.tickets
         WHERE id = $1`,
        [ticketId]
      );

      if (ticketResult.rowCount === 0) {
        return res.status(404).json({
          success: false,
          message: "Ticket not found.",
        });
      }

      const result = await pool.query(
        `INSERT INTO public.ticket_notes
          (ticket_id, admin_user_id, note)
         VALUES ($1, $2, $3)
         RETURNING id, ticket_id, note, created_at`,
        [ticketId, req.user.id, note.trim()]
      );

      return res.status(201).json({
        success: true,
        message: "Internal note saved successfully.",
        note: result.rows[0],
      });
    } catch (error) {
      console.error("Add internal note error:", error.message);
      return res.status(500).json({
        success: false,
        message: "Could not save internal note.",
      });
    }
  }
);

// GET: View private notes (admin only)
router.get(
  "/tickets/:ticketId/notes",
  authenticateToken,
  requireRole("admin"),
  async (req, res) => {
    try {
      const demoScope = isDemoAdmin(req.user)
        ? `AND EXISTS (
             SELECT 1
             FROM public.tickets t
             WHERE t.id = n.ticket_id AND t.author_id = $2
           )`
        : "";
      const params = isDemoAdmin(req.user)
        ? [req.params.ticketId, DEMO_AUTHOR_ID]
        : [req.params.ticketId];
      const result = await pool.query(
        `SELECT
            n.id,
            n.note,
            n.created_at,
            u.email AS admin_email
         FROM public.ticket_notes n
         JOIN public.users u
           ON u.id = n.admin_user_id
         WHERE n.ticket_id = $1
           ${demoScope}
         ORDER BY n.created_at ASC`,
        params
      );

      return res.json({
        success: true,
        count: result.rowCount,
        notes: result.rows,
      });
    } catch (error) {
      console.error("Fetch internal notes error:", error.message);
      return res.status(500).json({
        success: false,
        message: "Could not fetch internal notes.",
      });
    }
  }
);

// PATCH: Assign ticket to the logged-in admin
router.patch(
  "/tickets/:ticketId/assign",
  authenticateToken,
  requireRole("admin"),
  async (req, res) => {
    try {
      const result = await pool.query(
        `UPDATE public.tickets
         SET assigned_to = $1,
             updated_at = NOW()
         WHERE id = $2
         RETURNING id, ticket_number, assigned_to, updated_at`,
        [req.user.id, req.params.ticketId]
      );

      if (!result.rowCount) {
        return res.status(404).json({
          success: false,
          message: "Ticket not found.",
        });
      }

      return res.json({
        success: true,
        message: "Ticket assigned to you successfully.",
        ticket: result.rows[0],
      });
    } catch (error) {
      console.error("Assign ticket error:", error.message);
      return res.status(500).json({
        success: false,
        message: "Could not assign ticket.",
      });
    }
  }
);

module.exports = router;