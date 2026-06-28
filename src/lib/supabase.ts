import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  throw new Error('Missing Supabase env vars. Check .env for VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
}

export const supabase = createClient(url, anonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

export type BlogPost = {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  content: string;
  tags: string[];
  published: boolean;
  published_at: string | null;
  reading_time_min: number | null;
  created_at: string;
  updated_at: string;
};

export type BlueprintEntry = {
  id: string;
  kind: 'experience' | 'milestone' | 'education' | 'moment';
  title: string;
  organization: string | null;
  description: string | null;
  start_date: string | null;
  end_date: string | null;
  sort_order: number;
  created_at: string;
};

export type OwnerPublicKey = {
  id: string;
  public_key: string;
  label: string | null;
  created_at: string;
  revoked_at: string | null;
};

export type Conversation = {
  id: string;
  visitor_public_key: string;
  owner_public_key_id: string | null;
  visitor_display_name: string | null;
  last_message_at: string;
  created_at: string;
};

export type Message = {
  id: string;
  conversation_id: string;
  sender: 'visitor' | 'owner';
  ciphertext: string;
  iv: string;
  created_at: string;
};
