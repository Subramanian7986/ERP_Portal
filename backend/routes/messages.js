const express = require("express");

module.exports = (db) => {
  const router = express.Router();

  // POST /api/messages - Send a message and notify the receiver
  router.post("/", async (req, res) => {
    const { sender_id, receiver_id, content } = req.body;
    if (!sender_id || !receiver_id || !content) {
      return res.status(400).json({ error: "Missing fields." });
    }
    try {
      // Insert the message
      await db.query(
        "INSERT INTO messages (sender_id, receiver_id, content) VALUES (?, ?, ?)",
        [sender_id, receiver_id, content]
      );
      res.json({ success: true });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Server error." });
    }
  });

  return router;
};
