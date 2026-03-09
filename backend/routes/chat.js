const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { query } = require('../db');
const { authenticate } = require('../middleware/authenticate');
const { encrypt } = require('../services/cryptoService');
const { chatWithAssistant, generateSummary } = require('../services/aiService');

const router = express.Router();

// All chat routes require a valid JWT
router.use(authenticate);

// In-memory session store for demo mode (no database)
const demoSessions = new Map();

// ---------------------------------------------------------------------------
// POST /api/chat/message
// Send a message and receive an AI reply.
// ---------------------------------------------------------------------------
router.post('/message', async (req, res) => {
  const { message } = req.body;
  const { userId, assistantName } = req.user;

  if (!message || message.trim().length === 0) {
    return res.status(400).json({ error: 'message is required.' });
  }
  if (message.trim().length > 2000) {
    return res.status(400).json({ error: 'Message too long (max 2000 characters).' });
  }

  try {
    let history = [];
    let sessionId = null;

    if (!process.env.DATABASE_URL || userId === 'demo-user') {
      // Demo mode: use in-memory session
      if (!demoSessions.has(userId)) {
        demoSessions.set(userId, { history: [], id: uuidv4() });
      }
      const demoSession = demoSessions.get(userId);
      history = demoSession.history;
      sessionId = demoSession.id;
    } else {
      // Find or create an active session for this user
      const sessionResult = await query(
        `SELECT id, conversation_history FROM sessions
         WHERE user_id = $1 AND is_active = TRUE
         ORDER BY created_at DESC LIMIT 1`,
        [userId]
      );

      if (sessionResult.rows.length === 0) {
        // Create a new active session
        sessionId = uuidv4();
        await query(
          `INSERT INTO sessions (id, user_id, conversation_history, is_active)
           VALUES ($1, $2, $3, TRUE)`,
          [sessionId, userId, JSON.stringify([])]
        );
        history = [];
      } else {
        sessionId = sessionResult.rows[0].id;
        history = sessionResult.rows[0].conversation_history || [];
      }
    }

    // Get AI reply
    const aiReply = await chatWithAssistant(assistantName, history, message.trim());

    // Append to history (keep last 20 exchanges to avoid token overflow)
    const updatedHistory = [
      ...history,
      { role: 'user', content: message.trim() },
      { role: 'assistant', content: aiReply },
    ].slice(-40); // 40 messages = 20 exchanges

    if (!process.env.DATABASE_URL || userId === 'demo-user') {
      demoSessions.get(userId).history = updatedHistory;
    } else {
      await query(
        `UPDATE sessions SET conversation_history = $1 WHERE id = $2`,
        [JSON.stringify(updatedHistory), sessionId]
      );
    }

    return res.json({
      reply: aiReply,
      sessionId,
    });
  } catch (err) {
    console.error('Chat message error:', err);
    return res.status(500).json({ error: 'Failed to process message.' });
  }
});

// ---------------------------------------------------------------------------
// POST /api/chat/end-session
// Ends the current chat session and generates a summary for the next login.
// ---------------------------------------------------------------------------
router.post('/end-session', async (req, res) => {
  const { userId } = req.user;

  try {
    let history = [];
    let sessionId = null;

    if (!process.env.DATABASE_URL || userId === 'demo-user') {
      const demoSession = demoSessions.get(userId);
      if (!demoSession || demoSession.history.length === 0) {
        return res.status(400).json({ error: 'No active session to end.' });
      }
      history = demoSession.history;
      sessionId = demoSession.id;
      demoSessions.delete(userId);

      const summaryText = await generateSummary(history);
      return res.json({ message: 'Session ended.', summary: summaryText, demo: true });
    }

    // Database mode
    const sessionResult = await query(
      `SELECT id, conversation_history FROM sessions
       WHERE user_id = $1 AND is_active = TRUE
       ORDER BY created_at DESC LIMIT 1`,
      [userId]
    );

    if (sessionResult.rows.length === 0) {
      return res.status(400).json({ error: 'No active session to end.' });
    }

    sessionId = sessionResult.rows[0].id;
    history = sessionResult.rows[0].conversation_history || [];

    if (history.length === 0) {
      return res.status(400).json({ error: 'Cannot end an empty session.' });
    }

    // Generate summary
    const summaryText = await generateSummary(history);

    // Encrypt summary
    const { ciphertext, iv, tag } = encrypt(summaryText);

    // Mark session as ended and store summary
    await query(
      `UPDATE sessions
       SET is_active = FALSE,
           ended_at = NOW(),
           conversation_summary = $1,
           summary_iv = $2,
           summary_tag = $3
       WHERE id = $4`,
      [ciphertext, iv, tag, sessionId]
    );

    return res.json({ message: 'Session ended successfully. Your conversation has been saved.' });
  } catch (err) {
    console.error('End session error:', err);
    return res.status(500).json({ error: 'Failed to end session.' });
  }
});

// ---------------------------------------------------------------------------
// GET /api/chat/history
// Returns the conversation history for the current active session.
// ---------------------------------------------------------------------------
router.get('/history', async (req, res) => {
  const { userId } = req.user;

  try {
    if (!process.env.DATABASE_URL || userId === 'demo-user') {
      const demoSession = demoSessions.get(userId);
      return res.json({ history: demoSession ? demoSession.history : [] });
    }

    const result = await query(
      `SELECT conversation_history FROM sessions
       WHERE user_id = $1 AND is_active = TRUE
       ORDER BY created_at DESC LIMIT 1`,
      [userId]
    );

    return res.json({
      history: result.rows.length > 0 ? (result.rows[0].conversation_history || []) : [],
    });
  } catch (err) {
    console.error('History error:', err);
    return res.status(500).json({ error: 'Failed to retrieve history.' });
  }
});

module.exports = router;
