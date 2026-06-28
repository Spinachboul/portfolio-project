import { useEffect, useState } from 'react';
import { ArrowRight, FileText, Map, MessageSquareCode, Sparkles } from 'lucide-react';
import { useRouter } from '../lib/router';
import { supabase, type BlogPost } from '../lib/supabase';

export default function Home() {
  const { navigate } = useRouter();
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('blog_posts')
        .select('*')
        .eq('published', true)
        .order('published_at', { ascending: false })
        .limit(3);
      setPosts((data as BlogPost[]) ?? []);
      setLoading(false);
    })();
  }, []);

  return (
    <div className="animate-fade-in">
      {/* Hero */}
      <section className="container-page pt-16 pb-20 sm:pt-24 sm:pb-28">
        <div className="max-w-3xl">
          <span className="chip bg-surface-2 text-muted mb-5">
            <Sparkles size={12} className="mr-1.5" />
            Personal developer journal
          </span>
          <h1 className="font-serif text-4xl sm:text-6xl font-semibold leading-[1.05] tracking-tight">
            Notes, code, and a career
            <br />
            <span className="text-accent">in the open.</span>
          </h1>
          <p className="mt-6 text-lg text-muted leading-relaxed max-w-2xl">
            A quiet corner of the internet where I publish what I learn, map out
            the path so far, and keep an end-to-end encrypted line open for anyone
            who wants to talk.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <button type="button" onClick={() => navigate('/blog')} className="btn-primary">
              Read the blog
              <ArrowRight size={16} />
            </button>
            <button type="button" onClick={() => navigate('/contact')} className="btn-outline">
              <MessageSquareCode size={16} />
              Send an encrypted message
            </button>
          </div>
        </div>
      </section>

      {/* Feature cards */}
      <section className="container-page pb-16">
        <div className="grid gap-4 sm:grid-cols-3">
          {[
            {
              Icon: FileText,
              title: 'Blog',
              body: 'Long-form posts in markdown with syntax-highlighted code you can copy in one click.',
              to: '/blog',
            },
            {
              Icon: Map,
              title: 'Blueprint',
              body: 'A timeline of the roles, projects, and moments that shaped the journey so far.',
              to: '/blueprint',
            },
            {
              Icon: MessageSquareCode,
              title: 'Encrypted DMs',
              body: 'Reach out privately. Messages are end-to-end encrypted — only we can read them.',
              to: '/contact',
            },
          ].map(({ Icon, title, body, to }) => (
            <button
              key={title}
              type="button"
              onClick={() => navigate(to)}
              className="card p-6 text-left hover:border-accent/50 hover:shadow-sm transition-all group"
            >
              <span className="grid h-10 w-10 place-items-center rounded-lg bg-surface-2 text-accent mb-4 group-hover:scale-105 transition-transform">
                <Icon size={20} />
              </span>
              <h3 className="font-serif text-xl font-semibold mb-1.5">{title}</h3>
              <p className="text-sm text-muted leading-relaxed">{body}</p>
              <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-accent">
                Explore
                <ArrowRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
              </span>
            </button>
          ))}
        </div>
      </section>

      {/* Recent posts */}
      <section className="container-page pb-20">
        <div className="flex items-end justify-between mb-6">
          <div>
            <h2 className="font-serif text-2xl font-semibold">Recent writing</h2>
            <p className="text-sm text-muted mt-1">Latest posts from the journal.</p>
          </div>
          <button
            type="button"
            onClick={() => navigate('/blog')}
            className="text-sm font-medium text-accent link-underline"
          >
            All posts
          </button>
        </div>

        {loading ? (
          <div className="grid gap-4 sm:grid-cols-2">
            {[0, 1].map((i) => (
              <div key={i} className="card p-6 animate-pulse-soft">
                <div className="h-4 w-24 bg-surface-2 rounded mb-3" />
                <div className="h-6 w-3/4 bg-surface-2 rounded mb-2" />
                <div className="h-4 w-full bg-surface-2 rounded" />
              </div>
            ))}
          </div>
        ) : posts.length === 0 ? (
          <div className="card p-10 text-center">
            <p className="text-muted">
              No posts published yet. Check back soon.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {posts.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => navigate(`/blog/${p.slug}`)}
                className="card p-6 text-left hover:border-accent/50 hover:shadow-sm transition-all group"
              >
                <div className="flex items-center gap-2 text-xs text-muted mb-3">
                  {p.published_at && (
                    <time>{new Date(p.published_at).toLocaleDateString(undefined, {
                      year: 'numeric', month: 'short', day: 'numeric',
                    })}</time>
                  )}
                  {p.reading_time_min && (
                    <>
                      <span>·</span>
                      <span>{p.reading_time_min} min read</span>
                    </>
                  )}
                </div>
                <h3 className="font-serif text-xl font-semibold mb-2 group-hover:text-accent transition-colors">
                  {p.title}
                </h3>
                <p className="text-sm text-muted leading-relaxed line-clamp-2">
                  {p.excerpt || 'No excerpt.'}
                </p>
                {p.tags?.length > 0 && (
                  <div className="mt-4 flex flex-wrap gap-1.5">
                    {p.tags.slice(0, 3).map((t) => (
                      <span key={t} className="chip bg-surface-2 text-muted">#{t}</span>
                    ))}
                  </div>
                )}
              </button>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
