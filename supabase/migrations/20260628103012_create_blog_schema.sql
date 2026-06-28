/*
# Create blog, blueprint, and E2E messaging schema

## Overview
This migration creates the data model for a personal developer blog with:
- Blog posts (markdown content, draft/published states, tags)
- Career blueprint timeline entries (experiences, milestones)
- End-to-end-encrypted direct messages between visitors and the site owner
- Owner public key registry for ECDH key exchange

## New Tables

### 1. `blog_posts`
Stores blog posts written by the site owner.
- `id` (uuid, primary key)
- `title` (text, not null) — post title
- `slug` (text, unique, not null) — URL-friendly identifier
- `excerpt` (text) — short summary for the blog list
- `content` (text, not null) — full markdown body
- `tags` (text[]) — optional tags/categories
- `published` (boolean, default false) — draft vs published
- `published_at` (timestamptz) — when the post went live
- `reading_time_min` (int) — estimated reading time in minutes
- `created_at` (timestamptz) — row creation time
- `updated_at` (timestamptz) — last edit time

### 2. `blueprint_entries`
Career timeline entries (experiences, milestones, moments).
- `id` (uuid, primary key)
- `kind` (text, not null) — 'experience' | 'milestone' | 'education' | 'moment'
- `title` (text, not null) — headline
- `organization` (text) — company / school / context
- `description` (text) — markdown body
- `start_date` (date) — when it began
- `end_date` (date) — when it ended (null = present)
- `sort_order` (int, default 0) — manual ordering
- `created_at` (timestamptz)

### 3. `owner_public_keys`
The site owner's ECDH public keys, one per device/session. Used by visitors to encrypt messages to the owner. Private keys never leave the browser.
- `id` (uuid, primary key)
- `public_key` (text, unique, not null) — base64 SPKI public key
- `label` (text) — optional device label
- `created_at` (timestamptz)
- `revoked_at` (timestamptz) — set when key is rotated/revoked

### 4. `conversations`
A thread between a visitor and the site owner. Each conversation has its own ECDH key pair on both sides; messages are encrypted with a shared AES key derived via ECDH.
- `id` (uuid, primary key)
- `visitor_public_key` (text, not null) — visitor's ECDH public key for this thread
- `owner_public_key_id` (uuid, references owner_public_keys) — which owner key was used
- `visitor_display_name` (text) — optional name the visitor provides
- `last_message_at` (timestamptz) — for ordering threads
- `created_at` (timestamptz)

### 5. `messages`
Individual E2E-encrypted messages in a conversation. The ciphertext + IV are stored; the plaintext is never sent to or seen by the server.
- `id` (uuid, primary key)
- `conversation_id` (uuid, references conversations, cascade delete)
- `sender` (text, not null) — 'visitor' | 'owner'
- `ciphertext` (text, not null) — base64 AES-GCM ciphertext
- `iv` (text, not null) — base64 initialization vector
- `created_at` (timestamptz)

## Security (RLS)
- `blog_posts`: public read for published posts; only authenticated owner can insert/update/delete. Drafts visible only to authenticated users.
- `blueprint_entries`: public read; only authenticated owner can write.
- `owner_public_keys`: public read (visitors need them to encrypt); only authenticated owner can insert/revoke.
- `conversations`: anyone may create one (visitor initiates); reads are public so both visitor (anon) and owner (authenticated) can list threads. Updates to last_message_at are public so the visitor side can refresh the timestamp.
- `messages`: public insert + read so the anon visitor and the authenticated owner can both append and read. The E2E encryption protects confidentiality — RLS only controls row visibility, not message content.

## Important Notes
1. The site owner is the single authenticated user; visitors are anon. Blog posts and blueprint entries are authored by the owner only.
2. E2E encryption is performed client-side with the Web Crypto API. The server only ever sees ciphertext + IV. The shared AES-GCM key is derived via ECDH (P-256) between the visitor's ephemeral key pair and the owner's published public key.
3. Owner private keys are stored in the browser (IndexedDB / localStorage) and never transmitted. The owner must use the same browser/device to decrypt messages; rotating devices requires publishing a new public key.
4. `conversations` and `messages` use `TO anon, authenticated` policies because the visitor side has no account. Confidentiality comes from encryption, not RLS.
*/

-- ---------- blog_posts ----------
CREATE TABLE IF NOT EXISTS blog_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  slug text UNIQUE NOT NULL,
  excerpt text,
  content text NOT NULL,
  tags text[] DEFAULT '{}',
  published boolean NOT NULL DEFAULT false,
  published_at timestamptz,
  reading_time_min int,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE blog_posts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "read_blog_posts" ON blog_posts;
CREATE POLICY "read_blog_posts" ON blog_posts FOR SELECT
  TO anon, authenticated
  USING (published = true OR auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "insert_blog_posts" ON blog_posts;
CREATE POLICY "insert_blog_posts" ON blog_posts FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "update_blog_posts" ON blog_posts;
CREATE POLICY "update_blog_posts" ON blog_posts FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "delete_blog_posts" ON blog_posts;
CREATE POLICY "delete_blog_posts" ON blog_posts FOR DELETE
  TO authenticated USING (true);

-- ---------- blueprint_entries ----------
CREATE TABLE IF NOT EXISTS blueprint_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind text NOT NULL CHECK (kind IN ('experience','milestone','education','moment')),
  title text NOT NULL,
  organization text,
  description text,
  start_date date,
  end_date date,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE blueprint_entries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "read_blueprint_entries" ON blueprint_entries;
CREATE POLICY "read_blueprint_entries" ON blueprint_entries FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "insert_blueprint_entries" ON blueprint_entries;
CREATE POLICY "insert_blueprint_entries" ON blueprint_entries FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "update_blueprint_entries" ON blueprint_entries;
CREATE POLICY "update_blueprint_entries" ON blueprint_entries FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "delete_blueprint_entries" ON blueprint_entries;
CREATE POLICY "delete_blueprint_entries" ON blueprint_entries FOR DELETE
  TO authenticated USING (true);

-- ---------- owner_public_keys ----------
CREATE TABLE IF NOT EXISTS owner_public_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  public_key text UNIQUE NOT NULL,
  label text,
  created_at timestamptz DEFAULT now(),
  revoked_at timestamptz
);
ALTER TABLE owner_public_keys ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "read_owner_public_keys" ON owner_public_keys;
CREATE POLICY "read_owner_public_keys" ON owner_public_keys FOR SELECT
  TO anon, authenticated
  USING (revoked_at IS NULL);

DROP POLICY IF EXISTS "insert_owner_public_keys" ON owner_public_keys;
CREATE POLICY "insert_owner_public_keys" ON owner_public_keys FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "update_owner_public_keys" ON owner_public_keys;
CREATE POLICY "update_owner_public_keys" ON owner_public_keys FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "delete_owner_public_keys" ON owner_public_keys;
CREATE POLICY "delete_owner_public_keys" ON owner_public_keys FOR DELETE
  TO authenticated USING (true);

-- ---------- conversations ----------
CREATE TABLE IF NOT EXISTS conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  visitor_public_key text NOT NULL,
  owner_public_key_id uuid REFERENCES owner_public_keys(id) ON DELETE SET NULL,
  visitor_display_name text,
  last_message_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "read_conversations" ON conversations;
CREATE POLICY "read_conversations" ON conversations FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "insert_conversations" ON conversations;
CREATE POLICY "insert_conversations" ON conversations FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "update_conversations" ON conversations;
CREATE POLICY "update_conversations" ON conversations FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "delete_conversations" ON conversations;
CREATE POLICY "delete_conversations" ON conversations FOR DELETE
  TO authenticated USING (true);

-- ---------- messages ----------
CREATE TABLE IF NOT EXISTS messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender text NOT NULL CHECK (sender IN ('visitor','owner')),
  ciphertext text NOT NULL,
  iv text NOT NULL,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "read_messages" ON messages;
CREATE POLICY "read_messages" ON messages FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "insert_messages" ON messages;
CREATE POLICY "insert_messages" ON messages FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "update_messages" ON messages;
CREATE POLICY "update_messages" ON messages FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "delete_messages" ON messages;
CREATE POLICY "delete_messages" ON messages FOR DELETE
  TO authenticated USING (true);

-- Indexes for query performance
CREATE INDEX IF NOT EXISTS idx_blog_posts_published ON blog_posts(published, published_at DESC);
CREATE INDEX IF NOT EXISTS idx_blueprint_entries_sort ON blueprint_entries(sort_order, start_date DESC);
CREATE INDEX IF NOT EXISTS idx_owner_public_keys_active ON owner_public_keys(created_at DESC) WHERE revoked_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_conversations_last_msg ON conversations(last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id, created_at ASC);

-- updated_at trigger for blog_posts
CREATE OR REPLACE FUNCTION touch_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS blog_posts_touch_updated_at ON blog_posts;
CREATE TRIGGER blog_posts_touch_updated_at
BEFORE UPDATE ON blog_posts
FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
