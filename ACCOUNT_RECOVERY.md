# Account Recovery Guide

Recall-Aegis.AI implements a **one-time recovery code** system as the sole fallback mechanism for account recovery.

## Overview

At signup, every user receives a **one-time recovery code** in the format `XXXX-XXXX-XXXX-XXXX`. This code is the only way to recover an account if the user loses access.

### Why One-Time Code?

- **Passwordless system**: Recall-Aegis uses conversational memory, not passwords, so traditional "reset password" flows don't apply
- **Simple & secure**: Single recovery mechanism reduces attack surface
- **User-controlled**: Users must physically save their recovery code; no email-based resets create phishing vectors
- **One-shot protection**: Code is consumed on first use, preventing brute-force attacks

---

## For Users

### During Signup

1. **Account created** → You receive a recovery code: `ABCD-EFGH-IJKL-MNOP`
2. **Save it immediately** → Write it down, save to password manager, or store in safe location
3. **Warning displayed**: "SAVE THIS CODE IN A SAFE PLACE. This code will be shown only once."

### If You Lose Access

If you can't log in:

1. **Go to recovery page** → `/recover` (or recovery option in login UI)
2. **Enter email** → The email associated with your account
3. **Enter recovery code** → Your saved `XXXX-XXXX-XXXX-XXXX` code
4. **Code validated** → You receive a **recovery token** (valid 30 minutes)
5. **Re-verify identity** → Start a new conversation with your assistant to rebuild identity proof
6. **Access restored** → Once re-verified, you regain full access

### After Recovery

- Your old recovery code is **consumed and cannot be reused**
- A new recovery code is **NOT automatically generated** (by design—only one code per account)
- You must contact support if you need a new recovery code issued

---

## For Developers / API Integration

### Signup Endpoint Response

```bash
POST /api/auth/signup
```

Response includes the recovery code (shown once only):

```json
{
  "message": "Account created successfully.",
  "assistantReply": "Hello! I'm your Aegis assistant...",
  "recoveryCode": "ABCD-EFGH-IJKL-MNOP",
  "recoveryCodeWarning": "SAVE THIS CODE IN A SAFE PLACE. You will need it to recover your account if you lose access. This code will be shown only once."
}
```

**Frontend responsibility**: Display the recovery code prominently and encourage the user to save it before navigating away.

### Recovery Endpoint

```bash
POST /api/auth/recover
Content-Type: application/json

{
  "email": "user@example.com",
  "recoveryCode": "ABCD-EFGH-IJKL-MNOP"
}
```

Success response (HTTP 200):

```json
{
  "message": "Recovery code validated. Please re-verify your identity.",
  "recoveryToken": "<jwt-token-valid-30-minutes>",
  "instruction": "Use this token to create new conversation evidence and regain access."
}
```

Error responses (HTTP 401):

```json
{
  "error": "Invalid email or recovery code."
}
```

or

```json
{
  "error": "Recovery code has already been used and cannot be reused."
}
```

---

## Technical Details

### Database Schema

Recovery code fields added to `users` table:

```sql
recovery_code_hash VARCHAR(255)              -- Bcrypt-hashed recovery code
recovery_code_used BOOLEAN DEFAULT FALSE     -- Has code been consumed?
recovery_code_generated_at TIMESTAMP         -- When code was generated
```

### Security Properties

1. **One-way hash**: Recovery codes are bcrypt-hashed (12 rounds), like passwords
   - Database breach does not expose the actual recovery code
   
2. **One-time use**: Code is marked as used after validation
   - Cannot be used twice, even if somehow leaked
   
3. **No brute-force recovery**: Codes are 96-bit random (entropy equivalent to 16 hex chars)
   - ~18 quintillion possible codes—impossible to guess
   
4. **Time window**: Recovery token valid only 30 minutes
   - User must complete re-verification quickly
   
5. **Audit logging**: Failed recovery attempts are recorded in `login_attempts` table
   - Can detect and block abuse

### Code Generation

```javascript
// Format: 4 groups of 4 hex characters = XXXX-XXXX-XXXX-XXXX
// Entropy: 12 random bytes = 96 bits
// Storage: Bcrypt hash (never stored as plaintext)

const { plaintext, hash } = await generateRecoveryCode();
// plaintext: "A1B2-C3D4-E5F6-G7H8" (shown to user once)
// hash: "$2a$12$..." (stored in database)
```

---

## Recovery Flow Diagram

```
User Signup
    ↓
Generate Recovery Code (plaintext: "ABCD-EFGH-IJKL-MNOP", hash: "$2a$12$...")
    ↓
Store hash in users.recovery_code_hash
    ↓
Return plaintext to user (ONE TIME ONLY)
    ↓
User saves code
    ──────────────────────────────────────→ [User loses access]
                                                    ↓
                                            User submits /recover
                                                    ↓
                                            Email + Recovery Code validated
                                                    ↓
                                            Mark code as used: recovery_code_used = TRUE
                                                    ↓
                                            Issue temporary recovery token (30 min)
                                                    ↓
                                            User re-verifies via conversation
                                                    ↓
                                            Access restored
```

---

## Limitations & Edge Cases

### What if user loses recovery code?

**Current behavior**: No recovery possible. User must contact support for manual verification.

**Recommendation**: In production, implement support workflow:
1. User submits ticket with ID verification
2. Support verifies ownership (email verification, previous device ID, etc.)
3. Support issues new recovery code
4. User follows standard recovery flow

### What if user wants a new recovery code?

**Current behavior**: Only one recovery code per account (generated at signup).

**Future enhancement option**: Allow users to request a new recovery code:
- Invalidate old code
- Generate new code
- Require existing authentication to request new code

### What if recovery token expires?

If 30 minutes pass before re-verification completes:
1. Recovery token expires (JWT invalid)
2. User must restart recovery process with recovery code (still valid, hasn't been used yet)

---

## Troubleshooting

| Issue | Cause | Solution |
|-------|-------|----------|
| "Recovery code has already been used" | Code was previously used for recovery | Contact support for new code |
| "Invalid email or recovery code" | Typo in email or code | Verify spelling (code is case-insensitive, spaces OK) |
| "This account has no recovery code set" | Account created before recovery feature | This shouldn't happen for new signups; contact support |
| Recovery token expired | Took too long to re-verify | Start recovery process over (code still valid) |

---

## Changes to Existing Behavior

### Signup Response

**Before:**
```json
{
  "message": "Account created successfully.",
  "assistantReply": "Hello! I'm your Aegis assistant..."
}
```

**After:**
```json
{
  "message": "Account created successfully.",
  "assistantReply": "Hello! I'm your Aegis assistant...",
  "recoveryCode": "ABCD-EFGH-IJKL-MNOP",
  "recoveryCodeWarning": "SAVE THIS CODE IN A SAFE PLACE..."
}
```

### Database Migration

Existing users table will be automatically updated by the schema migration:

```sql
ALTER TABLE users 
  ADD COLUMN IF NOT EXISTS recovery_code_hash VARCHAR(255),
  ADD COLUMN IF NOT EXISTS recovery_code_used BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS recovery_code_generated_at TIMESTAMP WITH TIME ZONE;
```

Existing user accounts will have `NULL` recovery codes and cannot use recovery feature (by design—they existed before feature was added).

---

## Future Enhancements

1. **Recovery code expiration**: Make codes valid only for 90 days
2. **Multiple backup codes**: Generate 5 codes at signup, consume one per use
3. **Device fingerprinting**: Skip re-verification on previously trusted device
4. **Social recovery**: Trusted contacts can verify recovery request
5. **Biometric recovery**: On mobile, use fingerprint + recovery code
