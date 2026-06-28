import { useEffect, useMemo, useState } from 'react';
import { Search, ArrowRight } from 'lucide-react';
import { useRouter } from '../lib/router';
import { supabase, type BlogPost } from '../lib/supabase';

export default function BlogList() {
  const { navigate } = useRouter();
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [activeTag, setActiveTag] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('blog_posts')
        .select('*')
        .eq('published', true)
        .order('published_at', { ascending: false });
      setPosts((data as BlogPost[]) ?? []);
      setLoading(false);
    })();
  }, []);

  const tags = useMemo(() => {
    const set = new Set<string>();
    posts.forEach((p) => p.tags?.forEach((t) => set.add(t)));
    return Array.from(set).sort();
  }, [posts]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return posts.filter((p) => {
      if (activeTag && !p.tags?.includes(activeTag)) return false;
      if (!q) return true;
      return (
        p.title.toLowerCase().includes(q) ||
        (p.excerpt ?? '').toLowerCase().includes(q) ||
        p.tags.some((t) => t.toLowerCase().includes(q))
      );
    });
  }, [posts, query, activeTag]);

  return (
    <div className="container-page py-12 animate-fade-in">
      <header className="mb-10">
        <h1 className="font-serif text-4xl font-semibold tracking-tight">Blog</h1>
        <p className="mt-2 text-muted">
            Essays, notes, and code — mostly about building software.
        </p>
      </header>

      <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between mb-8">
        <div className="relative w-full sm:max-w-xs">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search posts..."
            className="input pl-9"
          />
        </div>
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => setActiveTag(null)}
              className={`chip transition-colors ${
                activeTag === null
                  ? 'bg-primary text-primary-fg'
                  : 'bg-surface-2 text-muted hover:text-text'
              }`}
            >
              All
            </button>
            {tags.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setActiveTag(t === activeTag ? null : t)}
                className={`chip transition-colors ${
                  activeTag === t
                    ? 'bg-primary text-primary-fg'
                    : 'bg-surface-2 text-muted hover:text-text'
                }`}
              >
                #{t}
              </button>
            ))}
          </div>
        )}
      </div>

      {loading ? (
        <div className="grid gap-4">
          {[0, 1, 2].map((i) => (
            <div key={i} className="card p-6 animate-pulse-soft">
              <div className="h-4 w-32 bg-surface-2 rounded mb-3" />
              <div className="h-7 w-2/3 bg-surface-2 rounded mb-2" />
              <div className="h-4 w-full bg-surface-2 rounded" />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="card p-12 text-center">
          <p className="text-muted">
            {query || activeTag
              ? 'No posts match your filters.'
              : 'No posts published yet. Check back soon.'}
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
          {filtered.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => navigate(`/blog/${p.slug}`)}
              className="card p-6 text-left hover:border-accent/50 hover:shadow-sm transition-all group"
            >
              <div className="flex items-center gap-2 text-xs text-muted mb-3">
                {p.published_at && (
                  <time>
                    {new Date(p.published_at).toLocaleDateString(undefined, {
                      year: 'numeric', month: 'short', day: 'numeric',
                    })}
                  </time>
                )}
                {p.reading_time_min && (
                  <>
                    <span>·</span>
                    <span>{p.reading_time_min} min read</span>
                  </>
                )}
              </div>
              <h2 className="font-serif text-2xl font-semibold mb-2 group-hover:text-accent transition-colors">
                {p.title}
              </h2>
              <p className="text-muted leading-relaxed line-clamp-2">
                {p.excerpt || 'No excerpt.'}
              </p>
              {p.tags?.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-1.5">
                  {p.tags.map((t) => (
                    <span key={t} className="chip bg-surface-2 text-muted">#{t}</span>
                  ))}
                </div>
              )}
              <span className="mt-5 inline-flex items-center gap-1 text-sm font-medium text-accent">
                Read post
                <ArrowRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
