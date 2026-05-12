# 🌐 Recall-Aegis.AI

## The Identity Layer for Virtual Worlds

**Recall-Aegis.AI** is a federated, passwordless authentication system designed for the metaverse and virtual cyber spaces. Instead of maintaining separate credentials for each virtual world, users maintain a single identity that they carry across platforms.**

**One Identity. Multiple Cyber Spaces. No Passwords.**

### Why Recall-Aegis for Virtual Worlds?

- 🎮 **Multi-Platform Identity** - Users log into different metaverse platforms with one identity
- 🔑 **Passwordless** - Users prove identity through conversational memory (what they've discussed with Aegis)
- ⛓️ **Decentralized Federation** - Virtual world clients integrate via OAuth2-like flows
- 🌍 **Cross-Reality** - Works for gaming, social platforms, virtual workspaces, anything
- ⚡ **Real-time Events** - Virtual worlds receive webhooks when users authenticate
- 🔐 **Secure** - Military-grade encryption, semantic verification, zero password storage

> **Experimental MVP** -- Demonstrating the future of virtual world authentication.

## License and Distribution

This repository is published under a proprietary license. Use, modification, distribution, and resale are restricted and require a valid commercial license. Please refer to the `LICENSE` file for full terms.

---

## The Problem

Users are drowning in passwords:
- 🎮 One password for Game A
- 🏰 Another password for Game B  
- 🛍️ Yet another for Virtual Shopping Center
- 🏢 Different password for Virtual Workspace

**Recall-Aegis solves this.** It becomes the identity provider for your entire virtual world ecosystem.

---

## How It Works

### For Virtual World Users

```
1. User joins Recall-Aegis
   ↓
2. User creates account with AI assistant, has first conversation
   ↓
3. User wants to enter a virtual world/game
   ↓
4. Click "Login with Recall-Aegis"
   ↓
5. User proves identity through 3-step verification:
   - Enter email
   - Recall AI assistant's name
   - Describe what they discussed with Aegis
   ↓
6. User now logged into the virtual world
```

### For Virtual World Developers

Instead of building your own auth system:

```javascript
const RecallAegis = require('recall-aegis-sdk');

const aegis = new RecallAegis({
  baseUrl: 'https://recall-aegis.io',
  clientId: 'my-metaverse-game',
  clientSecret: 'secret',
  redirectUri: 'https://my-game.com/auth/callback'
});

// User clicks "Enter with Aegis"
const loginUrl = aegis.getAuthorizationUrl();
// → redirect to Recall-Aegis for authentication
// → user logs in
// → redirected back with auth code
// → your game grants access to the player

// Real-time events
app.post('/webhooks/aegis', (req, res) => {
  const { userId, email, timestamp } = req.body;
  console.log(`Player ${email} just logged in`);
  // Update player presence, grant permissions, etc.
});
```

---

## Screenshots

| Login -- Step 1 (email) | Login -- Step 2 (assistant name) | Login -- Step 3 (recall) |
|---|---|---|
| ![Login step 1](https://github.com/user-attachments/assets/3898470e-8849-4e76-bebf-66fcdd33350c) | ![Login step 2](https://github.com/user-attachments/assets/e8aba603-bcc0-4304-9beb-7c033638c0c7) | ![Login step 3](https://github.com/user-attachments/assets/312bf927-7bbd-4f3a-9564-8041386b22ae) |

| Signup | Chat Interface |
|---|---|
| ![Signup](https://github.com/user-attachments/assets/0255485e-fc14-4814-8a5e-ea710ab8f42a) | ![Chat](https://github.com/user-attachments/assets/e08f5dff-2f46-49d7-a69c-b1cab0fb0746) |

---

## Three-Step Verification

The authentication is **conversational and semantic** — impossible to brute force:

### Step 1: Email Verification
User enters their email address (rate-limited).

### Step 2: Assistant Name Verification  
User recalls the name they gave their AI assistant (bcrypt-hashed, never stored plaintext).

**Example:**
- When signing up, user creates account with assistant: "I call mine Claude"
- On login, user enters: "Claude"
- System verifies: bcrypt comparison ✓

### Step 3: Conversation Recall
User describes what they've talked about with their assistant (verified via AI semantic similarity).

**Example:**
- Stored conversation: *"User discussed strategies for building a Metaverse game"*
- User on login: *"I was talking about creating metaverse experiences"*
- System verifies: Semantic similarity = 0.89/1.0 ✓ (threshold: 0.70)

This is **impossible to phish, impossible to brute-force**, and **completely human-friendly**.

---

## Architecture: Virtual Worlds as OAuth2 Clients

```
┌─────────────────────────────────────────────────────────┐
│               Virtual World Infrastructure               │
├─────────────┬─────────────┬──────────────┬──────────────┤
│   Game A    │   Game B    │   Social Hub  │   V-Shop     │
└─────────────┴─────────────┴──────────────┴──────────────┘
              ↓              ↓              ↓
┌──────────────────────────────────────────────────────────┐
│            Recall-Aegis Identity Hub                     │
│                                                          │
│  ┌─────────────────────────────────────────────────────┐ │
│  │ Single User Identity                                │ │
│  │ - Email                                             │ │
│  │ - AI Assistant Name (hashed)                       │ │
│  │ - Conversation History (encrypted)                 │ │
│  └─────────────────────────────────────────────────────┘ │
│                                                          │
│  ┌─────────────────────────────────────────────────────┐ │
│  │ OAuth2-like Federation                              │ │
│  │ - Issue auth codes to games                         │ │
│  │ - Real-time webhooks on authentication             │ │
│  │ - Cross-world identity tracking                     │ │
│  └─────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────┘
```

Each virtual world registers as an OAuth2 client and receives:
- 🎟️ Authorization codes when users log in
- 🪝 Webhooks for auth events
- 🔗 Unified identity across your ecosystem

---

## Features

### For Players
- ✅ **One Password Never** - Prove identity through conversation
- ✅ **Persistent Identity** - Same user across all connected virtual worlds
- ✅ **Encrypted History** - Your conversations are yours alone (AES-256-GCM)
- ✅ **AI Assistant** - Chat interface for having meaningful conversations

### For Developers
- ✅ **OAuth2-like Federation** - Standard auth pattern
- ✅ **Webhook Events** - Real-time user authentication notifications
- ✅ **API Key Management** - Secure client credentials
- ✅ **Rate Limiting** - 20 attempts per 15 min (prevents brute force)
- ✅ **PKCE Support** - Safe for mobile/client-side apps
- ✅ **Semantic Verification** - AI-powered, impossible to phish
- ✅ **Encryption** - Bcrypt (name), AES-256-GCM (conversations), JWT (tokens)

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Identity Verification** | OpenAI Embeddings (semantic) + Bcrypt (name) |
| **Encryption** | AES-256-GCM (at-rest), Bearer tokens (in-flight) |
| **Frontend** | React 18, React Router v6 |
| **Backend** | Node.js 18+, Express 4 |
| **Database** | PostgreSQL 14+ |
| **OAuth** | Custom OAuth2-like implementation with PKCE |
| **Security** | JWT (HS256), bcryptjs (12 rounds), rate limiting |

---

## Project Structure

```
Recall-Aegis.AI/
├── backend/
│   ├── server.js                    # Express entry point
│   ├── routes/
│   │   ├── auth.js                  # Auth endpoints + OAuth
│   │   ├── chat.js                  # Chat interface
│   │   └── third-party.js           # OAuth/webhook APIs
│   ├── services/
│   │   ├── aiService.js             # OpenAI (chat, embeddings)
│   │   ├── appService.js            # App credentials
│   │   ├── oauthService.js          # OAuth2 flow
│   │   ├── webhookService.js        # Webhook delivery
│   │   └── cryptoService.js         # AES-256-GCM
│   ├── middleware/
│   │   ├── authenticate.js          # JWT verification
│   │   └── errorHandler.js          # Error handling
│   └── db/schema.sql                # PostgreSQL schema
├── frontend/
│   └── src/
│       ├── pages/
│       │   ├── Signup.jsx           # Account creation
│       │   ├── Login.jsx            # 3-step login
│       │   └── Chat.jsx             # Chat interface
│       └── api/client.js            # API client
├── sdk-node/                        # Node.js SDK
└── examples/
    └── express-game/                # Example game server
```

---

## Getting Started

### 1. Deploy Recall-Aegis (Your Identity Hub)

```bash
git clone https://github.com/Catpigdad/Recall-Aegis.AI.git
cd Recall-Aegis.AI/backend

cp .env.example .env
# Edit .env with:
# - DATABASE_URL (PostgreSQL connection)
# - JWT_SECRET (generate: openssl rand -base64 32)
# - ENCRYPTION_KEY (generate: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
# - OPENAI_API_KEY (for semantic similarity)

npm install
npm start
```

### 2. Virtual World Registers as a Client

```bash
# Register your virtual world
curl -X POST https://your-recall-aegis.io/api/third-party/apps/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "My Metaverse Game",
    "description": "An immersive virtual world",
    "ownerEmail": "dev@mygame.com",
    "redirectUris": ["https://mygame.com/auth/callback"],
    "homepageUrl": "https://mygame.com",
    "logoUrl": "https://mygame.com/logo.png"
  }'
```

**Response:**
```json
{
  "appId": "550e8400-e29b-41d4-a716-446655440000",
  "name": "My Metaverse Game",
  "message": "App registered successfully"
}
```

### 3. Generate API Credentials

```bash
curl -X POST https://your-recall-aegis.io/api/third-party/apps/{appId}/api-keys
```

**Response:**
```json
{
  "clientId": "recall_app_a1b2c3d4e5f6g7h8",
  "clientSecret": "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
}
```

### 4. Integrate into Your Virtual World

Install the SDK:
```bash
npm install recall-aegis-sdk
```

Add login button:
```javascript
const RecallAegis = require('recall-aegis-sdk');

const aegis = new RecallAegis({
  baseUrl: 'https://your-recall-aegis.io',
  clientId: 'recall_app_a1b2c3d4...',
  clientSecret: 'secret_...',
  redirectUri: 'https://mygame.com/auth/callback'
});

// When player clicks "Enter with Recall-Aegis"
app.get('/auth/login', (req, res) => {
  const authUrl = aegis.getAuthorizationUrl();
  res.redirect(authUrl);
});

// Recall-Aegis redirects back here after user authenticates
app.get('/auth/callback', async (req, res) => {
  const { code } = req.query;
  const token = await aegis.exchangeCodeForToken(code);
  
  // User is now authenticated!
  // Token contains userId, email, etc.
  req.session.user = token.userId;
  res.redirect('/game');
});

// Receive real-time auth events
app.post('/webhooks/aegis', (req, res) => {
  const { userId, email, timestamp } = req.body;
  // Player just logged in, update presence, etc.
  res.json({ received: true });
});
```

### 5. See It In Action

Run the example game server:
```bash
cd examples/express-game
cp .env.example .env
# Edit .env with your credentials
npm install
npm start
# Open http://localhost:3000
```

---

## API Endpoints

### App Management
- `POST /api/third-party/apps/register` - Register a virtual world
- `GET /api/third-party/apps/{appId}` - Get app details
- `POST /api/third-party/apps/{appId}/api-keys` - Create API credentials

### OAuth Federation
- `GET /api/third-party/oauth/authorize` - Initiate login
- `POST /api/third-party/oauth/token` - Exchange auth code for token
- `GET /api/third-party/oauth/userinfo` - Get authenticated user info

### Webhooks
- `POST /api/third-party/webhooks` - Register webhook
- `GET /api/third-party/webhooks/{appId}` - List webhooks
- `DELETE /api/third-party/webhooks/{webhookId}` - Delete webhook

### Original Endpoints (for standalone use)
- `POST /api/auth/signup` - Create Recall-Aegis account
- `POST /api/auth/login/check-email` - Email verification
- `POST /api/auth/login/check-name` - Assistant name verification
- `POST /api/auth/login/verify-conversation` - Conversation recall
- `POST /api/chat/message` - Send chat message (requires auth)

---

## Security Model

### User Secrets (Never Leaked)
| Secret | Storage | Verification |
|---|---|---|
| **Assistant Name** | bcrypt(12 rounds), one-way hash | bcrypt comparison |
| **Conversation Summary** | AES-256-GCM encryption | Semantic similarity (AI) |
| **JWT Token** | HS256 signed with server secret | Token signature verification |
| **Email** | Plaintext in DB (standard practice) | Verification at signup/login |

### Attack Resistance
- ✅ **Phishing Proof** - Semantic verification can't be automated
- ✅ **Brute Force Proof** - Rate limiting (5 attempts/15 min)
- ✅ **Dictionary Attacks** - Bcrypt with 12 rounds
- ✅ **Man-in-the-Middle** - HTTPS + token signing
- ✅ **Database Breaches** - Bcrypt hashes + encryption

---

## Use Cases

### 🎮 Gaming Ecosystems
Link all your games under one identity:
- FPS Game
- Survival Game
- RPG
- Players maintain single identity across all

### 🏢 Virtual Workspaces
- Office avatars
- Meeting rooms
- Shared resources
- One identity for all

### 🏙️ Social Metaverses
- Multiple social worlds
- Digital assets following user
- Single identity, multiple personas
- One login for all

### 🛍️ Virtual Commerce
- Shopping centers across the metaverse
- Purchase history following user
- One identity for payments
- Reputation system

---

## Demo Mode

Test without infrastructure:
```bash
# Don't set DATABASE_URL
npm start

# System runs in-memory
# All auth checks pass in demo mode
# Keyword-based similarity fallback
```

---

## Environment Variables

```bash
# Core
DATABASE_URL=postgresql://user:pass@localhost/recall_aegis  # PostgreSQL
JWT_SECRET=your-random-secret-32-chars-min
ENCRYPTION_KEY=64-character-hex-string (32 bytes in hex)
NODE_ENV=production

# Frontend
FRONTEND_URL=https://your-domain.com
PORT=3001

# AI (optional, keyword fallback if missing)
OPENAI_API_KEY=sk-...

# Security
MAX_LOGIN_ATTEMPTS=5
LOGIN_WINDOW_MINUTES=15
SIMILARITY_THRESHOLD=0.70

# Logging
LOG_LEVEL=info
SENTRY_DSN=https://xxx@sentry.io/project
```

---

## Running Tests

```bash
cd backend
npm test

# Covers:
# - Cryptographic operations (encryption/decryption)
# - Semantic similarity (keyword fallback)
# - API endpoints
# - Rate limiting
# - OAuth flow
```

---

## Documentation

📖 **[Third-Party Integration Guide](THIRD_PARTY_INTEGRATION.md)** - Complete setup for virtual world developers  
📖 **[SDK Reference](sdk-node/README.md)** - Node.js SDK documentation  
📖 **[Examples](examples/)** - Working code examples  

---

## Roadmap

- [ ] Support for NFT-based identity
- [ ] Cross-chain account linking (multiple blockchains)
- [ ] Advanced reputation system
- [ ] Device fingerprinting
- [ ] Social recovery (similar to account guardians)
- [ ] Multi-factor conversation verification
- [ ] SDK for Python, Go, Rust

---

## The Vision

Recall-Aegis.AI is building the identity layer for the metaverse. Instead of managing dozens of passwords across virtual worlds, users carry a single identity rooted in meaningful conversation. It's human-friendly, AI-powered, and built for the virtual future.

**Welcome to the next generation of authentication.** 🌐✨

---

## Getting Support

- 📖 Documentation: [THIRD_PARTY_INTEGRATION.md](THIRD_PARTY_INTEGRATION.md)
- 🐛 Issues: https://github.com/Catpigdab/Recall-Aegis.AI/issues
- 💬 Discussions: https://github.com/Catpigdab/Recall-Aegis.AI/discussions
- 🤝 Contributing: See CONTRIBUTING.md
