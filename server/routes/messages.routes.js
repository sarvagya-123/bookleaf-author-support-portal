const express = require("express");
const router = express.Router();

// Mock messages database
const messages = [];

// Middleware to verify token
const verifyToken = (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];

  if (!token) {
    return res.status(401).json({
      success: false,
      message: "No token provided",
    });
  }

  next();
};

// Get all messages for a conversation
router.get("/:conversationId", verifyToken, (req, res) => {
  try {
    const conversationMessages = messages.filter(
      (m) => m.conversationId === req.params.conversationId
    );

    res.json({
      success: true,
      messages: conversationMessages,
      count: conversationMessages.length,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch messages",
      error: error.message,
    });
  }
});

// Send new message
router.post("/", verifyToken, (req, res) => {
  try {
    const { conversationId, message, sender } = req.body;

    if (!conversationId || !message) {
      return res.status(400).json({
        success: false,
        message: "Conversation ID and message content are required",
      });
    }

    const newMessage = {
      id: Math.max(...messages.map((m) => m.id), 0) + 1,
      conversationId,
      sender: sender || "author",
      message,
      createdAt: new Date(),
      read: false,
    };

    messages.push(newMessage);

    res.status(201).json({
      success: true,
      message: "Message sent successfully",
      data: newMessage,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to send message",
      error: error.message,
    });
  }
});

// Mark message as read
router.put("/:id/read", verifyToken, (req, res) => {
  try {
    const messageIndex = messages.findIndex(
      (m) => m.id === parseInt(req.params.id)
    );

    if (messageIndex === -1) {
      return res.status(404).json({
        success: false,
        message: "Message not found",
      });
    }

    messages[messageIndex].read = true;

    res.json({
      success: true,
      message: "Message marked as read",
      data: messages[messageIndex],
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to mark message as read",
      error: error.message,
    });
  }
});

module.exports = router;