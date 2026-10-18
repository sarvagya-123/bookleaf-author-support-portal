require("dotenv").config();
const db = require("./db");
const bcrypt = require("bcryptjs");

async function main() {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;

  try {
    if (!email || !password || password.length < 8) {
      throw new Error(
        "Set ADMIN_EMAIL and an ADMIN_PASSWORD of at least 8 characters before provisioning an admin."
      );
    }

    const hash = await bcrypt.hash(password, 10);

    const existing = await db.query(
      "SELECT id FROM public.users WHERE email = $1",
      [email]
    );

    if (existing.rowCount > 0) {
      // Force update existing admin password
      await db.query(
        "UPDATE public.users SET password_hash = $1, role = 'admin', is_active = true WHERE email = $2",
        [hash, email]
      );
      console.log("Admin password successfully updated.");
    } else {
      // Create admin if missing
      await db.query(
        `INSERT INTO public.users (email, password_hash, role, is_active)
         VALUES ($1, $2, 'admin', true)`,
        [email, hash]
      );
      console.log("Admin account successfully created.");
    }

  } catch (error) {
    console.error("Admin provisioning error:", error.message);
    process.exitCode = 1;
  } finally {
    await db.end();
  }
}

main();