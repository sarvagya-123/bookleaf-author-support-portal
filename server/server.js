require("dotenv").config();

const express = require("express");
const cors = require("cors");

const app = express();
const PORT = process.env.PORT || 5000;

// Trust configuration
app.disable("x-powered-by");

// Middleware
app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "https://bookleaf-author-support-portal-one.vercel.app",
      "https://bookleaf-author-support-portal-as5jii013.vercel.app",
    ],
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.use(express.json({ limit: "1mb" }));

// Health check
app.get("/api/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "BookLeaf API is running",
    timestamp: new Date().toISOString(),
  });
});

// API routes
app.use("/api/auth", require("./routes/auth.routes"));
app.use("/api/books", require("./routes/books.routes"));
app.use("/api/tickets", require("./routes/tickets.routes"));
app.use("/api/messages", require("./routes/messages.routes"));
app.use("/api/admin", require("./routes/admin.routes"));
app.use("/api/ai", require("./routes/ai.routes"));

// Handle unknown endpoints
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Endpoint not found",
    path: req.originalUrl,
  });
});

// Central error handler
app.use((err, req, res, next) => {
  console.error("API error:", err.message);

  if (res.headersSent) {
    return next(err);
  }

  // Handle malformed JSON request bodies.
  if (err.type === "entity.parse.failed") {
    return res.status(400).json({
      success: false,
      message: "Invalid JSON in request body.",
    });
  }

  const statusCode =
    Number.isInteger(err.status) &&
    err.status >= 400 &&
    err.status <= 599
      ? err.status
      : 500;

  return res.status(statusCode).json({
    success: false,
    message:
      statusCode >= 500
        ? "Internal server error"
        : err.message || "Request failed",
    ...(process.env.NODE_ENV === "development" && {
      error: err.message,
    }),
  });
});

// Start the server when this file is run directly.
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`BookLeaf API running on port ${PORT}`);
    console.log(
      `Environment: ${process.env.NODE_ENV || "development"}`
    );
  });
}

module.exports = app;