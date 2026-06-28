import { useEffect, useState } from 'react';
import { ArrowLeft, Calendar, Clock, Tag, AlertCircle } from 'lucide-react';
import { useRouter } from '../lib/router';
import { supabase, type BlogPost } from '../lib/supabase';
import MarkdownView from '../components/MarkdownView';

type Props = { slug: string };

export default function BlogPost({ slug }: Props) {
  const { navigate } = useRouter();
  const [post, setPost] = useState<BlogPost | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setNotFound(false);
      const { data } = await supabase
        .from('blog_posts')
        .select('*')
        .eq('slug', slug)
        .maybeSingle();
      if (!data) {
        setNotFound(true);
        setPost(null);
      } else {
        setPost(data as BlogPost);
      }
      setLoading(false);
    })();
  }, [slug]);

  if (loading) {
    return (
      <div className="container-page py-16 max-w-prose animate-pulse-soft">
        <div className="h-4 w-20 bg-surface-2 rounded mb-6" />
        <div className="h-10 w-3/4 bg-surface-2 rounded mb-4" />
        <div className="h-4 w-1/2 bg-surface-2 rounded mb-8" />
        <div className="space-y-3">
          <div className="h-4 w-full bg-surface-2 rounded" />
          <div className="h-4 w-full bg-surface-2 rounded" />
          <div className="h-4 w-5/6 bg-surface-2 rounded" />
        </div>
      </div>
    );
  }

  if (notFound || !post) {
    return (
      <div className="container-page py-24 text-center">
        <AlertCircle size={40} className="mx-auto text-muted mb-4" />
        <h1 className="font-serif text-2xl font-semibold mb-2">Post not found</h1>
        <p className="text-muted mb-6">This post may have been moved or unpublished.</p>
        <button type="button" onClick={() => navigate('/blog')} className="btn-outline">
          <ArrowLeft size={16} />
          Back to blog
        </button>
      </div>
    );
  }

  return (
    <article className="container-page py-12 max-w-prose animate-fade-in">
      <button
        type="button"
        onClick={() => navigate('/blog')}
        className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-text transition-colors mb-8"
      >
        <ArrowLeft size={15} />
        All posts
      </button>

      <header className="mb-10">
        <h1 className="font-serif text-4xl sm:text-5xl font-semibold leading-tight tracking-tight">
          {post.title}
        </h1>
        {post.excerpt && (
          <p className="mt-4 text-lg text-muted leading-relaxed">{post.excerpt}</p>
        )}
        <div className="mt-6 flex flex-wrap items-center gap-4 text-sm text-muted">
          {post.published_at && (
            <span className="inline-flex items-center gap-1.5">
              <Calendar size={14} />
              {new Date(post.published_at).toLocaleDateString(undefined, {
                year: 'numeric', month: 'long', day: 'numeric',
              })}
            </span>
          )}
          {post.reading_time_min && (
            <span className="inline-flex items-center gap-1.5">
              <Clock size={14} />
              {post.reading_time_min} min read
            </span>
          )}
        </div>
        {post.tags?.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-1.5">
            {post.tags.map((t) => (
              <span key={t} className="chip bg-surface-2 text-muted">
                <Tag size={10} className="mr-1" />
                {t}
              </span>
            ))}
          </div>
        )}
      </header>

      <MarkdownView content={post.content} />

      <hr className="my-12 border-border" />
      <div className="flex items-center justify-between">
        <button type="button" onClick={() => navigate('/blog')} className="btn-outline">
          <ArrowLeft size={16} />
          More posts
        </button>
        <button
          type="button"
          onClick={() => navigate('/contact')}
          className="text-sm font-medium text-accent link-underline"
        >
          Get in touch
        </button>
      </div>
    </article>
  );
}
