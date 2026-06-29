import { useEffect, useState, useRef } from 'react';
import { Save, Eye, Pencil, Loader2, AlertCircle, ArrowLeft, Trash2 } from 'lucide-react';
import { supabase, type BlogPost } from '../lib/supabase';
import { estimateReadingTime, slugify } from '../lib/markdown';
import MarkdownView from './MarkdownView';

type Props = {
  post: BlogPost | null;
  onSaved: () => void;
  onBack: () => void;
};

export default function PostEditor({ post, onSaved, onBack }: Props) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [title, setTitle] = useState(post?.title ?? '');
  const [slug, setSlug] = useState(post?.slug ?? '');
  const [excerpt, setExcerpt] = useState(post?.excerpt ?? '');
  const [content, setContent] = useState(post?.content ?? '');
  const [tags, setTags] = useState((post?.tags ?? []).join(', '));
  const [published, setPublished] = useState(post?.published ?? false);
  const [view, setView] = useState<'write' | 'preview'>('write');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset form whenever the post prop changes (handles navigating between posts or to "New Post")
  useEffect(() => {
    if (post) {
      setTitle(post.title);
      setSlug(post.slug);
      setExcerpt(post.excerpt ?? '');
      setContent(post.content);
      setTags((post.tags ?? []).join(', '));
      setPublished(post.published);
    } else {
      setTitle('');
      setSlug('');
      setExcerpt('');
      setContent('');
      setTags('');
      setPublished(false);
    }
    setView('write');
    setError(null);
  }, [post]);

  const clearError = () => setError(null);

  const save = async (publish: boolean) => {
    setError(null);
    if (!title.trim() || !content.trim()) {
      setError('Title and content are required.');
      return;
    }

    setBusy(true);
    const finalSlug = (slug.trim() || slugify(title)).toLowerCase();
    
    const body = {
      title: title.trim(),
      slug: finalSlug,
      excerpt: excerpt.trim() || null,
      content,
      tags: tags.split(',').map((t) => t.trim()).filter(Boolean),
      published: publish,
      // Keep the original published_at date if it exists, otherwise set to now
      published_at: publish ? (post?.published_at || new Date().toISOString()) : null,
      reading_time_min: estimateReadingTime(content),
    };

    let result;
    if (post) {
      result = await supabase.from('blog_posts').update(body).eq('id', post.id).select('*').single();
    } else {
      result = await supabase.from('blog_posts').insert(body).select('*').single();
    }

    setBusy(false);

    if (result.error) {
      setError(result.error.message);
      return;
    }

    onSaved();
  };

  const del = async () => {
    if (!post) return;
    if (!confirm('Delete this post? This cannot be undone.')) return;
    
    setBusy(true);
    const { error: delErr } = await supabase.from('blog_posts').delete().eq('id', post.id);
    setBusy(false);
    
    if (delErr) {
      setError(delErr.message);
      return;
    }
    
    onSaved();
  };

  // Helper to inject text at a specific cursor position safely
  const insertAtCursor = (text: string, cursorStart: number, cursorEnd: number) => {
    const textarea = textareaRef.current;
    if (!textarea) {
      setContent((prev) => prev + text);
      return;
    }

    // Use functional state update to prevent overwriting text if user typed during upload
    setContent((prev) => prev.substring(0, cursorStart) + text + prev.substring(cursorEnd));

    requestAnimationFrame(() => {
      textarea.focus();
      const newPos = cursorStart + text.length;
      textarea.selectionStart = textarea.selectionEnd = newPos;
    });
  };

  const uploadAndInsertImage = async (file: File, cursorStart: number, cursorEnd: number) => {
    if (!file.type.startsWith('image/')) return;

    setBusy(true);
    const fileName = `${Date.now()}-${file.name}`;

    const { error } = await supabase.storage.from('blog-images').upload(fileName, file);
    setBusy(false);

    if (error) {
      setError(error.message);
      return;
    }

    // Safely destructure the public URL (Supabase v2 syntax)
    const { data: { publicUrl } } = supabase.storage.from('blog-images').getPublicUrl(fileName);
    const markdown = `\n![${file.name}](${publicUrl})\n`;

    insertAtCursor(markdown, cursorStart, cursorEnd);
  };

  const handleDrop = async (e: React.DragEvent<HTMLTextAreaElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (!file) return;

    // Capture cursor synchronously BEFORE the async upload
    const textarea = textareaRef.current;
    const start = textarea?.selectionStart ?? content.length;
    const end = textarea?.selectionEnd ?? content.length;

    await uploadAndInsertImage(file, start, end);
  };

  const handlePaste = async (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const file = e.clipboardData.files[0];
    if (!file || !file.type.startsWith('image/')) return;

    e.preventDefault();

    // Capture cursor synchronously BEFORE the async upload
    const textarea = textareaRef.current;
    const start = textarea?.selectionStart ?? content.length;
    const end = textarea?.selectionEnd ?? content.length;

    await uploadAndInsertImage(file, start, end);
  };

  return (
    <div className="animate-fade-in">
      <button
        type="button"
        onClick={onBack}
        className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-text transition-colors mb-4"
      >
        <ArrowLeft size={15} />
        Back to posts
      </button>

      <div className="card">
        <div className="flex flex-wrap items-center justify-between gap-2 p-4 border-b border-border">
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setView('write')}
              className={`btn h-8 ${view === 'write' ? 'bg-surface-2 text-text' : 'text-muted'}`}
            >
              <Pencil size={14} />
              Write
            </button>
            <button
              type="button"
              onClick={() => setView('preview')}
              className={`btn h-8 ${view === 'preview' ? 'bg-surface-2 text-text' : 'text-muted'}`}
            >
              <Eye size={14} />
              Preview
            </button>
          </div>
          <div className="flex items-center gap-2">
            {post && (
              <button
                type="button"
                onClick={del}
                disabled={busy}
                className="btn h-8 text-danger hover:bg-danger/10"
              >
                <Trash2 size={14} />
                Delete
              </button>
            )}
            <button
              type="button"
              onClick={() => save(false)}
              disabled={busy}
              className="btn-outline h-8"
            >
              Save draft
            </button>
            <button
              type="button"
              onClick={() => save(true)}
              disabled={busy}
              className="btn-primary h-8"
            >
              {busy ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
              {post ? (published ? 'Update' : 'Publish') : 'Publish'}
            </button>
          </div>
        </div>

        <div className="p-5 space-y-4">
          {error && (
            <p className="text-sm text-danger flex items-center gap-1.5">
              <AlertCircle size={14} />
              {error}
            </p>
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="text-xs font-medium text-muted mb-1.5 block">Title</label>
              <input
                type="text"
                value={title}
                onChange={(e) => { setTitle(e.target.value); clearError(); }}
                placeholder="A great title"
                className="input"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted mb-1.5 block">Slug</label>
              <input
                type="text"
                value={slug}
                onChange={(e) => { setSlug(e.target.value); clearError(); }}
                placeholder="auto-generated-from-title"
                className="input font-mono"
              />
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-muted mb-1.5 block">Excerpt</label>
            <input
              type="text"
              value={excerpt}
              onChange={(e) => { setExcerpt(e.target.value); clearError(); }}
              placeholder="One-line summary shown in the post list"
              className="input"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-muted mb-1.5 block">Tags (comma-separated)</label>
            <input
              type="text"
              value={tags}
              onChange={(e) => { setTags(e.target.value); clearError(); }}
              placeholder="typescript, react, devops"
              className="input"
            />
          </div>

          {view === 'write' ? (
            <div>
              <label className="text-xs font-medium text-muted mb-1.5 block">
                Content (Markdown — supports code blocks with syntax highlighting)
              </label>
              <textarea
                ref={textareaRef}
                value={content}
                onChange={(e) => { setContent(e.target.value); clearError(); }}
                onDrop={handleDrop}
                onPaste={handlePaste}
                onDragOver={(e) => e.preventDefault()}
                rows={20}
                placeholder={'# Hello world\n\nWrite your post...'}
                className="input font-mono text-sm leading-relaxed resize-y"
              />
            </div>
          ) : (
            <div className="rounded-lg border border-border p-6 min-h-[24rem] bg-surface overflow-y-auto">
              {content.trim() ? (
                <MarkdownView content={content} />
              ) : (
                <p className="text-muted text-sm">Nothing to preview yet.</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}