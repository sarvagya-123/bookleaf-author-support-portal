
const fs = require("fs");
const path = require("path");
const pool = require("./db");

const dataPath = path.join(
  __dirname,
  "data",
  "bookleaf_sample_data.json"
);

async function seedDatabase() {
  const client = await pool.connect();

  try {
    const rawData = fs.readFileSync(dataPath, "utf8");
    const data = JSON.parse(rawData);

    if (!Array.isArray(data.authors)) {
      throw new Error("The JSON must contain an authors array.");
    }

    const authorCount = data.authors.length;
    const bookCount = data.authors.reduce(
      (total, author) =>
        total + (Array.isArray(author.books) ? author.books.length : 0),
      0
    );

    if (authorCount !== 10 || bookCount !== 18) {
      throw new Error(
        `Expected 10 authors and 18 books; found ${authorCount} authors and ${bookCount} books.`
      );
    }

    await client.query("BEGIN");

    for (const author of data.authors) {
      await client.query(
        `INSERT INTO public.authors
          (author_id, name, email, phone, city, joined_date)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (author_id) DO UPDATE SET
           name = EXCLUDED.name,
           email = EXCLUDED.email,
           phone = EXCLUDED.phone,
           city = EXCLUDED.city,
           joined_date = EXCLUDED.joined_date`,
        [
          author.author_id,
          author.name,
          author.email,
          author.phone ?? null,
          author.city ?? null,
          author.joined_date ?? null,
        ]
      );

      for (const book of author.books ?? []) {
        await client.query(
          `INSERT INTO public.books (
             book_id, author_id, title, isbn, genre,
             publication_date, status, mrp,
             author_royalty_per_copy, total_copies_sold,
             total_royalty_earned, royalty_paid, royalty_pending,
             last_royalty_payout_date, print_partner, available_on
           )
           VALUES (
             $1, $2, $3, $4, $5, $6, $7, $8,
             $9, $10, $11, $12, $13, $14, $15, $16
           )
           ON CONFLICT (book_id) DO UPDATE SET
             author_id = EXCLUDED.author_id,
             title = EXCLUDED.title,
             isbn = EXCLUDED.isbn,
             genre = EXCLUDED.genre,
             publication_date = EXCLUDED.publication_date,
             status = EXCLUDED.status,
             mrp = EXCLUDED.mrp,
             author_royalty_per_copy = EXCLUDED.author_royalty_per_copy,
             total_copies_sold = EXCLUDED.total_copies_sold,
             total_royalty_earned = EXCLUDED.total_royalty_earned,
             royalty_paid = EXCLUDED.royalty_paid,
             royalty_pending = EXCLUDED.royalty_pending,
             last_royalty_payout_date = EXCLUDED.last_royalty_payout_date,
             print_partner = EXCLUDED.print_partner,
             available_on = EXCLUDED.available_on`,
          [
            book.book_id,
            author.author_id,
            book.title,
            book.isbn ?? null,
            book.genre ?? null,
            book.publication_date ?? null,
            book.status,
            book.mrp ?? null,
            book.author_royalty_per_copy ?? null,
            book.total_copies_sold ?? 0,
            book.total_royalty_earned ?? 0,
            book.royalty_paid ?? 0,
            book.royalty_pending ?? 0,
            book.last_royalty_payout_date ?? null,
            book.print_partner ?? null,
            book.available_on ?? [],
          ]
        );
      }
    }

    const authorsResult = await client.query(
      "SELECT COUNT(*)::int AS count FROM public.authors"
    );

    const booksResult = await client.query(
      "SELECT COUNT(*)::int AS count FROM public.books"
    );

    await client.query("COMMIT");

    console.log("Sample data imported successfully.");
    console.log("Authors in database:", authorsResult.rows[0].count);
    console.log("Books in database:", booksResult.rows[0].count);
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Seed failed:", error.message);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

seedDatabase();
