require("dotenv").config();
const db = require("./db");
const bcrypt = require("bcryptjs");

async function main() {
  const email = "admin@bookleaf.local";
  const password = "AdminPortal123!";

  try {
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
      console.log("✅ Admin password successfully reset!");
    } else {
      // Create admin if missing
      await db.query(
        `INSERT INTO public.users (email, password_hash, role, is_active)
         VALUES ($1, $2, 'admin', true)`,
        [email, hash]
      );
      console.log("✅ Admin account successfully created!");
    }
    
    console.log("-----------------------------------------");
    console.log("Email:    admin@bookleaf.local");
    console.log("Password: AdminPortal123!");
    console.log("-----------------------------------------");

  } catch (error) {
    console.error("❌ Error:", error.message);
  } finally {
    await db.end();
  }
}

main();