import { useEffect, useState } from 'react';
import {
  FileText, Map, MessageSquare, KeyRound, Plus, Pencil, LogOut, Loader2,
  AlertCircle, Lock, ShieldCheck, Send, Trash2, Eye, EyeOff,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useRouter } from '../lib/router';
import { supabase, type BlogPost, type OwnerPublicKey } from '../lib/supabase';
import { useOwnerChat } from '../lib/useOwnerChat';
import { publicKeyFingerprint } from '../lib/crypto';
import PostEditor from '../components/PostEditor';
import BlueprintEditor from '../components/BlueprintEditor';

type Tab = 'posts' | 'blueprint' | 'messages' | 'keys';

export default function Admin() {
  const { user, signOut, loading: authLoading } = useAuth();
  const { navigate } = useRouter();
  const [tab, setTab] = useState<Tab>('posts');
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [postsLoading, setPostsLoading] = useState(true);
  const [editingPost, setEditingPost] = useState<BlogPost | null | 'new'>(null);

  const ownerChat = useOwnerChat();
  const [draft, setDraft] = useState('');
  const [ownerFp, setOwnerFp] = useState('');
  const [showPriv, setShowPriv] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) navigate('/login');
  }, [authLoading, user, navigate]);

  useEffect(() => {
    if (ownerChat.keyPair) publicKeyFingerprint(ownerChat.keyPair.publicKey).then(setOwnerFp);
  }, [ownerChat.keyPair]);

  const loadPosts = async () => {
    setPostsLoading(true);
    const { data } = await supabase
      .from('blog_posts')
      .select('*')
      .order('created_at', { ascending: false });
    setPosts((data as BlogPost[]) ?? []);
    setPostsLoading(false);
  };

  useEffect(() => {
    if (user) loadPosts();
  }, [user]);

  if (authLoading || !user) {
    return (
      <div className="container-page py-24 grid place-items-center">
        <Loader2 size={24} className="animate-spin text-muted" />
      </div>
    );
  }

  // Post editor view
  if (editingPost !== null) {
    return (
      <div className="container-page py-8">
        <PostEditor
          post={editingPost === 'new' ? null : editingPost}
          onSaved={() => { setEditingPost(null); loadPosts(); }}
          onBack={() => setEditingPost(null)}
        />
      </div>
    );
  }

  const TABS: { id: Tab; label: string; Icon: typeof FileText }[] = [
    { id: 'posts', label: 'Posts', Icon: FileText },
    { id: 'blueprint', label: 'Blueprint', Icon: Map },
    { id: 'messages', label: 'Messages', Icon: MessageSquare },
    { id: 'keys', label: 'Encryption', Icon: KeyRound },
  ];

  return (
    <div className="container-page py-8 animate-fade-in">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="font-serif text-3xl font-semibold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted">Signed in as {user.email}</p>
        </div>
        <button
          type="button"
          onClick={() => signOut()}
          className="btn-outline h-9"
        >
          <LogOut size={15} />
          Sign out
        </button>
      </div>

      <div className="flex gap-1 mb-6 border-b border-border overflow-x-auto">
        {TABS.map(({ id, label, Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors whitespace-nowrap ${
              tab === id
                ? 'border-accent text-text'
                : 'border-transparent text-muted hover:text-text'
            }`}
          >
            <Icon size={15} />
            {label}
            {id === 'messages' && ownerChat.conversations.length > 0 && (
              <span className="ml-1 chip bg-surface-2 text-muted text-[10px]">
                {ownerChat.conversations.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* POSTS TAB */}
      {tab === 'posts' && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-serif text-xl font-semibold">Blog posts</h2>
            <button
              type="button"
              onClick={() => setEditingPost('new')}
              className="btn-primary h-9"
            >
              <Plus size={15} />
              New post
            </button>
          </div>
          {postsLoading ? (
            <div className="card p-8 grid place-items-center">
              <Loader2 size={20} className="animate-spin text-muted" />
            </div>
          ) : posts.length === 0 ? (
            <div className="card p-8 text-center text-muted text-sm">
              No posts yet. Write your first one.
            </div>
          ) : (
            <div className="space-y-2">
              {posts.map((p) => (
                <div key={p.id} className="card p-4 flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`chip ${p.published ? 'bg-success/15 text-success' : 'bg-surface-2 text-muted'}`}>
                        {p.published ? 'Published' : 'Draft'}
                      </span>
                      {p.published_at && (
                        <span className="text-xs text-muted">
                          {new Date(p.published_at).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                    <p className="font-semibold truncate">{p.title}</p>
                    <p className="text-xs text-muted font-mono truncate">/{p.slug}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setEditingPost(p)}
                    className="btn-ghost h-8"
                  >
                    <Pencil size={14} />
                    Edit
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* BLUEPRINT TAB */}
      {tab === 'blueprint' && <BlueprintEditor />}

      {/* MESSAGES TAB */}
      {tab === 'messages' && (
        <div>
          {ownerChat.loading ? (
            <div className="card p-8 grid place-items-center">
              <Loader2 size={20} className="animate-spin text-muted" />
            </div>
          ) : !ownerChat.keyPair ? (
            <div className="card p-8 text-center">
              <AlertCircle size={28} className="mx-auto text-muted mb-2" />
              <p className="text-sm text-muted">
                No encryption key found on this device. Visit the Encryption tab to set one up.
              </p>
            </div>
          ) : ownerChat.conversations.length === 0 ? (
            <div className="card p-8 text-center">
              <MessageSquare size={28} className="mx-auto text-muted mb-2" />
              <p className="text-sm text-muted">No conversations yet.</p>
            </div>
          ) : (
            <div className="grid gap-4 lg:grid-cols-[20rem_1fr] h-[32rem]">
              {/* Conversation list */}
              <div className="card overflow-y-auto">
                {ownerChat.conversations.map((c) => {
                  const active = ownerChat.activeConv?.id === c.id;
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => ownerChat.openConversation(c)}
                      className={`w-full text-left p-4 border-b border-border transition-colors ${
                        active ? 'bg-surface-2' : 'hover:bg-surface-2/50'
                      }`}
                    >
                      <p className="font-medium text-sm truncate">
                        {c.visitor_display_name || 'Anonymous visitor'}
                      </p>
                      <p className="text-xs text-muted">
                        {new Date(c.last_message_at).toLocaleString([], {
                          month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
                        })}
                      </p>
                    </button>
                  );
                })}
              </div>

              {/* Active conversation */}
              <div className="card flex flex-col">
                {ownerChat.activeConv ? (
                  <>
                    <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                      <div className="flex items-center gap-2">
                        <Lock size={14} className="text-accent" />
                        <p className="text-sm font-medium">
                          {ownerChat.activeConv.visitor_display_name || 'Anonymous'}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => ownerChat.deleteConversation(ownerChat.activeConv!)}
                        className="text-xs text-muted hover:text-danger inline-flex items-center gap-1"
                      >
                        <Trash2 size={12} />
                        Delete
                      </button>
                    </div>
                    <div className="flex-1 overflow-y-auto p-4 space-y-3">
                      {ownerChat.messages.length === 0 && (
                        <p className="text-center text-sm text-muted py-8">No messages yet.</p>
                      )}
                      {ownerChat.messages.map((m) => {
                        const mine = m.sender === 'owner';
                        return (
                          <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
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
                      {ownerChat.error && (
                        <p className="text-xs text-danger mb-2 flex items-center gap-1.5">
                          <AlertCircle size={12} />
                          {ownerChat.error}
                        </p>
                      )}
                      <div className="flex gap-2">
                        <textarea
                          value={draft}
                          onChange={(e) => setDraft(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                              e.preventDefault();
                              (async () => {
                                if (await ownerChat.sendMessage(draft)) setDraft('');
                              })();
                            }
                          }}
                          rows={1}
                          placeholder="Type a reply..."
                          className="input resize-none flex-1 max-h-32"
                        />
                        <button
                          type="button"
                          onClick={async () => {
                            if (await ownerChat.sendMessage(draft)) setDraft('');
                          }}
                          disabled={ownerChat.sending || !draft.trim()}
                          className="btn-primary !px-3"
                        >
                          {ownerChat.sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                        </button>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="flex-1 grid place-items-center text-sm text-muted">
                    Select a conversation to read and reply.
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* KEYS TAB */}
      {tab === 'keys' && (
        <div className="max-w-2xl space-y-6">
          <div className="card p-6">
            <div className="flex items-center gap-2 mb-4">
              <KeyRound size={18} className="text-accent" />
              <h2 className="font-serif text-xl font-semibold">Your encryption key</h2>
            </div>
            {ownerChat.loading ? (
              <Loader2 size={18} className="animate-spin text-muted" />
            ) : ownerChat.keyPair ? (
              <div className="space-y-4">
                <div className="flex items-start gap-3 p-3 rounded-lg bg-success/10">
                  <ShieldCheck size={18} className="text-success mt-0.5 shrink-0" />
                  <p className="text-sm text-text">
                    Your public key is published. Visitors can encrypt messages to you.
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium text-muted mb-1.5">Public key fingerprint</p>
                  <p className="font-mono text-sm text-text break-all">{ownerFp}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-muted mb-1.5">Public key (base64 SPKI)</p>
                  <div className="relative">
                    <pre className={`font-mono text-xs text-muted bg-surface-2 rounded-lg p-3 pr-10 overflow-x-auto ${showPriv ? '' : 'max-h-20 overflow-hidden'}`}>
                      {ownerChat.keyPair.publicKey}
                    </pre>
                    <button
                      type="button"
                      onClick={() => setShowPriv((v) => !v)}
                      className="absolute top-2 right-2 btn-ghost h-7 w-7 !px-0"
                      title={showPriv ? 'Collapse' : 'Expand'}
                    >
                      {showPriv ? <EyeOff size={13} /> : <Eye size={13} />}
                    </button>
                  </div>
                </div>
                <p className="text-xs text-muted leading-relaxed">
                  Your <strong>private key</strong> is stored only in this browser
                  (localStorage). It never leaves this device. If you sign in on a
                  new device, a new key pair will be generated and published —
                  messages encrypted to the old key can only be read on the old device.
                </p>
              </div>
            ) : (
              <p className="text-sm text-muted">No key set up on this device.</p>
            )}
          </div>

          <PublishedKeys />
        </div>
      )}
    </div>
  );
}

function PublishedKeys() {
  const [keys, setKeys] = useState<OwnerPublicKey[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('owner_public_keys')
      .select('*')
      .order('created_at', { ascending: false });
    setKeys((data as OwnerPublicKey[]) ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const revoke = async (k: OwnerPublicKey) => {
    if (!confirm('Revoke this key? New messages will not be encrypted to it.')) return;
    await supabase.from('owner_public_keys').update({ revoked_at: new Date().toISOString() }).eq('id', k.id);
    await load();
  };

  if (loading) return <Loader2 size={18} className="animate-spin text-muted" />;

  return (
    <div className="card p-6">
      <h3 className="font-serif text-lg font-semibold mb-4">All published keys</h3>
      {keys.length === 0 ? (
        <p className="text-sm text-muted">No keys published.</p>
      ) : (
        <div className="space-y-2">
          {keys.map((k) => (
            <div key={k.id} className="flex items-center gap-3 p-3 rounded-lg bg-surface-2">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-mono truncate">{k.public_key.slice(0, 60)}…</p>
                <p className="text-xs text-muted">
                  {k.label ?? 'Device'} · {new Date(k.created_at).toLocaleDateString()}
                  {k.revoked_at && <span className="text-danger"> · revoked</span>}
                </p>
              </div>
              {!k.revoked_at && (
                <button
                  type="button"
                  onClick={() => revoke(k)}
                  className="btn-ghost h-8 text-danger text-xs"
                >
                  Revoke
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
