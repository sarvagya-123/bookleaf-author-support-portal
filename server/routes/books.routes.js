
const express = require("express");
const { randomUUID } = require("crypto");
const router = express.Router();

const pool = require("../db");
const {
  authenticateToken,
  requireRole,
} = require("../middleware/auth");

// All book endpoints require an authenticated author.
router.use(authenticateToken, requireRole("author"));

async function getAuthor(userId) {
  const result = await pool.query(
    `SELECT author_id, name
     FROM public.authors
     WHERE user_id = $1
     LIMIT 1`,
    [userId]
  );

  return result.rows[0] || null;
}

// Convert database records to the frontend's expected format.
function formatBook(row) {
  return {
    id: row.book_id,
    bookId: row.book_id,
    authorId: row.author_id,
    title: row.title,
    author: row.author_name ?? null,
    status: row.status,
    isbn: row.isbn,
    genre: row.genre,
    mrp: Number(row.mrp ?? 0),
    royaltyPerCopy: Number(row.author_royalty_per_copy ?? 0),
    copiesSold: Number(row.total_copies_sold ?? 0),
    earnedRoyalty: Number(row.total_royalty_earned ?? 0),
    paidRoyalty: Number(row.royalty_paid ?? 0),
    pendingRoyalty: Number(row.royalty_pending ?? 0),
    publishedDate: row.publication_date,
    lastRoyaltyPayoutDate: row.last_royalty_payout_date,
    printPartner: row.print_partner,
    availableOn: row.available_on || [],
    coverImage: null,
  };
}

const BOOK_SELECT = `
  SELECT
    b.book_id,
    b.author_id,
    b.title,
    b.isbn,
    b.genre,
    b.publication_date,
    b.status,
    b.mrp,
    b.author_royalty_per_copy,
    b.total_copies_sold,
    b.total_royalty_earned,
    b.royalty_paid,
    b.royalty_pending,
    b.last_royalty_payout_date,
    b.print_partner,
    b.available_on,
    b.created_at,
    b.updated_at,
    a.name AS author_name
  FROM public.books b
  JOIN public.authors a
    ON a.author_id = b.author_id
`;

// GET /api/books
router.get("/", async (req, res) => {
  try {
    const author = await getAuthor(req.user.id);

    if (!author) {
      return res.status(404).json({
        success: false,
        message: "No author profile is linked to this account.",
      });
    }

    const result = await pool.query(
      `${BOOK_SELECT}
       WHERE b.author_id = $1
       ORDER BY b.created_at DESC NULLS LAST, b.title ASC`,
      [author.author_id]
    );

    const books = result.rows.map(formatBook);

    return res.json({
      success: true,
      books,
      count: books.length,
    });
  } catch (error) {
    console.error("Fetch books error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch books.",
    });
  }
});

// GET /api/books/royalties/summary
router.get("/royalties/summary", async (req, res) => {
  try {
    const author = await getAuthor(req.user.id);

    if (!author) {
      return res.status(404).json({
        success: false,
        message: "No author profile is linked to this account.",
      });
    }

    const result = await pool.query(
      `SELECT
         COALESCE(SUM(total_royalty_earned), 0) AS total_earned,
         COALESCE(SUM(royalty_paid), 0) AS total_paid,
         COALESCE(SUM(royalty_pending), 0) AS total_pending
       FROM public.books
       WHERE author_id = $1`,
      [author.author_id]
    );

    const row = result.rows[0];

    const totalEarned = Number(row.total_earned);
    const totalPaid = Number(row.total_paid);
    const totalPending = Number(row.total_pending);

    return res.json({
      success: true,
      totalEarned,
      totalPaid,
      totalPending,
      paidPercentage:
        totalEarned > 0
          ? Number(((totalPaid / totalEarned) * 100).toFixed(2))
          : 0,
    });
  } catch (error) {
    console.error("Royalty summary error:", error.message);

    return res.status(500).json({
      success: true,
      message: "Failed to fetch royalty summary.",
    });
  }
});

// GET /api/books/royalties/breakdown
router.get("/royalties/breakdown", async (req, res) => {
  try {
    const author = await getAuthor(req.user.id);

    if (!author) {
      return res.status(404).json({
        success: false,
        message: "No author profile is linked to this account.",
      });
    }

    const result = await pool.query(
      `${BOOK_SELECT}
       WHERE b.author_id = $1
       ORDER BY b.title ASC`,
      [author.author_id]
    );

    const books = result.rows.map(formatBook);

    const totals = books.reduce(
      (sum, book) => ({
        totalEarned: sum.totalEarned + book.earnedRoyalty,
        totalPaid: sum.totalPaid + book.paidRoyalty,
        totalPending: sum.totalPending + book.pendingRoyalty,
      }),
      { totalEarned: 0, totalPaid: 0, totalPending: 0 }
    );

    return res.json({
      success: true,
      books,
      ...totals,
    });
  } catch (error) {
    console.error("Royalty breakdown error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch royalty breakdown.",
    });
  }
});

// GET /api/books/search/:query
router.get("/search/:query", async (req, res) => {
  try {
    const author = await getAuthor(req.user.id);

    if (!author) {
      return res.status(404).json({
        success: false,
        message: "No author profile is linked to this account.",
      });
    }

    const searchTerm = `%${req.params.query}%`;

    const result = await pool.query(
      `${BOOK_SELECT}
       WHERE b.author_id = $1
         AND (
           b.title ILIKE $2
           OR COALESCE(b.isbn, '') ILIKE $2
           OR COALESCE(b.genre, '') ILIKE $2
         )
       ORDER BY b.title ASC`,
      [author.author_id, searchTerm]
    );

    const books = result.rows.map(formatBook);

    return res.json({
      success: true,
      results: books,
      count: books.length,
    });
  } catch (error) {
    console.error("Search books error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Book search failed.",
    });
  }
});

// GET /api/books/:id
router.get("/:id", async (req, res) => {
  try {
    const author = await getAuthor(req.user.id);

    if (!author) {
      return res.status(404).json({
        success: false,
        message: "No author profile is linked to this account.",
      });
    }

    const result = await pool.query(
      `${BOOK_SELECT}
       WHERE b.author_id = $1
         AND b.book_id = $2
       LIMIT 1`,
      [author.author_id, req.params.id]
    );

    if (!result.rowCount) {
      return res.status(404).json({
        success: false,
        message: "Book not found.",
      });
    }

    return res.json({
      success: true,
      book: formatBook(result.rows[0]),
    });
  } catch (error) {
    console.error("Fetch book error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch book.",
    });
  }
});

// POST /api/books — create a draft book.
router.post("/", async (req, res) => {
  try {
    const author = await getAuthor(req.user.id);

    if (!author) {
      return res.status(404).json({
        success: false,
        message: "No author profile is linked to this account.",
      });
    }

    const { title, isbn, genre, mrp, description } = req.body;

    if (typeof title !== "string" || !title.trim()) {
      return res.status(400).json({
        success: false,
        message: "Book title is required.",
      });
    }

    if (
      mrp != null &&
      (!Number.isFinite(Number(mrp)) || Number(mrp) < 0)
    ) {
      return res.status(400).json({
        success: false,
        message: "MRP must be a valid non-negative number.",
      });
    }

    const bookId = `BOOK-${randomUUID()}`;

    const result = await pool.query(
      `INSERT INTO public.books (
         book_id,
         author_id,
         title,
         isbn,
         genre,
         status,
         mrp,
         author_royalty_per_copy,
         total_copies_sold,
         total_royalty_earned,
         royalty_paid,
         royalty_pending
       )
       VALUES ($1, $2, $3, $4, $5, 'Draft', $6, 0, 0, 0, 0, 0)
       RETURNING *`,
      [
        bookId,
        author.author_id,
        title.trim(),
        isbn || null,
        genre || null,
        mrp == null ? 0 : Number(mrp),
      ]
    );

    // Fetch the joined author name for a complete response.
    const createdResult = await pool.query(
      `${BOOK_SELECT}
       WHERE b.book_id = $1
         AND b.author_id = $2
       LIMIT 1`,
      [bookId, author.author_id]
    );

    return res.status(201).json({
      success: true,
      message: "Draft book created successfully.",
      book: {
        ...formatBook(createdResult.rows[0] || result.rows[0]),
        description: typeof description === "string" ? description : "",
      },
    });
  } catch (error) {
    console.error("Create book error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Failed to create book.",
    });
  }
});

// PUT /api/books/:id — update book details.
router.put("/:id", async (req, res) => {
  try {
    const author = await getAuthor(req.user.id);

    if (!author) {
      return res.status(404).json({
        success: false,
        message: "No author profile is linked to this account.",
      });
    }

    const { title, isbn, genre, mrp } = req.body;

    if (
      title !== undefined &&
      (typeof title !== "string" || !title.trim())
    ) {
      return res.status(400).json({
        success: false,
        message: "Book title must not be empty.",
      });
    }

    if (
      mrp != null &&
      (!Number.isFinite(Number(mrp)) || Number(mrp) < 0)
    ) {
      return res.status(400).json({
        success: false,
        message: "MRP must be a valid non-negative number.",
      });
    }

    const result = await pool.query(
      `UPDATE public.books
       SET
         title = COALESCE($1, title),
         isbn = COALESCE($2, isbn),
         genre = COALESCE($3, genre),
         mrp = COALESCE($4, mrp),
         updated_at = NOW()
       WHERE book_id = $5
         AND author_id = $6
       RETURNING book_id`,
      [
        title === undefined ? null : title.trim(),
        isbn === undefined ? null : isbn,
        genre === undefined ? null : genre,
        mrp == null ? null : Number(mrp),
        req.params.id,
        author.author_id,
      ]
    );

    if (!result.rowCount) {
      return res.status(404).json({
        success: false,
        message: "Book not found.",
      });
    }

    const updatedResult = await pool.query(
      `${BOOK_SELECT}
       WHERE b.book_id = $1
         AND b.author_id = $2
       LIMIT 1`,
      [req.params.id, author.author_id]
    );

    return res.json({
      success: true,
      message: "Book updated successfully.",
      book: formatBook(updatedResult.rows[0]),
    });
  } catch (error) {
    console.error("Update book error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Failed to update book.",
    });
  }
});

// DELETE /api/books/:id
router.delete("/:id", async (req, res) => {
  try {
    const author = await getAuthor(req.user.id);

    if (!author) {
      return res.status(404).json({
        success: false,
        message: "No author profile is linked to this account.",
      });
    }

    const result = await pool.query(
      `DELETE FROM public.books
       WHERE book_id = $1
         AND author_id = $2
       RETURNING book_id, title`,
      [req.params.id, author.author_id]
    );

    if (!result.rowCount) {
      return res.status(404).json({
        success: false,
        message: "Book not found.",
      });
    }

    return res.json({
      success: true,
      message: "Book deleted successfully.",
      book: result.rows[0],
    });
  } catch (error) {
    console.error("Delete book error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Failed to delete book. It may be referenced by other records.",
    });
  }
});

module.exports = router;
