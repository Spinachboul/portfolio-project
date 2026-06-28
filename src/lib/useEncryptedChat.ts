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
} from './crypto';

/**
 * Manages a visitor-side encrypted conversation.
 *
 * - Generates (or loads) an ECDH key pair from localStorage.
 * - Fetches the owner's active public key.
 * - Derives a shared AES-GCM key.
 * - Sends and receives encrypted messages.
 *
 * The private key never leaves the browser. The server only sees ciphertext.
 */

const VISITOR_KEY = 'devjournal.visitor.keypair';
const VISITOR_CONV = 'devjournal.visitor.conversation';

type DecryptedMessage = Message & { plaintext: string };

export function useEncryptedChat() {
  const [keyPair, setKeyPair] = useState<KeyPair | null>(null);
  const [ownerKey, setOwnerKey] = useState<OwnerPublicKey | null>(null);
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<DecryptedMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const sharedKeyRef = useRef<CryptoKey | null>(null);

  // Initialize: load or generate visitor key pair, fetch owner key.
  const init = useCallback(async () => {
    setError(null);
    try {
      // Load or generate visitor key pair.
      let kp: KeyPair;
      const stored = localStorage.getItem(VISITOR_KEY);
      if (stored) {
        try {
          kp = await importKeyPairFromStorage(JSON.parse(stored));
        } catch {
          kp = await generateKeyPair();
          const exported = await exportKeyPairForStorage(kp);
          localStorage.setItem(VISITOR_KEY, JSON.stringify(exported));
        }
      } else {
        kp = await generateKeyPair();
        const exported = await exportKeyPairForStorage(kp);
        localStorage.setItem(VISITOR_KEY, JSON.stringify(exported));
      }
      setKeyPair(kp);

      // Fetch the owner's most recent active public key.
      const { data: ownerKeys } = await supabase
        .from('owner_public_keys')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1);
      const ok = (ownerKeys?.[0] as OwnerPublicKey | undefined) ?? null;
      setOwnerKey(ok);

      // Resume an existing conversation if one is stored.
      const storedConvId = localStorage.getItem(VISITOR_CONV);
      if (storedConvId && ok) {
        const { data: conv } = await supabase
          .from('conversations')
          .select('*')
          .eq('id', storedConvId)
          .maybeSingle();
        if (conv && (conv as Conversation).visitor_public_key === kp.publicKey) {
          setConversation(conv as Conversation);
        } else {
          localStorage.removeItem(VISITOR_CONV);
        }
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to initialize secure chat.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    init();
  }, [init]);

  // Derive the shared key whenever we have both sides.
  useEffect(() => {
    (async () => {
      if (!keyPair || !ownerKey || !conversation) {
        sharedKeyRef.current = null;
        return;
      }
      try {
        const ownerPub = await importPublicKey(ownerKey.public_key);
        sharedKeyRef.current = await deriveSharedKey(keyPair.privateKey, ownerPub);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Key exchange failed.');
      }
    })();
  }, [keyPair, ownerKey, conversation]);

  // Load + decrypt messages for the current conversation.
  const loadMessages = useCallback(async () => {
    if (!conversation || !sharedKeyRef.current) return;
    const { data } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversation.id)
      .order('created_at', { ascending: true });
    if (!data) return;
    const dec: DecryptedMessage[] = [];
    for (const m of data as Message[]) {
      try {
        const plaintext = await decryptMessage(sharedKeyRef.current!, {
          ciphertext: m.ciphertext,
          iv: m.iv,
        });
        dec.push({ ...m, plaintext });
      } catch {
        dec.push({ ...m, plaintext: '[unable to decrypt]' });
      }
    }
    setMessages(dec);
  }, [conversation]);

  useEffect(() => {
    if (!conversation || !sharedKeyRef.current) {
      setMessages([]);
      return;
    }
    loadMessages();
  }, [conversation, loadMessages]);

  // Subscribe to new messages via Supabase realtime.
  useEffect(() => {
    if (!conversation) return;
    const channel = supabase
      .channel(`messages:${conversation.id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${conversation.id}` },
        () => {
          loadMessages();
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversation, loadMessages]);

  // Start a new conversation.
  const startConversation = useCallback(
    async (displayName?: string): Promise<boolean> => {
      if (!keyPair || !ownerKey) {
        setError('Secure channel not ready yet.');
        return false;
      }
      try {
        const { data, error: insErr } = await supabase
          .from('conversations')
          .insert({
            visitor_public_key: keyPair.publicKey,
            owner_public_key_id: ownerKey.id,
            visitor_display_name: displayName?.trim() || null,
          })
          .select('*')
          .single();
        if (insErr) throw insErr;
        const conv = data as Conversation;
        setConversation(conv);
        localStorage.setItem(VISITOR_CONV, conv.id);
        return true;
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Could not start conversation.');
        return false;
      }
    },
    [keyPair, ownerKey],
  );

  // Send an encrypted message.
  const sendMessage = useCallback(
    async (text: string): Promise<boolean> => {
      if (!conversation || !sharedKeyRef.current || !text.trim()) return false;
      setSending(true);
      try {
        const payload = await encryptMessage(sharedKeyRef.current, text.trim());
        const { error: insErr } = await supabase.from('messages').insert({
          conversation_id: conversation.id,
          sender: 'visitor',
          ciphertext: payload.ciphertext,
          iv: payload.iv,
        });
        if (insErr) throw insErr;
        // Bump conversation timestamp.
        await supabase
          .from('conversations')
          .update({ last_message_at: new Date().toISOString() })
          .eq('id', conversation.id);
        await loadMessages();
        return true;
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to send message.');
        return false;
      } finally {
        setSending(false);
      }
    },
    [conversation, loadMessages],
  );

  const reset = useCallback(async () => {
    localStorage.removeItem(VISITOR_KEY);
    localStorage.removeItem(VISITOR_CONV);
    setKeyPair(null);
    setConversation(null);
    setMessages([]);
    sharedKeyRef.current = null;
    setLoading(true);
    await init();
  }, [init]);

  return {
    keyPair,
    ownerKey,
    conversation,
    messages,
    loading,
    sending,
    error,
    startConversation,
    sendMessage,
    reset,
    refresh: loadMessages,
  };
}
