import { useEffect, useRef, useState } from 'react';
import {
  Github, Linkedin, Twitter, Send, Lock, ShieldCheck, Loader2, AlertCircle, RefreshCw, User,
} from 'lucide-react';
import { useEncryptedChat } from '../lib/useEncryptedChat';
import { publicKeyFingerprint } from '../lib/crypto';

const SOCIALS = [
  { href: 'https://github.com/Spinachboul', label: 'GitHub', handle: '@Spinachboul', Icon: Github, desc: 'Open source & side projects' },
  { href: 'https://linkedin.com/in/mriduljainindia', label: 'LinkedIn', handle: '/in/mriduljainindia', Icon: Linkedin, desc: 'Professional background' },
  { href: 'https://x.com', label: 'X', handle: '@yourhandle', Icon: Twitter, desc: 'Thoughts & updates' },
];

export default function Contact() {
  const {
    keyPair, ownerKey, conversation, messages, loading, sending, error,
    startConversation, sendMessage, reset,
  } = useEncryptedChat();

  const [name, setName] = useState('');
  const [draft, setDraft] = useState('');
  const [fingerprint, setFingerprint] = useState('');
  const [ownerFp, setOwnerFp] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (keyPair) publicKeyFingerprint(keyPair.publicKey).then(setFingerprint);
  }, [keyPair]);
  useEffect(() => {
    if (ownerKey) publicKeyFingerprint(ownerKey.public_key).then(setOwnerFp);
  }, [ownerKey]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  const handleStart = async () => {
    await startConversation(name);
  };

  const handleSend = async () => {
    const ok = await sendMessage(draft);
    if (ok) setDraft('');
  };

  return (
    <div className="container-page py-12 animate-fade-in">
      <header className="mb-10 max-w-2xl">
        <h1 className="font-serif text-4xl font-semibold tracking-tight">Contact</h1>
        <p className="mt-2 text-muted leading-relaxed">
          Reach out on social, or send a private message. Direct messages here are
          end-to-end encrypted — only you and I can read them.
        </p>
      </header>

      <div className="grid gap-8 lg:grid-cols-[1fr_1.2fr]">
        {/* Social links */}
        <section>
          <h2 className="font-serif text-xl font-semibold mb-4">Find me online</h2>
          <div className="space-y-3">
            {SOCIALS.map(({ href, label, handle, Icon, desc }) => (
              <a
                key={label}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="card p-5 flex items-center gap-4 hover:border-accent/50 hover:shadow-sm transition-all group"
              >
                <span className="grid h-11 w-11 place-items-center rounded-lg bg-surface-2 text-accent group-hover:scale-105 transition-transform">
                  <Icon size={20} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">{label}</p>
                  <p className="text-sm text-muted truncate">{desc}</p>
                </div>
                <span className="text-sm text-muted font-mono">{handle}</span>
              </a>
            ))}
          </div>

          <div className="mt-6 card p-5 bg-surface-2">
            <div className="flex items-start gap-3">
              <ShieldCheck size={20} className="text-success mt-0.5 shrink-0" />
              <div className="text-sm text-muted leading-relaxed">
                <p className="font-medium text-text mb-1">How encryption works</p>
                Your browser generates an ECDH key pair (P-256). A shared AES-256-GCM
                key is derived from your private key and my published public key.
                Messages are encrypted before they ever leave your device. I decrypt
                them with my private key, which never leaves my browser.
              </div>
            </div>
          </div>
        </section>

        {/* Encrypted chat */}
        <section className="card flex flex-col h-[32rem]">
          <div className="flex items-center justify-between px-5 py-3 border-b border-border">
            <div className="flex items-center gap-2">
              <Lock size={16} className="text-accent" />
              <h2 className="font-semibold">Encrypted DM</h2>
            </div>
            {conversation && (
              <button
                type="button"
                onClick={reset}
                className="text-xs text-muted hover:text-text inline-flex items-center gap-1"
                title="Reset secure session"
              >
                <RefreshCw size={12} />
                Reset
              </button>
            )}
          </div>

          {loading ? (
            <div className="flex-1 grid place-items-center">
              <Loader2 size={24} className="animate-spin text-muted" />
            </div>
          ) : !ownerKey ? (
            <div className="flex-1 grid place-items-center p-6 text-center">
              <div>
                <AlertCircle size={28} className="mx-auto text-muted mb-2" />
                <p className="text-sm text-muted">
                  Secure messaging isn't available right now. The site owner hasn't
                  published an encryption key yet.
                </p>
              </div>
            </div>
          ) : !conversation ? (
            <div className="flex-1 flex flex-col p-5">
              <p className="text-sm text-muted mb-4">
                Start a private, encrypted conversation. Your messages can only be
                read by the recipient.
              </p>
              <label className="text-xs font-medium text-muted mb-1.5">
                Your name (optional)
              </label>
              <div className="relative">
                <User size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Anonymous"
                  className="input pl-9"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleStart();
                  }}
                />
              </div>
              {keyPair && (
                <p className="mt-3 text-xs text-muted font-mono break-all">
                  Your key fingerprint: <span className="text-text">{fingerprint}</span>
                </p>
              )}
              {ownerKey && (
                <p className="mt-1 text-xs text-muted font-mono break-all">
                  Owner key fingerprint: <span className="text-text">{ownerFp}</span>
                </p>
              )}
              <div className="flex-1" />
              <button type="button" onClick={handleStart} className="btn-primary w-full">
                <Lock size={15} />
                Start encrypted chat
              </button>
            </div>
          ) : (
            <>
              <div className="px-5 py-2 bg-surface-2 border-b border-border text-xs text-muted flex items-center gap-2">
                <ShieldCheck size={12} className="text-success" />
                End-to-end encrypted · {messages.length} message{messages.length === 1 ? '' : 's'}
              </div>
              <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
                {messages.length === 0 && (
                  <p className="text-center text-sm text-muted py-8">
                    Say hello — your message will be encrypted before it leaves this device.
                  </p>
                )}
                {messages.map((m) => {
                  const mine = m.sender === 'visitor';
                  return (
                    <div
                      key={m.id}
                      className={`flex ${mine ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm ${
                          mine
                            ? 'bg-primary text-primary-fg rounded-br-md'
                            : 'bg-surface-2 text-text rounded-bl-md'
                        }`}
                      >
                        <p className="whitespace-pre-wrap break-words">{m.plaintext}</p>
                        <p className={`text-[10px] mt-1 ${mine ? 'text-primary-fg/60' : 'text-muted'}`}>
                          {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="p-3 border-t border-border">
                {error && (
                  <p className="text-xs text-danger mb-2 flex items-center gap-1.5">
                    <AlertCircle size={12} />
                    {error}
                  </p>
                )}
                <div className="flex gap-2">
                  <textarea
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSend();
                      }
                    }}
                    rows={1}
                    placeholder="Type an encrypted message..."
                    className="input resize-none flex-1 max-h-32"
                  />
                  <button
                    type="button"
                    onClick={handleSend}
                    disabled={sending || !draft.trim()}
                    className="btn-primary !px-3"
                    aria-label="Send"
                  >
                    {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                  </button>
                </div>
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
