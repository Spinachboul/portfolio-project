/*
# Enable Supabase Realtime for messages and conversations

## Overview
Adds the `messages` and `conversations` tables to the `supabase_realtime`
publication so the frontend can subscribe to INSERT events via
`supabase.channel(...).on('postgres_changes', ...)`.

## Changes
- `alter publication supabase_realtime add table messages, conversations;`
- Idempotent: uses a DO block that checks `pg_publication_tables` before
  adding, so re-running is safe.

## Security
- No RLS changes. Realtime respects RLS: anon/authenticated clients only
  receive events for rows they can SELECT (which, per our policies, is all
  rows — the encryption protects content, not row visibility).
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE messages;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'conversations'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE conversations;
  END IF;
END $$;
