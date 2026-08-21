import { useEffect, useState } from 'react';
import {
  Briefcase,
  GraduationCap,
  Award,
  Sparkles,
  AlertCircle,
  CalendarDays,
} from 'lucide-react';

import { supabase, type BlueprintEntry } from '../lib/supabase';
import MarkdownView from '../components/MarkdownView';

const KIND_META: Record<
  BlueprintEntry['kind'],
  {
    label: string;
    Icon: typeof Briefcase;
    color: string;
    dotColor: string;
  }
> = {
  experience: {
    label: 'Experience',
    Icon: Briefcase,
    color: 'text-accent',
    dotColor: 'bg-accent',
  },
  education: {
    label: 'Education',
    Icon: GraduationCap,
    color: 'text-warning',
    dotColor: 'bg-warning',
  },
  milestone: {
    label: 'Milestone',
    Icon: Award,
    color: 'text-success',
    dotColor: 'bg-success',
  },
  moment: {
    label: 'Moment',
    Icon: Sparkles,
    color: 'text-primary',
    dotColor: 'bg-primary',
  },
};

/**
 * Convert:
 * 2024-07-01 -> Jul 2024
 */
function formatDate(date: string | null): string {
  if (!date) return '';

  const parsed = new Date(`${date}T00:00:00`);

  if (Number.isNaN(parsed.getTime())) {
    return date;
  }

  return parsed.toLocaleDateString('en-US', {
    month: 'short',
    year: 'numeric',
  });
}

/**
 * Convert dates into a readable range.
 *
 * Examples:
 * Jul 2024 → Present
 * Jan 2022 → Jun 2024
 * Jun 2023
 */
function formatRange(
  start: string | null,
  end: string | null
): string {
  const formattedStart = formatDate(start);
  const formattedEnd = formatDate(end);

  if (!formattedStart && !formattedEnd) {
    return '';
  }

  if (!formattedStart) {
    return formattedEnd;
  }

  if (!formattedEnd) {
    return `${formattedStart} → Present`;
  }

  return `${formattedStart} → ${formattedEnd}`;
}

export default function Blueprint() {
  const [entries, setEntries] = useState<BlueprintEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadEntries = async () => {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('blueprint_entries')
        .select('*')
        .order('sort_order', { ascending: true })
        .order('start_date', { ascending: false });

      if (fetchError) {
        setError(fetchError.message);
        setEntries([]);
      } else {
        setEntries((data as BlueprintEntry[]) ?? []);
      }

      setLoading(false);
    };

    loadEntries();
  }, []);

  return (
    <div className="container-page py-10 md:py-12 animate-fade-in">
      {/* =====================================================
          HEADER
      ====================================================== */}
      <header className="mb-10 max-w-2xl">
        <div className="flex items-center gap-2 mb-3">
          <span className="h-px w-8 bg-border" />

          <span className="text-xs font-medium uppercase tracking-[0.16em] text-muted">
            Career Timeline
          </span>
        </div>

        <h1 className="font-serif text-4xl md:text-5xl font-semibold tracking-tight">
          Blueprint
        </h1>

        <p className="mt-3 text-muted leading-relaxed max-w-xl">
          Blueprint of my professional career.
        </p>
      </header>

      {/* =====================================================
          LOADING
      ====================================================== */}
      {loading && (
        <div className="relative ml-3 md:ml-5">
          {/* Timeline line */}
          <div className="absolute left-0 top-2 bottom-2 w-px bg-border" />

          <div className="space-y-6">
            {[0, 1, 2].map((item) => (
              <div
                key={item}
                className="relative pl-8 md:pl-10"
              >
                {/* Skeleton dot */}
                <span className="absolute left-[-5px] top-6 h-2.5 w-2.5 rounded-full bg-surface-2" />

                <div className="card p-5 md:p-6 animate-pulse-soft">
                  <div className="h-3 w-24 bg-surface-2 rounded mb-4" />
                  <div className="h-5 w-2/5 bg-surface-2 rounded mb-3" />
                  <div className="h-3 w-32 bg-surface-2 rounded mb-4" />
                  <div className="space-y-2">
                    <div className="h-3 w-full bg-surface-2 rounded" />
                    <div className="h-3 w-4/5 bg-surface-2 rounded" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* =====================================================
          ERROR
      ====================================================== */}
      {!loading && error && (
        <div className="card p-8 text-center">
          <AlertCircle
            size={32}
            className="mx-auto text-danger mb-3"
          />

          <p className="font-medium">
            Unable to load the blueprint
          </p>

          <p className="text-sm text-muted mt-1">
            {error}
          </p>
        </div>
      )}

      {/* =====================================================
          EMPTY STATE
      ====================================================== */}
      {!loading && !error && entries.length === 0 && (
        <div className="card p-10 md:p-12 text-center">
          <div className="mx-auto h-12 w-12 rounded-full bg-surface-2 grid place-items-center mb-4">
            <AlertCircle
              size={22}
              className="text-muted"
            />
          </div>

          <p className="font-medium">
            No blueprint entries yet.
          </p>

          <p className="text-sm text-muted mt-1">
            Your career timeline will appear here.
          </p>
        </div>
      )}

      {/* =====================================================
          TIMELINE
      ====================================================== */}
      {!loading && !error && entries.length > 0 && (
        <div className="relative ml-1 md:ml-4">
          {/* Main timeline */}
          <div className="absolute left-[5px] top-3 bottom-3 w-px bg-border" />

          <ol className="space-y-7">
            {entries.map((entry, index) => {
              const meta = KIND_META[entry.kind];
              const Icon = meta.Icon;

              const dateRange = formatRange(
                entry.start_date,
                entry.end_date
              );

              return (
                <li
                  key={entry.id}
                  className="relative pl-8 md:pl-10 animate-slide-in"
                  style={{
                    animationDelay: `${index * 60}ms`,
                  }}
                >
                  {/* Timeline node */}
                  <span
                    className="
                      absolute
                      left-0
                      top-6
                      grid
                      h-[11px]
                      w-[11px]
                      place-items-center
                      rounded-full
                      bg-bg
                      border
                      border-border
                      z-10
                    "
                    aria-hidden
                  >
                    <span
                      className={`h-[5px] w-[5px] rounded-full ${meta.dotColor}`}
                    />
                  </span>

                  {/* Card */}
                  <article className="card p-5 md:p-6 transition-shadow duration-200 hover:shadow-md">
                    {/* Top row */}
                    <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                      <div className="flex flex-wrap items-center gap-2">
                        {/* Kind */}
                        <span
                          className={`
                            chip
                            bg-surface-2
                            ${meta.color}
                            inline-flex
                            items-center
                            gap-1.5
                          `}
                        >
                          <Icon size={12} />
                          {meta.label}
                        </span>

                        {/* Organization */}
                        {entry.organization && (
                          <>
                            <span className="text-border">
                              /
                            </span>

                            <span className="text-sm text-muted">
                              {entry.organization}
                            </span>
                          </>
                        )}
                      </div>

                      {/* Date */}
                      {dateRange && (
                        <div className="flex items-center gap-1.5 text-xs text-muted whitespace-nowrap">
                          <CalendarDays size={13} />
                          <span>{dateRange}</span>
                        </div>
                      )}
                    </div>

                    {/* Title */}
                    <h2 className="font-serif text-xl md:text-2xl font-semibold tracking-tight">
                      {entry.title}
                    </h2>

                    {/* Description */}
                    {entry.description && (
                      <div className="mt-3 pt-3 border-t border-border">
                        <MarkdownView content={entry.description} />
                      </div>
                    )}
                  </article>
                </li>
              );
            })}
          </ol>
        </div>
      )}
    </div>
  );
}