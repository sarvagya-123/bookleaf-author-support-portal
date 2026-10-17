
const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const pool = require("../db");

const SECRET_KEY = process.env.JWT_SECRET;

if (!SECRET_KEY) {
  console.error("Missing JWT_SECRET in server/.env");
}

// Register an author account
router.post("/register", async (req, res) => {
  let client;

  try {
    const { email, password, name } = req.body;

    if (
      typeof email !== "string" ||
      typeof password !== "string" ||
      !email.trim() ||
      !password
    ) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required.",
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 8 characters.",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const existingUser = await pool.query(
      `SELECT id FROM public.users WHERE LOWER(email) = $1`,
      [normalizedEmail]
    );

    if (existingUser.rowCount > 0) {
      return res.status(409).json({
        success: false,
        message: "An account with this email already exists.",
      });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    client = await pool.connect();
    await client.query("BEGIN");

    const userResult = await client.query(
      `INSERT INTO public.users
         (email, password_hash, role, is_active)
       VALUES ($1, $2, 'author', TRUE)
       RETURNING id, email, role, is_active`,
      [normalizedEmail, passwordHash]
    );

    const user = userResult.rows[0];

    // Link an existing author profile only when it is unlinked.
    await client.query(
      `UPDATE public.authors
       SET user_id = $1, updated_at = NOW()
       WHERE LOWER(email) = $2
         AND user_id IS NULL`,
      [user.id, normalizedEmail]
    );

    await client.query("COMMIT");

    return res.status(201).json({
      success: true,
      message: "Account created successfully.",
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        name: name || normalizedEmail.split("@")[0],
      },
    });
  } catch (error) {
    if (client) {
      await client.query("ROLLBACK").catch(() => {});
    }

    console.error("Registration error:", error.message);

    if (error.code === "23505") {
      return res.status(409).json({
        success: false,
        message: "An account with this email already exists.",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Unable to register right now.",
    });
  } finally {
    if (client) client.release();
  }
});

// Login for authors and admins
router.post("/login", async (req, res) => {
  try {
    if (!SECRET_KEY) {
      return res.status(500).json({
        success: false,
        message: "Authentication is not configured on the server.",
      });
    }

    const { email, password } = req.body;

    if (
      typeof email !== "string" ||
      typeof password !== "string" ||
      !email.trim() ||
      !password
    ) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required.",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const result = await pool.query(
      `SELECT id, email, password_hash, role, is_active
       FROM public.users
       WHERE LOWER(email) = $1
       LIMIT 1`,
      [normalizedEmail]
    );

    const user = result.rows[0];

    if (!user || !user.password_hash) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password.",
      });
    }

    if (!user.is_active) {
      return res.status(403).json({
        success: false,
        message: "This account is inactive. Please contact support.",
      });
    }

    const passwordMatches = await bcrypt.compare(
      password,
      user.password_hash
    );

    if (!passwordMatches) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password.",
      });
    }

    if (!["author", "admin"].includes(user.role)) {
      return res.status(403).json({
        success: false,
        message: "This account role is not supported.",
      });
    }

    // Use the standard JWT subject claim. The auth middleware reads decoded.sub.
    const token = jwt.sign(
      {
        sub: user.id,
        email: user.email,
        role: user.role,
      },
      SECRET_KEY,
      { expiresIn: "7d" }
    );

    return res.json({
      success: true,
      message: "Login successful.",
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.email.split("@")[0],
        role: user.role,
      },
    });
  } catch (error) {
    console.error("Login error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to log in right now. Please try again.",
    });
  }
});

// Verify a token and confirm the associated account is active.
router.post("/verify", async (req, res) => {
  try {
    if (!SECRET_KEY) {
      return res.status(500).json({
        success: false,
        message: "Authentication is not configured on the server.",
      });
    }

    const { token } = req.body;

    if (!token) {
      return res.status(400).json({
        success: false,
        message: "Token is required.",
      });
    }

    const decoded = jwt.verify(token, SECRET_KEY);

    if (!decoded.sub) {
      return res.status(401).json({
        success: false,
        message: "Token does not contain a user ID. Please log in again.",
      });
    }

    const result = await pool.query(
      `SELECT id, email, role
       FROM public.users
       WHERE id = $1 AND is_active = TRUE`,
      [decoded.sub]
    );

    if (!result.rowCount) {
      return res.status(401).json({
        success: false,
        message: "Account is inactive or does not exist.",
      });
    }

    return res.json({
      success: true,
      message: "Token is valid.",
      user: result.rows[0],
    });
  } catch (error) {
    if (error.name === "JsonWebTokenError" ||
        error.name === "TokenExpiredError") {
      return res.status(401).json({
        success: false,
        message: "Invalid or expired token. Please log in again.",
      });
    }

    console.error("Token verification error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to verify the token.",
    });
  }
});

// Logout: the frontend must clear its stored token.
router.post("/logout", (req, res) => {
  return res.json({
    success: true,
    message: "Logout successful.",
  });
});

module.exports = router;
