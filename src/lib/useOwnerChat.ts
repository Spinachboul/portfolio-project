import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase, type Conversation, type Message, type OwnerPublicKey } from './supabase';
import {
  generateKeyPair,
  importPublicKey,
  deriveSharedKey,
  encryptMessage,
  decryptMessage,
  exportKeyPairForStorage,
  importKeyPairFromStorage,
  type KeyPair,
  type StoredKeyPair,
} from './crypto';

/**
 * Owner-side encrypted chat. The owner's private key is persisted in
 * localStorage (one per device). The owner publishes their public key so
 * visitors can encrypt messages to them.
 *
 * For each conversation, the owner derives a shared key from their private
 * key + the visitor's public key, then decrypts messages.
 */

const OWNER_KEY = 'devjournal.owner.keypair';

type DecryptedMessage = Message & { plaintext: string };

export function useOwnerChat() {
  const [keyPair, setKeyPair] = useState<KeyPair | null>(null);
  const [publishedKey, setPublishedKey] = useState<OwnerPublicKey | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConv, setActiveConv] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<DecryptedMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const sharedKeysRef = useRef<Map<string, CryptoKey>>(new Map());

  // Load or generate the owner key pair, and ensure it's published.
  const ensureKey = useCallback(async () => {
    setError(null);
    try {
      let kp: KeyPair;
      const stored = localStorage.getItem(OWNER_KEY);
      if (stored) {
        try {
          kp = await importKeyPairFromStorage(JSON.parse(stored) as StoredKeyPair);
        } catch {
          kp = await generateKeyPair();
          const exported = await exportKeyPairForStorage(kp);
          localStorage.setItem(OWNER_KEY, JSON.stringify(exported));
        }
      } else {
        kp = await generateKeyPair();
        const exported = await exportKeyPairForStorage(kp);
        localStorage.setItem(OWNER_KEY, JSON.stringify(exported));
      }
      setKeyPair(kp);

      // Check if this public key is already published.
      const { data: existing } = await supabase
        .from('owner_public_keys')
        .select('*')
        .eq('public_key', kp.publicKey)
        .maybeSingle();
      if (existing) {
        setPublishedKey(existing as OwnerPublicKey);
      } else {
        // Publish it.
        const { data, error: insErr } = await supabase
          .from('owner_public_keys')
          .insert({ public_key: kp.publicKey, label: navigator.userAgent.split(' ')[0] || 'Device' })
          .select('*')
          .single();
        if (insErr) throw insErr;
        setPublishedKey(data as OwnerPublicKey);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to set up owner encryption key.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    ensureKey();
  }, [ensureKey]);

  // Load conversations list.
  const loadConversations = useCallback(async () => {
    const { data } = await supabase
      .from('conversations')
      .select('*')
      .order('last_message_at', { ascending: false });
    setConversations((data as Conversation[]) ?? []);
  }, []);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  // Subscribe to new conversations + new messages in any conversation.
  useEffect(() => {
    const convChannel = supabase
      .channel('owner-conversations')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'conversations' },
        () => loadConversations(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(convChannel);
    };
  }, [loadConversations]);

  // Derive shared key for a conversation and load its messages.
  const openConversation = useCallback(async (conv: Conversation) => {
    setActiveConv(conv);
    setError(null);
    if (!keyPair) return;
    try {
      let shared = sharedKeysRef.current.get(conv.id);
      if (!shared) {
        const visitorPub = await importPublicKey(conv.visitor_public_key);
        shared = await deriveSharedKey(keyPair.privateKey, visitorPub);
        sharedKeysRef.current.set(conv.id, shared);
      }
      const { data } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conv.id)
        .order('created_at', { ascending: true });
      if (!data) return;
      const dec: DecryptedMessage[] = [];
      for (const m of data as Message[]) {
        try {
          const plaintext = await decryptMessage(shared, { ciphertext: m.ciphertext, iv: m.iv });
          dec.push({ ...m, plaintext });
        } catch {
          dec.push({ ...m, plaintext: '[unable to decrypt — wrong key?]' });
        }
      }
      setMessages(dec);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to open conversation.');
    }
  }, [keyPair]);

  // Realtime: when a new message arrives in the active conversation, reload.
  useEffect(() => {
    if (!activeConv) return;
    const ch = supabase
      .channel(`owner-msgs:${activeConv.id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${activeConv.id}` },
        () => openConversation(activeConv),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [activeConv, openConversation]);

  const sendMessage = useCallback(
    async (text: string): Promise<boolean> => {
      if (!activeConv) return false;
      const shared = sharedKeysRef.current.get(activeConv.id);
      if (!shared || !text.trim()) return false;
      setSending(true);
      try {
        const payload = await encryptMessage(shared, text.trim());
        const { error: insErr } = await supabase.from('messages').insert({
          conversation_id: activeConv.id,
          sender: 'owner',
          ciphertext: payload.ciphertext,
          iv: payload.iv,
        });
        if (insErr) throw insErr;
        await supabase
          .from('conversations')
          .update({ last_message_at: new Date().toISOString() })
          .eq('id', activeConv.id);
        await openConversation(activeConv);
        return true;
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to send message.');
        return false;
      } finally {
        setSending(false);
      }
    },
    [activeConv, openConversation],
  );

  const deleteConversation = useCallback(async (conv: Conversation) => {
    await supabase.from('conversations').delete().eq('id', conv.id);
    if (activeConv?.id === conv.id) {
      setActiveConv(null);
      setMessages([]);
    }
    await loadConversations();
  }, [activeConv, loadConversations]);

  return {
    keyPair,
    publishedKey,
    conversations,
    activeConv,
    messages,
    loading,
    sending,
    error,
    openConversation,
    sendMessage,
    deleteConversation,
    refreshConversations: loadConversations,
  };
}
