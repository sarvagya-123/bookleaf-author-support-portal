
const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const { randomUUID, timingSafeEqual } = require("crypto");
const pool = require("../db");

const SECRET_KEY = process.env.JWT_SECRET;

if (!SECRET_KEY) {
  console.error("Missing JWT_SECRET in server/.env");
}

function secureStringEquals(candidate, expected) {
  if (typeof candidate !== "string" || typeof expected !== "string") {
    return false;
  }

  const candidateBuffer = Buffer.from(candidate);
  const expectedBuffer = Buffer.from(expected);

  return candidateBuffer.length === expectedBuffer.length &&
    timingSafeEqual(candidateBuffer, expectedBuffer);
}

async function registerAccount(req, res, role) {
  let client;

  try {
    const { email, password, name } = req.body || {};

    if (
      typeof email !== "string" ||
      typeof password !== "string" ||
      typeof name !== "string" ||
      !email.trim() ||
      !password ||
      !name.trim() ||
      email.trim().length > 254 ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) ||
      name.trim().length > 120
    ) {
      return res.status(400).json({
        success: false,
        message: "A valid email, name, and password are required.",
      });
    }

    if (password.length < 8 || password.length > 128) {
      return res.status(400).json({
        success: false,
        message: "Password must be between 8 and 128 characters.",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const passwordHash = await bcrypt.hash(password, 12);
    client = await pool.connect();
    await client.query("BEGIN");

    const existingUser = await client.query(
      `SELECT id FROM public.users WHERE LOWER(email) = $1`,
      [normalizedEmail]
    );

    if (existingUser.rowCount > 0) {
      await client.query("ROLLBACK");
      return res.status(409).json({
        success: false,
        message: "An account with this email already exists.",
      });
    }

    const userResult = await client.query(
      `INSERT INTO public.users
         (email, password_hash, role, is_active)
       VALUES ($1, $2, $3, TRUE)
       RETURNING id, email, role, is_active`,
      [normalizedEmail, passwordHash, role]
    );

    const user = userResult.rows[0];
    let accountName = name.trim();

    if (role === "author") {
      const existingAuthor = await client.query(
        `SELECT author_id, user_id, name
         FROM public.authors
         WHERE LOWER(email) = $1
         FOR UPDATE`,
        [normalizedEmail]
      );

      if (existingAuthor.rows[0]?.user_id) {
        await client.query("ROLLBACK");
        return res.status(409).json({
          success: false,
          message: "This author profile is already linked to an account.",
        });
      }

      if (existingAuthor.rowCount) {
        accountName = existingAuthor.rows[0].name || accountName;
        await client.query(
          `UPDATE public.authors
           SET user_id = $1, updated_at = NOW()
           WHERE author_id = $2`,
          [user.id, existingAuthor.rows[0].author_id]
        );
      } else {
        const authorId = `AUTH${randomUUID().replace(/-/g, "").slice(0, 16).toUpperCase()}`;
        await client.query(
          `INSERT INTO public.authors (author_id, name, email, user_id, joined_date)
           VALUES ($1, $2, $3, $4, CURRENT_DATE)`,
          [authorId, name.trim(), normalizedEmail, user.id]
        );
      }
    }

    if (!SECRET_KEY) {
      throw new Error("Authentication is not configured.");
    }

    const token = jwt.sign(
      { sub: user.id, email: user.email, role: user.role },
      SECRET_KEY,
      { expiresIn: "7d" }
    );

    await client.query("COMMIT");

    return res.status(201).json({
      success: true,
      message: "Account created successfully.",
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        name: accountName,
      },
    });
  } catch (error) {
    if (client) {
      await client.query("ROLLBACK").catch((rollbackError) => {
        console.error("Registration rollback error:", rollbackError.message);
      });
    }

    console.error("Registration error:", error.message);

    if (error.code === "23505") {
      return res.status(409).json({
        success: false,
        message: "An account or author profile with this email already exists.",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Unable to register right now.",
    });
  } finally {
    if (client) client.release();
  }
}

router.post("/register", (req, res) => registerAccount(req, res, "author"));

router.post("/register-admin", (req, res) => {
  const expectedCode = process.env.ADMIN_SIGNUP_SECRET;
  const suppliedCode = req.body?.inviteCode;

  if (!expectedCode) {
    return res.status(503).json({
      success: false,
      message: "Admin account creation is not configured on this server.",
    });
  }

  if (!secureStringEquals(suppliedCode, expectedCode)) {
    return res.status(403).json({
      success: false,
      message: "A valid admin invitation code is required.",
    });
  }

  return registerAccount(req, res, "admin");
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

    const { email, password } = req.body || {};

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
      `SELECT u.id, u.email, u.password_hash, u.role, u.is_active,
              a.name AS author_name
       FROM public.users u
       LEFT JOIN public.authors a ON a.user_id = u.id
       WHERE LOWER(u.email) = $1
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
        name: user.author_name || user.email.split("@")[0],
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
