
const jwt = require("jsonwebtoken");
const pool = require("../db");

const DEMO_ADMIN_EMAIL = "demo.admin@bookleaf-demo.com";
const DEMO_AUTHOR_ID = "AUTH002";

function isDemoAdmin(user) {
  return user?.role === "admin" &&
    user.email?.toLowerCase() === DEMO_ADMIN_EMAIL;
}

function requireDemoTicketScope(paramName) {
  return async (req, res, next) => {
    if (!isDemoAdmin(req.user)) {
      return next();
    }

    try {
      const result = await pool.query(
        `SELECT 1
         FROM public.tickets
         WHERE id = $1 AND author_id = $2`,
        [req.params[paramName], DEMO_AUTHOR_ID]
      );

      if (!result.rowCount) {
        return res.status(404).json({
          success: false,
          message: "Ticket not found.",
        });
      }

      return next();
    } catch (error) {
      console.error("Demo ticket scope check error:", error.message);
      return res.status(500).json({
        success: false,
        message: "Could not verify ticket access.",
      });
    }
  };
}

async function authenticateToken(req, res, next) {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith("Bearer ")
    ? authHeader.slice(7)
    : null;

  if (!token) {
    return res.status(401).json({
      success: false,
      message: "Authentication token required.",
    });
  }

  if (!process.env.JWT_SECRET) {
    console.error("JWT_SECRET is missing.");

    return res.status(500).json({
      success: false,
      message: "Authentication is not configured.",
    });
  }

  let decoded;

  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "Token is invalid or expired. Please log in again.",
    });
  }

  if (!decoded.sub) {
    return res.status(401).json({
      success: false,
      message: "Invalid authentication token.",
    });
  }

  try {
    const result = await pool.query(
      `SELECT id, email, role
       FROM public.users
       WHERE id = $1 AND is_active = TRUE`,
      [decoded.sub]
    );

    if (result.rowCount === 0) {
      return res.status(401).json({
        success: false,
        message: "Account is inactive or does not exist.",
      });
    }

    req.user = result.rows[0];
    return next();
  } catch (error) {
    console.error("Authentication database error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Could not verify your account.",
    });
  }
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: "You do not have permission to access this resource.",
      });
    }

    return next();
  };
}

module.exports = {
  authenticateToken,
  DEMO_AUTHOR_ID,
  isDemoAdmin,
  requireDemoTicketScope,
  requireRole,
};
