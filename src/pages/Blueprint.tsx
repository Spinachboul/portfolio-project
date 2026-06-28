import { useEffect, useState } from 'react';
import { Briefcase, GraduationCap, Award, Sparkles, AlertCircle } from 'lucide-react';
import { supabase, type BlueprintEntry } from '../lib/supabase';
import MarkdownView from '../components/MarkdownView';

const KIND_META: Record<
  BlueprintEntry['kind'],
  { label: string; Icon: typeof Briefcase; color: string }
> = {
  experience: { label: 'Experience', Icon: Briefcase, color: 'text-accent' },
  education: { label: 'Education', Icon: GraduationCap, color: 'text-warning' },
  milestone: { label: 'Milestone', Icon: Award, color: 'text-success' },
  moment: { label: 'Moment', Icon: Sparkles, color: 'text-primary' },
};

function formatRange(start: string | null, end: string | null): string {
  const fmt = (d: string | null) =>
    d ? new Date(d + '-02').toLocaleDateString(undefined, { year: 'numeric', month: 'short' }) : '';
  if (!start && !end) return '';
  if (!end) return `${fmt(start)} — Present`;
  if (!start) return fmt(end);
  return `${fmt(start)} — ${fmt(end)}`;
}

export default function Blueprint() {
  const [entries, setEntries] = useState<BlueprintEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('blueprint_entries')
        .select('*')
        .order('start_date', { ascending: false })
        .order('sort_order', { ascending: false });
      setEntries((data as BlueprintEntry[]) ?? []);
      setLoading(false);
    })();
  }, []);

  return (
    <div className="container-page py-12 animate-fade-in">
      <header className="mb-12 max-w-2xl">
        <h1 className="font-serif text-4xl font-semibold tracking-tight">Blueprint</h1>
        <p className="mt-2 text-muted leading-relaxed">
          The path so far — roles, milestones, and the moments in between.
        </p>
      </header>

      {loading ? (
        <div className="space-y-4">
          {[0, 1, 2].map((i) => (
            <div key={i} className="card p-6 animate-pulse-soft">
              <div className="h-4 w-24 bg-surface-2 rounded mb-3" />
              <div className="h-6 w-1/2 bg-surface-2 rounded mb-2" />
              <div className="h-4 w-full bg-surface-2 rounded" />
            </div>
          ))}
        </div>
      ) : entries.length === 0 ? (
        <div className="card p-12 text-center">
          <AlertCircle size={36} className="mx-auto text-muted mb-3" />
          <p className="text-muted">No blueprint entries yet.</p>
        </div>
      ) : (
        <ol className="relative border-l border-border ml-3 space-y-10">
          {entries.map((e) => {
            const meta = KIND_META[e.kind];
            const { Icon } = meta;
            return (
              <li key={e.id} className="relative pl-8 animate-slide-in">
                <span
                  className="absolute -left-[9px] top-1.5 grid h-4 w-4 place-items-center rounded-full bg-bg border border-border"
                  aria-hidden
                >
                  <span className={`h-2 w-2 rounded-full bg-current ${meta.color}`} />
                </span>
                <span className={`absolute left-0 top-0.5 ${meta.color}`} aria-hidden>
                  <Icon size={16} className="-translate-x-1/2 translate-y-0.5" />
                </span>
                <div className="card p-6">
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <span className={`chip bg-surface-2 ${meta.color}`}>
                      <Icon size={11} className="mr-1" />
                      {meta.label}
                    </span>
                    {e.organization && (
                      <span className="text-sm text-muted">· {e.organization}</span>
                    )}
                  </div>
                  <h3 className="font-serif text-xl font-semibold mb-1">{e.title}</h3>
                  {(e.start_date || e.end_date) && (
                    <p className="text-sm text-muted mb-3">{formatRange(e.start_date, e.end_date)}</p>
                  )}
                  {e.description && (
                    <div className="mt-2">
                      <MarkdownView content={e.description} />
                    </div>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
