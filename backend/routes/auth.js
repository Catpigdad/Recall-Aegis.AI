const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { query } = require('../db');
const { encrypt, decrypt } = require('../services/cryptoService');
const { generateSummary, evaluateSimilarity } = require('../services/aiService');

const router = express.Router();

const BCRYPT_ROUNDS = 12;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Validates email format. */
function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email).toLowerCase());
}

/**
 * Counts failed login attempts for an email in the current window.
 * Returns the count (0 if under limit or no DB).
 */
async function getRecentFailedAttempts(email, windowMinutes) {
  if (!process.env.DATABASE_URL) return 0;
  const windowMs = (windowMinutes || parseInt(process.env.LOGIN_WINDOW_MINUTES, 10) || 15) * 60 * 1000;
  const since = new Date(Date.now() - windowMs).toISOString();
  const result = await query(
    `SELECT COUNT(*) AS cnt FROM login_attempts
     WHERE email = $1 AND success = FALSE AND created_at > $2`,
    [email.toLowerCase(), since]
  );
  return parseInt(result.rows[0].cnt, 10);
}

/** Records a login attempt in the DB. */
async function recordAttempt(email, success, step, ipAddress) {
  if (!process.env.DATABASE_URL) return;
  await query(
    `INSERT INTO login_attempts (id, email, ip_address, success, step)
     VALUES ($1, $2, $3, $4, $5)`,
    [uuidv4(), email.toLowerCase(), ipAddress || null, success, step]
  );
}

// ---------------------------------------------------------------------------
// POST /api/auth/signup
// ---------------------------------------------------------------------------
router.post('/signup', async (req, res) => {
  const { email, assistantName, initialMessage } = req.body;

  // --- Input validation ---
  if (!email || !assistantName || !initialMessage) {
    return res.status(400).json({ error: 'email, assistantName, and initialMessage are required.' });
  }
  if (!isValidEmail(email)) {
    return res.status(400).json({ error: 'Invalid email address.' });
  }
  if (assistantName.trim().length < 2 || assistantName.trim().length > 50) {
    return res.status(400).json({ error: 'Assistant name must be 2–50 characters.' });
  }
  if (initialMessage.trim().length < 5) {
    return res.status(400).json({ error: 'Initial message must be at least 5 characters.' });
  }

  const normalizedEmail = email.toLowerCase().trim();

  try {
    // --- Check duplicate email (only when DB is available) ---
    if (process.env.DATABASE_URL) {
      const existing = await query('SELECT id FROM users WHERE email = $1', [normalizedEmail]);
      if (existing.rows.length > 0) {
        return res.status(409).json({ error: 'An account with that email already exists.' });
      }
    }

    // --- Hash assistant name ---
    const nameHash = await bcrypt.hash(assistantName.trim(), BCRYPT_ROUNDS);

    // --- Build the initial conversation so we can generate a summary ---
    const { chatWithAssistant, generateSummary: summarise } = require('../services/aiService');
    const initialHistory = [];
    const assistantReply = await chatWithAssistant(
      assistantName.trim(),
      initialHistory,
      initialMessage.trim()
    );
    const conversation = [
      { role: 'user', content: initialMessage.trim() },
      { role: 'assistant', content: assistantReply },
    ];

    // --- Generate and encrypt summary ---
    const summaryText = await summarise(conversation);
    const { ciphertext, iv, tag } = encrypt(summaryText);

    if (!process.env.DATABASE_URL) {
      // No DB — return a demo response so the UI still works during development
      return res.status(201).json({
        message: 'Account created successfully (demo mode — no database).',
        assistantReply,
        summary: summaryText,
        demo: true,
      });
    }

    // --- Persist user and session ---
    const userId = uuidv4();
    await query(
      `INSERT INTO users (id, email, assistant_name_hash) VALUES ($1, $2, $3)`,
      [userId, normalizedEmail, nameHash]
    );

    await query(
      `INSERT INTO sessions (id, user_id, conversation_summary, summary_iv, summary_tag, conversation_history, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, FALSE)`,
      [uuidv4(), userId, ciphertext, iv, tag, JSON.stringify(conversation)]
    );

    return res.status(201).json({
      message: 'Account created successfully.',
      assistantReply,
    });
  } catch (err) {
    console.error('Signup error:', err);
    return res.status(500).json({ error: 'Internal server error during signup.' });
  }
});

// ---------------------------------------------------------------------------
// POST /api/auth/login/check-email   (Step 1)
// ---------------------------------------------------------------------------
router.post('/login/check-email', async (req, res) => {
  const { email } = req.body;
  const ip = req.ip;

  if (!email || !isValidEmail(email)) {
    return res.status(400).json({ error: 'A valid email is required.' });
  }

  const normalizedEmail = email.toLowerCase().trim();

  // Check rate limit
  const maxAttempts = parseInt(process.env.MAX_LOGIN_ATTEMPTS, 10) || 5;
  const failed = await getRecentFailedAttempts(normalizedEmail, null);
  if (failed >= maxAttempts) {
    return res.status(429).json({
      error: 'Too many failed login attempts. Please wait before trying again.',
    });
  }

  if (!process.env.DATABASE_URL) {
    // Demo mode: always proceed
    return res.json({ exists: true, message: 'Email found.' });
  }

  try {
    const result = await query('SELECT id FROM users WHERE email = $1', [normalizedEmail]);
    if (result.rows.length === 0) {
      await recordAttempt(normalizedEmail, false, 'email', ip);
      // Deliberate vague message to prevent email enumeration
      return res.status(401).json({ error: 'Invalid credentials.' });
    }
    return res.json({ exists: true, message: 'Email found.' });
  } catch (err) {
    console.error('Login check-email error:', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
});

// ---------------------------------------------------------------------------
// POST /api/auth/login/check-name   (Step 2)
// ---------------------------------------------------------------------------
router.post('/login/check-name', async (req, res) => {
  const { email, assistantName } = req.body;
  const ip = req.ip;

  if (!email || !assistantName) {
    return res.status(400).json({ error: 'email and assistantName are required.' });
  }

  const normalizedEmail = email.toLowerCase().trim();

  // Check rate limit
  const maxAttempts = parseInt(process.env.MAX_LOGIN_ATTEMPTS, 10) || 5;
  const failed = await getRecentFailedAttempts(normalizedEmail, null);
  if (failed >= maxAttempts) {
    return res.status(429).json({
      error: 'Too many failed login attempts. Please wait before trying again.',
    });
  }

  if (!process.env.DATABASE_URL) {
    // Demo mode: always proceed, using whatever name they gave
    const demoToken = jwt.sign(
      { userId: 'demo-user', email: normalizedEmail, assistantName: assistantName.trim() },
      process.env.JWT_SECRET || 'demo-secret',
      { expiresIn: '1h' }
    );
    return res.json({ valid: true, message: 'Name accepted (demo mode).', token: demoToken });
  }

  try {
    const result = await query(
      'SELECT id, assistant_name_hash FROM users WHERE email = $1',
      [normalizedEmail]
    );
    if (result.rows.length === 0) {
      await recordAttempt(normalizedEmail, false, 'name', ip);
      return res.status(401).json({ error: 'Invalid credentials.' });
    }

    const user = result.rows[0];
    const nameMatch = await bcrypt.compare(assistantName.trim(), user.assistant_name_hash);

    if (!nameMatch) {
      await recordAttempt(normalizedEmail, false, 'name', ip);
      return res.status(401).json({ error: 'Incorrect assistant name.' });
    }

    // Issue a short-lived intermediate token (15 min) for the final login step
    const stepToken = jwt.sign(
      { userId: user.id, email: normalizedEmail, assistantName: assistantName.trim(), step: 'conversation' },
      process.env.JWT_SECRET,
      { expiresIn: '15m' }
    );

    return res.json({ valid: true, message: 'Name accepted.', token: stepToken });
  } catch (err) {
    console.error('Login check-name error:', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
});

// ---------------------------------------------------------------------------
// POST /api/auth/login/verify-conversation   (Step 3)
// ---------------------------------------------------------------------------
router.post('/login/verify-conversation', async (req, res) => {
  const { stepToken, userAnswer } = req.body;
  const ip = req.ip;

  if (!stepToken || !userAnswer) {
    return res.status(400).json({ error: 'stepToken and userAnswer are required.' });
  }
  if (userAnswer.trim().length < 2) {
    return res.status(400).json({ error: 'Please provide a more detailed answer.' });
  }

  // Verify the intermediate token
  let payload;
  try {
    payload = jwt.verify(stepToken, process.env.JWT_SECRET || 'demo-secret');
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired session token. Please restart login.' });
  }

  if (payload.step !== 'conversation' && payload.userId !== 'demo-user') {
    return res.status(401).json({ error: 'Invalid login flow.' });
  }

  const { email, userId, assistantName } = payload;
  const maxAttempts = parseInt(process.env.MAX_LOGIN_ATTEMPTS, 10) || 5;
  const failed = await getRecentFailedAttempts(email, null);
  if (failed >= maxAttempts) {
    return res.status(429).json({ error: 'Too many failed login attempts.' });
  }

  if (!process.env.DATABASE_URL || userId === 'demo-user') {
    // Demo mode: always succeed
    const authToken = jwt.sign(
      { userId: userId || 'demo', email, assistantName },
      process.env.JWT_SECRET || 'demo-secret',
      { expiresIn: '8h' }
    );
    return res.json({ authenticated: true, token: authToken, assistantName });
  }

  try {
    // Fetch the most recent non-active (completed) session summary
    const sessionResult = await query(
      `SELECT conversation_summary, summary_iv, summary_tag
       FROM sessions
       WHERE user_id = $1 AND is_active = FALSE AND conversation_summary IS NOT NULL
       ORDER BY created_at DESC
       LIMIT 1`,
      [userId]
    );

    if (sessionResult.rows.length === 0) {
      // No prior conversation on record — for new users after signup this shouldn't happen,
      // but handle gracefully
      await recordAttempt(email, false, 'conversation', ip);
      return res.status(401).json({ error: 'No conversation history found for verification.' });
    }

    const { conversation_summary, summary_iv, summary_tag } = sessionResult.rows[0];

    // Decrypt the stored summary
    let storedSummary;
    try {
      storedSummary = decrypt(conversation_summary, summary_iv, summary_tag);
    } catch (decryptErr) {
      console.error('Decryption failed:', decryptErr.message);
      return res.status(500).json({ error: 'Internal server error during verification.' });
    }

    // Semantic similarity check
    const { score, matched, method } = await evaluateSimilarity(storedSummary, userAnswer.trim());

    if (!matched) {
      await recordAttempt(email, false, 'conversation', ip);
      return res.status(401).json({
        error: 'Your answer did not match the previous conversation. Login denied.',
        hint: process.env.NODE_ENV === 'development' ? { score, method } : undefined,
      });
    }

    // --- Success ---
    await recordAttempt(email, true, 'conversation', ip);

    // Issue a full-session JWT (8 hours)
    const authToken = jwt.sign(
      { userId, email, assistantName },
      process.env.JWT_SECRET,
      { expiresIn: '8h' }
    );

    return res.json({ authenticated: true, token: authToken, assistantName });
  } catch (err) {
    console.error('Verify conversation error:', err);
    return res.status(500).json({ error: 'Internal server error during verification.' });
  }
});

module.exports = router;
