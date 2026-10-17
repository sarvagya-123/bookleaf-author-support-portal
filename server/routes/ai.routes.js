const express = require("express");
const { authenticateToken, requireRole } = require("../middleware/auth");
const { generateDraftReply, suggestClassification } = require("../ai.service");

const router = express.Router();

function validTicket(ticket) {
  return (
    ticket &&
    typeof ticket.subject === "string" &&
    ticket.subject.trim().length > 0 &&
    typeof ticket.description === "string" &&
    ticket.description.trim().length > 0
  );
}

// POST: Generate an AI draft reply for a ticket
router.post(
  "/draft-reply",
  authenticateToken,
  requireRole("admin"),
  async (req, res) => {
    try {
      const { ticket } = req.body;

      if (!validTicket(ticket)) {
        return res.status(400).json({
          success: false,
          message: "A ticket subject and description are required.",
        });
      }

      const draft = await generateDraftReply(ticket);

      return res.json({
        success: true,
        draft: draft,
      });
    } catch (error) {
      console.error("AI route error:", error.message);
      return res.status(500).json({
        success: false,
        message: "Could not generate AI draft.",
      });
    }
  }
);

// POST: Suggest category and priority for a ticket
router.post(
  "/classify",
  authenticateToken,
  requireRole("admin"),
  async (req, res) => {
    try {
      const { ticket } = req.body;

      if (!validTicket(ticket)) {
        return res.status(400).json({
          success: false,
          message: "A ticket subject and description are required.",
        });
      }

      const suggestion = await suggestClassification(ticket);

      return res.json({
        success: true,
        suggestion: suggestion,
      });
    } catch (error) {
      console.error("AI classify route error:", error.message);
      return res.status(500).json({
        success: false,
        message: "Could not classify ticket.",
      });
    }
  }
);

module.exports = router;