# 🛡️ Recall-Aegis.AI

An AI-powered authentication system that **replaces passwords** with personalized conversation memory. Instead of remembering a password, users log in by:

1. **Recalling their AI assistant's name** (bcrypt-hashed in the database)
2. **Describing a topic from their last conversation** (verified via semantic similarity)

> **Experimental MVP** -- demonstrates conversation-based authentication as a human-friendly security layer.

---

## Screenshots

| Login -- Step 1 (email) | Login -- Step 2 (assistant name) | Login -- Step 3 (recall) |
|---|---|---|
| ![Login step 1](https://github.com/user-attachments/assets/3898470e-8849-4e76-bebf-66fcdd33350c) | ![Login step 2](https://github.com/user-attachments/assets/e8aba603-bcc0-4304-9beb-7c033638c0c7) | ![Login step 3](https://github.com/user-attachments/assets/312bf927-7bbd-4f3a-9564-8041386b22ae) |

| Signup | Chat Interface |
|---|---|
| ![Signup](https://github.com/user-attachments/assets/0255485e-fc14-4814-8a5e-ea710ab8f42a) | ![Chat](https://github.com/user-attachments/assets/e08f5dff-2f46-49d7-a69c-b1cab0fb0746) |

---

## How It Works

### Authentication Flow

```
Signup
  -- email + assistant name (bcrypt-hashed) + first chat message
       -- AI generates summary -> AES-256-GCM encrypted -> stored in DB

Login (3 steps)
  1. Email check         (rate-limited)
  2. Assistant name      (bcrypt.compare against stored hash)
  3. Conversation recall (semantic similarity vs stored encrypted summary)
       -- OpenAI embeddings (cosine similarity >= 0.70)
          OR keyword-based fallback (Jaccard similarity >= 0.20)
  SUCCESS -> Issue 8-hour JWT
```

### Semantic Matching Examples

| Stored summary | Valid user answers |
|---|---|
| "We discussed planning a trip to Japan." | "Japan vacation", "Travel plans to Japan", "Planning a trip" |

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 18, React Router v6, Axios |
| **Backend** | Node.js 18+, Express 4 |
| **Database** | PostgreSQL 14+ |
| **AI** | OpenAI GPT-3.5-turbo (chat + summaries), text-embedding-3-small (similarity) |
| **Auth** | JWT (HS256), bcryptjs (rounds=12), AES-256-GCM |

---

## Project Structure

```
Recall-Aegis.AI/
+-- backend/
|   +-- server.js                  # Express entry point
|   +-- routes/
|   |   +-- auth.js                # Signup + 3-step login
|   |   +-- chat.js                # Chat + session management
|   +-- services/
|   |   +-- aiService.js           # OpenAI chat, summaries, similarity
|   |   +-- cryptoService.js       # AES-256-GCM encrypt/decrypt
|   +-- middleware/
|   |   +-- authenticate.js        # JWT verification middleware
|   +-- db/
|   |   +-- index.js               # pg Pool + initDB
|   |   +-- schema.sql             # Table definitions
|   +-- tests/unit/                # Jest unit tests
+-- frontend/
    +-- src/
        +-- pages/
        |   +-- Signup.jsx          # Account creation
        |   +-- Login.jsx           # 3-step login flow
        |   +-- Chat.jsx            # Chat interface
        +-- api/client.js           # Axios API client
```

---

## Running Locally

### Prerequisites

- Node.js 18+
- PostgreSQL 14+ (optional -- see Demo Mode below)
- OpenAI API key (optional -- keyword fallback used if absent)

### 1. Clone and install

```bash
git clone https://github.com/Catpigdad/Recall-Aegis.AI.git
cd Recall-Aegis.AI
```

### 2. Backend setup

```bash
cd backend
cp .env.example .env
# Edit .env -- set DATABASE_URL, JWT_SECRET, ENCRYPTION_KEY, OPENAI_API_KEY
npm install
npm start          # or: npm run dev  (uses nodemon for hot-reload)
```

**Generate a secure ENCRYPTION_KEY:**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 3. Frontend setup (new terminal)

```bash
cd frontend
npm install
npm start          # Starts on http://localhost:3000  (proxies /api -> localhost:3001)
```

### Demo Mode (no database required)

The backend runs in **demo mode** automatically when `DATABASE_URL` is not set:

- State is in-memory only (resets on restart)
- Login steps 1 & 2 always succeed (no actual DB verification)
- Conversation similarity still works via the keyword fallback
- Full UI can be explored without any infrastructure setup

---

## Database Schema

```sql
-- Users: stores email + hashed assistant name
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  assistant_name_hash VARCHAR(255) NOT NULL,  -- bcrypt(rounds=12)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Sessions: stores encrypted conversation summaries
CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  conversation_summary TEXT,          -- AES-256-GCM ciphertext
  summary_iv VARCHAR(64),             -- hex-encoded IV
  summary_tag VARCHAR(64),            -- hex-encoded GCM auth tag
  conversation_history JSONB DEFAULT '[]',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ended_at TIMESTAMP WITH TIME ZONE
);

-- Login attempts: tracks failures for rate limiting
CREATE TABLE login_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) NOT NULL,
  ip_address VARCHAR(50),
  success BOOLEAN DEFAULT FALSE,
  step VARCHAR(20),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

The schema is applied automatically on server start via `db/schema.sql`.

---

## API Reference

### Auth Endpoints

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/auth/signup` | Create account |
| `POST` | `/api/auth/login/check-email` | Step 1 -- verify email |
| `POST` | `/api/auth/login/check-name` | Step 2 -- verify assistant name |
| `POST` | `/api/auth/login/verify-conversation` | Step 3 -- verify recall, issue JWT |

### Chat Endpoints (require `Authorization: Bearer <token>`)

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/chat/message` | Send a message, get AI reply |
| `POST` | `/api/chat/end-session` | End session, generate + store summary |
| `GET`  | `/api/chat/history` | Get current session history |

---

## Security Measures

| Measure | Implementation |
|---|---|
| Assistant name storage | bcryptjs (rounds=12, one-way hash) |
| Conversation summaries | AES-256-GCM with random IV per entry + GCM auth tag |
| JWT | HS256, 8-hour expiry, signed with `JWT_SECRET` |
| Rate limiting | 20 login requests / 15 min per IP (express-rate-limit) |
| Failed attempt tracking | Per-email attempt log in `login_attempts` table |
| Input validation | Email format, field length, non-empty checks |
| Similarity threshold | Default 0.70 (embeddings) / 0.20 (keyword fallback) |

---

## Running Tests

```bash
cd backend
npm test
```

Tests cover:
- `cryptoService` -- encrypt/decrypt round-trip, tamper detection
- `aiService` -- keyword similarity fallback (no API key required)

---

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | No* | PostgreSQL connection string |
| `JWT_SECRET` | Yes | Secret for signing JWTs |
| `ENCRYPTION_KEY` | Yes | 64-char hex string (32 bytes) for AES-256 |
| `OPENAI_API_KEY` | No | Enables AI chat + semantic similarity |
| `PORT` | No | Backend port (default: 3001) |
| `FRONTEND_URL` | No | CORS origin (default: http://localhost:3000) |
| `SIMILARITY_THRESHOLD` | No | Embedding similarity cutoff (default: 0.70) |
| `MAX_LOGIN_ATTEMPTS` | No | Failed attempts before lockout (default: 5) |

\* Without `DATABASE_URL` the server runs in demo mode.
