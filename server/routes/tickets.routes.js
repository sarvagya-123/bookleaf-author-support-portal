const express = require("express");
const router = express.Router();
const pool = require("../db");
const {
  authenticateToken,
  requireRole,
} = require("../middleware/auth");
const { suggestClassification } = require("../ai.service");

const VALID_CATEGORIES = [
  "Royalty & Payments",
  "ISBN & Metadata Issues",
  "Printing & Quality",
  "Distribution & Availability",
  "Book Status & Production Updates",
  "General Inquiry",
];

const VALID_PRIORITIES = ["Critical", "High", "Medium", "Low"];

// Resolve the logged-in user's author record.
async function getAuthorId(userId) {
  const result = await pool.query(
    `SELECT author_id
     FROM public.authors
     WHERE user_id = $1`,
    [userId]
  );

  return result.rows[0]?.author_id || null;
}

// GET /api/tickets?limit=3
router.get(
  "/",
  authenticateToken,
  requireRole("author", "admin"),
  async (req, res) => {
    try {
      const limit = Math.min(
        Math.max(parseInt(req.query.limit, 10) || 50, 1),
        100
      );

      let result;

      if (req.user.role === "admin") {
        result = await pool.query(
          `SELECT t.*, b.title AS book_title
           FROM public.tickets t
           LEFT JOIN public.books b ON b.book_id = t.book_id
           ORDER BY t.created_at DESC
           LIMIT $1`,
          [limit]
        );
      } else {
        const authorId = await getAuthorId(req.user.id);

        if (!authorId) {
          return res.status(403).json({
            success: false,
            message: "No author profile is linked to this account.",
          });
        }

        result = await pool.query(
          `SELECT t.*, b.title AS book_title
           FROM public.tickets t
           LEFT JOIN public.books b ON b.book_id = t.book_id
           WHERE t.author_id = $1
           ORDER BY t.created_at DESC
           LIMIT $2`,
          [authorId, limit]
        );
      }

      return res.json({
        success: true,
        tickets: result.rows,
        count: result.rows.length,
      });
    } catch (error) {
      console.error("Fetch tickets error:", error.message);
      return res.status(500).json({
        success: false,
        message: "Failed to fetch tickets.",
      });
    }
  }
);

// GET /api/tickets/:id
router.get(
  "/:id",
  authenticateToken,
  requireRole("author", "admin"),
  async (req, res) => {
    try {
      const params = [req.params.id];
      let ownership = "";

      if (req.user.role === "author") {
        const authorId = await getAuthorId(req.user.id);

        if (!authorId) {
          return res.status(403).json({
            success: false,
            message: "No author profile is linked to this account.",
          });
        }

        params.push(authorId);
        ownership = "AND t.author_id = $2";
      }

      const result = await pool.query(
        `SELECT t.*, b.title AS book_title
         FROM public.tickets t
         LEFT JOIN public.books b ON b.book_id = t.book_id
         WHERE t.id = $1 ${ownership}`,
        params
      );

      if (!result.rowCount) {
        return res.status(404).json({
          success: false,
          message: "Ticket not found.",
        });
      }

      return res.json({
        success: true,
        ticket: result.rows[0],
      });
    } catch (error) {
      console.error("Get ticket error:", error.message);
      return res.status(500).json({
        success: false,
        message: "Failed to fetch ticket.",
      });
    }
  }
);

// GET /api/tickets/:id/messages
router.get(
  "/:id/messages",
  authenticateToken,
  requireRole("author", "admin"),
  async (req, res) => {
    try {
      const params = [req.params.id];
      let ownership = "";

      if (req.user.role === "author") {
        const authorId = await getAuthorId(req.user.id);

        if (!authorId) {
          return res.status(403).json({
            success: false,
            message: "No author profile is linked to this account.",
          });
        }

        params.push(authorId);
        ownership = "AND t.author_id = $2";
      }

      const ticket = await pool.query(
        `SELECT t.id
         FROM public.tickets t
         WHERE t.id = $1 ${ownership}`,
        params
      );

      if (!ticket.rowCount) {
        return res.status(404).json({
          success: false,
          message: "Ticket not found.",
        });
      }

      const result = await pool.query(
        `SELECT
           tm.id,
           tm.ticket_id,
           tm.sender_user_id,
           tm.message,
           tm.created_at,
           u.role AS sender_role
         FROM public.ticket_messages tm
         LEFT JOIN public.users u
           ON u.id = tm.sender_user_id
         WHERE tm.ticket_id = $1
         ORDER BY tm.created_at ASC`,
        [req.params.id]
      );

      return res.json({
        success: true,
        messages: result.rows,
        count: result.rows.length,
      });
    } catch (error) {
      console.error("Fetch messages error:", error.message);
      return res.status(500).json({
        success: false,
        message: "Failed to fetch messages.",
      });
    }
  }
);

// POST /api/tickets
router.post(
  "/",
  authenticateToken,
  requireRole("author"),
  async (req, res) => {
    const { subject, message, bookId, category: selectedCategory } = req.body;

    if (
      typeof subject !== "string" ||
      !subject.trim() ||
      subject.trim().length > 300 ||
      typeof message !== "string" ||
      !message.trim() ||
      message.trim().length > 10000
    ) {
      return res.status(400).json({
        success: false,
        message: "A subject (max 300 characters) and message (max 10,000 characters) are required.",
      });
    }

    if (
      selectedCategory !== undefined &&
      !VALID_CATEGORIES.includes(selectedCategory)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid issue category.",
      });
    }

    let client;

    try {
      const authorId = await getAuthorId(req.user.id);

      if (!authorId) {
        return res.status(403).json({
          success: false,
          message: "No author profile is linked to this account.",
        });
      }

      if (bookId) {
        const book = await pool.query(
          `SELECT book_id
           FROM public.books
           WHERE book_id = $1 AND author_id = $2`,
          [bookId, authorId]
        );

        if (!book.rowCount) {
          return res.status(400).json({
            success: false,
            message: "Selected book does not belong to your account.",
          });
        }
      }

      // Automatically classify each new ticket.
      const classification = await suggestClassification({
        subject: subject.trim(),
        description: message.trim(),
      });

      const category =
        selectedCategory ||
        (VALID_CATEGORIES.includes(classification.category)
          ? classification.category
          : "General Inquiry");

      const priority = VALID_PRIORITIES.includes(classification.priority)
        ? classification.priority
        : "Medium";

      client = await pool.connect();
      await client.query("BEGIN");

      const created = await client.query(
        `INSERT INTO public.tickets
          (author_id, book_id, subject, description, category, priority, status)
         VALUES ($1, $2, $3, $4, $5, $6, 'Open')
         RETURNING *`,
        [
          authorId,
          bookId || null,
          subject.trim(),
          message.trim(),
          category,
          priority,
        ]
      );

      const ticket = created.rows[0];

      await client.query(
        `INSERT INTO public.ticket_messages
          (ticket_id, sender_user_id, message)
         VALUES ($1, $2, $3)`,
        [ticket.id, req.user.id, message.trim()]
      );

      await client.query("COMMIT");

      return res.status(201).json({
        success: true,
        message: "Ticket created and classified successfully.",
        ticket,
        classification: {
          category,
          priority,
          reason: classification.reason,
        },
      });
    } catch (error) {
      if (client) {
        try {
          await client.query("ROLLBACK");
        } catch (rollbackError) {
          console.error("Ticket rollback error:", rollbackError.message);
        }
      }

      console.error("Create ticket error:", error.message);

      return res.status(500).json({
        success: false,
        message: "Failed to create ticket.",
      });
    } finally {
      if (client) client.release();
    }
  }
);

// POST /api/tickets/:id/messages
router.post(
  "/:id/messages",
  authenticateToken,
  requireRole("author"),
  async (req, res) => {
    try {
      const { message } = req.body;

      if (typeof message !== "string" || !message.trim()) {
        return res.status(400).json({
          success: false,
          message: "Message content is required.",
        });
      }

      const authorId = await getAuthorId(req.user.id);

      if (!authorId) {
        return res.status(403).json({
          success: false,
          message: "No author profile is linked to this account.",
        });
      }

      const result = await pool.query(
        `INSERT INTO public.ticket_messages
           (ticket_id, sender_user_id, message)
         SELECT t.id, $3, $4
         FROM public.tickets t
         WHERE t.id = $1
           AND t.author_id = $2
           AND t.status NOT IN ('Resolved', 'Closed')
         RETURNING *`,
        [req.params.id, authorId, req.user.id, message.trim()]
      );

      if (!result.rowCount) {
        return res.status(404).json({
          success: false,
          message: "Ticket not found or is already closed.",
        });
      }

      await pool.query(
        `UPDATE public.tickets
         SET updated_at = NOW()
         WHERE id = $1`,
        [req.params.id]
      );

      return res.status(201).json({
        success: true,
        message: "Message added successfully.",
        data: result.rows[0],
      });
    } catch (error) {
      console.error("Add message error:", error.message);
      return res.status(500).json({
        success: false,
        message: "Failed to add message.",
      });
    }
  }
);

// PUT /api/tickets/:id — admin only
router.put(
  "/:id",
  authenticateToken,
  requireRole("admin"),
  async (req, res) => {
    try {
      const { status, priority, assignedTo } = req.body;
      const allowedStatuses = [
        "Open",
        "In Progress",
        "Resolved",
        "Closed",
      ];
      const allowedPriorities = ["Critical", "High", "Medium", "Low"];

      if (
        status !== undefined &&
        !allowedStatuses.includes(status)
      ) {
        return res.status(400).json({
          success: false,
          message: "Invalid ticket status.",
        });
      }

      if (
        priority !== undefined &&
        !allowedPriorities.includes(priority)
      ) {
        return res.status(400).json({
          success: false,
          message: "Invalid ticket priority.",
        });
      }

      const result = await pool.query(
        `UPDATE public.tickets
         SET status = COALESCE($2, status),
             priority = COALESCE($3, priority),
             assigned_to = COALESCE($4, assigned_to),
             updated_at = NOW(),
             resolved_at = CASE
               WHEN $2 = 'Resolved' THEN NOW()
               ELSE resolved_at
             END,
             closed_at = CASE
               WHEN $2 = 'Closed' THEN NOW()
               ELSE closed_at
             END
         WHERE id = $1
         RETURNING *`,
        [
          req.params.id,
          status ?? null,
          priority ?? null,
          assignedTo ?? null,
        ]
      );

      if (!result.rowCount) {
        return res.status(404).json({
          success: false,
          message: "Ticket not found.",
        });
      }

      return res.json({
        success: true,
        message: "Ticket updated successfully.",
        ticket: result.rows[0],
      });
    } catch (error) {
      console.error("Update ticket error:", error.message);
      return res.status(500).json({
        success: false,
        message: "Failed to update ticket.",
      });
    }
  }
);

// POST /api/tickets/:id/close — admin only
router.post(
  "/:id/close",
  authenticateToken,
  requireRole("admin"),
  async (req, res) => {
    try {
      const result = await pool.query(
        `UPDATE public.tickets
         SET status = 'Closed',
             closed_at = NOW(),
             updated_at = NOW()
         WHERE id = $1
         RETURNING *`,
        [req.params.id]
      );

      if (!result.rowCount) {
        return res.status(404).json({
          success: false,
          message: "Ticket not found.",
        });
      }

      return res.json({
        success: true,
        message: "Ticket closed successfully.",
        ticket: result.rows[0],
      });
    } catch (error) {
      console.error("Close ticket error:", error.message);
      return res.status(500).json({
        success: false,
        message: "Failed to close ticket.",
      });
    }
  }
);

module.exports = router;