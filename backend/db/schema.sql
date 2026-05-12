-- Recall-Aegis.AI Database Schema
-- Run this once to initialize the database

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Users table: stores email and hashed assistant name
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  assistant_name_hash VARCHAR(255) NOT NULL,
  recovery_code_hash VARCHAR(255),              -- Bcrypt-hashed recovery code (one-time use)
  recovery_code_used BOOLEAN DEFAULT FALSE,    -- Has recovery code been used?
  recovery_code_generated_at TIMESTAMP WITH TIME ZONE,  -- When was code generated
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add recovery code columns to existing users table if they don't exist
ALTER TABLE users 
  ADD COLUMN IF NOT EXISTS recovery_code_hash VARCHAR(255),
  ADD COLUMN IF NOT EXISTS recovery_code_used BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS recovery_code_generated_at TIMESTAMP WITH TIME ZONE;

-- Sessions table: stores encrypted conversation summaries used for login verification
CREATE TABLE IF NOT EXISTS sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  conversation_summary TEXT,        -- AES-256-GCM encrypted summary
  summary_iv VARCHAR(64),           -- Hex-encoded IV for decryption
  summary_tag VARCHAR(64),          -- Hex-encoded auth tag for integrity check
  conversation_history JSONB DEFAULT '[]'::jsonb,  -- Full conversation for AI context
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ended_at TIMESTAMP WITH TIME ZONE
);

-- Login attempts table: tracks attempts per email for rate limiting
CREATE TABLE IF NOT EXISTS login_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) NOT NULL,
  ip_address VARCHAR(50),
  success BOOLEAN DEFAULT FALSE,
  step VARCHAR(20) DEFAULT 'email',  -- 'email', 'name', 'conversation'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_active ON sessions(user_id, is_active);
CREATE INDEX IF NOT EXISTS idx_login_attempts_email ON login_attempts(email, created_at);

-- =====================================================================
-- Third-Party Integration Tables
-- =====================================================================

-- Third-party apps: stores registered applications that can integrate with Recall-Aegis
CREATE TABLE IF NOT EXISTS third_party_apps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  owner_email VARCHAR(255) NOT NULL,
  redirect_uris TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],  -- Array of allowed redirect URIs
  homepage_url VARCHAR(500),
  logo_url VARCHAR(500),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- API Keys: oauth2-style credentials for third-party apps
CREATE TABLE IF NOT EXISTS api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  app_id UUID NOT NULL REFERENCES third_party_apps(id) ON DELETE CASCADE,
  client_id VARCHAR(255) UNIQUE NOT NULL,
  client_secret_hash VARCHAR(255) NOT NULL,  -- Bcrypt hash, never store plaintext
  is_active BOOLEAN DEFAULT TRUE,
  last_used_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- App Users: tracks which Recall-Aegis users have authenticated with a third-party app
CREATE TABLE IF NOT EXISTS app_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  app_id UUID NOT NULL REFERENCES third_party_apps(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  app_user_id VARCHAR(255) NOT NULL,  -- External user ID from the app
  verification_method VARCHAR(50) DEFAULT 'conversation',  -- 'conversation', 'security_question', 'custom'
  verification_data JSONB DEFAULT '{}'::jsonb,  -- Custom verification metadata
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(app_id, user_id)
);

-- OAuth Sessions: temporary sessions during OAuth2 flow
CREATE TABLE IF NOT EXISTS oauth_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  app_id UUID NOT NULL REFERENCES third_party_apps(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  authorization_code VARCHAR(255) UNIQUE NOT NULL,
  code_challenge VARCHAR(128),  -- PKCE support
  redirect_uri VARCHAR(500) NOT NULL,
  scope VARCHAR(500) NOT NULL DEFAULT 'identity',
  is_used BOOLEAN DEFAULT FALSE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Webhooks: store webhook configurations for apps
CREATE TABLE IF NOT EXISTS webhooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  app_id UUID NOT NULL REFERENCES third_party_apps(id) ON DELETE CASCADE,
  url VARCHAR(500) NOT NULL,
  events VARCHAR(100)[] NOT NULL DEFAULT ARRAY[]::VARCHAR[],  -- 'user.authenticated', 'user.created', etc.
  secret VARCHAR(255) NOT NULL,  -- For HMAC signature verification
  is_active BOOLEAN DEFAULT TRUE,
  retry_count INT DEFAULT 3,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Webhook Events: log of webhook deliveries for debugging
CREATE TABLE IF NOT EXISTS webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  webhook_id UUID NOT NULL REFERENCES webhooks(id) ON DELETE CASCADE,
  event_type VARCHAR(100) NOT NULL,
  payload JSONB NOT NULL,
  attempt INT DEFAULT 1,
  status_code INT,
  response TEXT,
  next_retry_at TIMESTAMP WITH TIME ZONE,
  delivered_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Verification Methods: custom verification options (e.g., security questions)
CREATE TABLE IF NOT EXISTS verification_methods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  method_type VARCHAR(50) NOT NULL,  -- 'security_question', 'callback', etc.
  question TEXT,  -- For security questions
  answer_hash VARCHAR(255),  -- Bcrypt hash of answer
  callback_url VARCHAR(500),  -- For custom verification via webhook
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Third-party API keys for apps
CREATE INDEX IF NOT EXISTS idx_api_keys_client_id ON api_keys(client_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_app_id ON api_keys(app_id);
CREATE INDEX IF NOT EXISTS idx_app_users_app_id ON app_users(app_id);
CREATE INDEX IF NOT EXISTS idx_app_users_user_id ON app_users(user_id);
CREATE INDEX IF NOT EXISTS idx_oauth_sessions_code ON oauth_sessions(authorization_code);
CREATE INDEX IF NOT EXISTS idx_oauth_sessions_app_id ON oauth_sessions(app_id);
CREATE INDEX IF NOT EXISTS idx_webhooks_app_id ON webhooks(app_id);
CREATE INDEX IF NOT EXISTS idx_webhook_events_webhook_id ON webhook_events(webhook_id);
CREATE INDEX IF NOT EXISTS idx_verification_methods_user_id ON verification_methods(user_id);
