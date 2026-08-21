import { useEffect, useState } from 'react';
import {
  Plus,
  Pencil,
  Trash2,
  Loader2,
  AlertCircle,
  X,
  ArrowUp,
  ArrowDown,
} from 'lucide-react';

import { supabase, type BlueprintEntry } from '../lib/supabase';

const KINDS: { value: BlueprintEntry['kind']; label: string }[] = [
  { value: 'experience', label: 'Experience' },
  { value: 'education', label: 'Education' },
  { value: 'milestone', label: 'Milestone' },
  { value: 'moment', label: 'Moment' },
];

type Draft = {
  id?: string;
  kind: BlueprintEntry['kind'];
  title: string;
  organization: string;
  description: string;
  start_date: string;
  end_date: string;
  sort_order: number;
};

const EMPTY: Draft = {
  kind: 'experience',
  title: '',
  organization: '',
  description: '',
  start_date: '',
  end_date: '',
  sort_order: 0,
};

/**
 * Format database date:
 * 2024-07-01 -> Jul 2024
 */
const formatDate = (date: string | null | undefined) => {
  if (!date) return null;

  const parsed = new Date(`${date}T00:00:00`);

  if (Number.isNaN(parsed.getTime())) {
    return date;
  }

  return parsed.toLocaleDateString('en-US', {
    month: 'short',
    year: 'numeric',
  });
};

/**
 * Display a date range:
 * Jul 2024 → Present
 * Jan 2022 → Jun 2024
 */
const formatDateRange = (
  startDate: string | null | undefined,
  endDate: string | null | undefined
) => {
  const start = formatDate(startDate);
  const end = formatDate(endDate);

  if (!start && !end) {
    return 'Date not specified';
  }

  if (!start) {
    return `Until ${end}`;
  }

  if (!end) {
    return `${start} → Present`;
  }

  return `${start} → ${end}`;
};

export default function BlueprintEditor() {
  const [entries, setEntries] = useState<BlueprintEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Draft | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Load entries.
   *
   * Primary ordering:
   * 1. sort_order
   * 2. start_date
   *
   * This means manual ordering is respected.
   */
  const load = async () => {
    setLoading(true);
    setError(null);

    const { data, error: loadError } = await supabase
      .from('blueprint_entries')
      .select('*')
      .order('sort_order', { ascending: true })
      .order('start_date', { ascending: false });

    if (loadError) {
      setError(loadError.message);
      setEntries([]);
    } else {
      setEntries((data as BlueprintEntry[]) ?? []);
    }

    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  /**
   * Save/create entry.
   */
  const save = async () => {
    if (!editing) return;

    if (!editing.title.trim()) {
      setError('Title is required.');
      return;
    }

    setBusy(true);
    setError(null);

    const body = {
      kind: editing.kind,
      title: editing.title.trim(),
      organization: editing.organization.trim() || null,
      description: editing.description.trim() || null,
      start_date: editing.start_date || null,
      end_date: editing.end_date || null,
      sort_order: editing.sort_order,
    };

    let res;

    if (editing.id) {
      res = await supabase
        .from('blueprint_entries')
        .update(body)
        .eq('id', editing.id);
    } else {
      /*
       * New entries go to the end of the current list.
       */
      const nextSortOrder =
        entries.length > 0
          ? Math.max(...entries.map((entry) => entry.sort_order ?? 0)) + 1
          : 0;

      res = await supabase
        .from('blueprint_entries')
        .insert({
          ...body,
          sort_order: nextSortOrder,
        });
    }

    setBusy(false);

    if (res.error) {
      setError(res.error.message);
      return;
    }

    setEditing(null);
    await load();
  };

  /**
   * Delete an entry.
   */
  const del = async (id: string) => {
    if (!confirm('Delete this entry?')) return;

    setBusy(true);
    setError(null);

    const { error: deleteError } = await supabase
      .from('blueprint_entries')
      .delete()
      .eq('id', id);

    if (deleteError) {
      setError(deleteError.message);
      setBusy(false);
      return;
    }

    setBusy(false);
    await load();
  };

  /**
   * Move an entry up/down by swapping its sort_order
   * with the adjacent entry.
   *
   * Example:
   *
   * A = 0
   * B = 1
   *
   * Move B up:
   *
   * B = 0
   * A = 1
   */
  const move = async (index: number, direction: -1 | 1) => {
    const targetIndex = index + direction;

    if (
      targetIndex < 0 ||
      targetIndex >= entries.length ||
      !entries[index] ||
      !entries[targetIndex]
    ) {
      return;
    }

    const currentEntry = entries[index];
    const targetEntry = entries[targetIndex];

    setBusy(true);
    setError(null);

    /*
     * Use temporary value first so we don't end up
     * with a unique constraint collision if the DB
     * has sort_order uniqueness enabled.
     */
    const temporaryOrder = -Date.now();

    const firstUpdate = await supabase
      .from('blueprint_entries')
      .update({
        sort_order: temporaryOrder,
      })
      .eq('id', currentEntry.id);

    if (firstUpdate.error) {
      setError(firstUpdate.error.message);
      setBusy(false);
      return;
    }

    const secondUpdate = await supabase
      .from('blueprint_entries')
      .update({
        sort_order: currentEntry.sort_order,
      })
      .eq('id', targetEntry.id);

    if (secondUpdate.error) {
      /*
       * Try to restore the original value if the second
       * update fails.
       */
      await supabase
        .from('blueprint_entries')
        .update({
          sort_order: currentEntry.sort_order,
        })
        .eq('id', currentEntry.id);

      setError(secondUpdate.error.message);
      setBusy(false);
      return;
    }

    const thirdUpdate = await supabase
      .from('blueprint_entries')
      .update({
        sort_order: targetEntry.sort_order,
      })
      .eq('id', currentEntry.id);

    if (thirdUpdate.error) {
      setError(thirdUpdate.error.message);
      setBusy(false);
      await load();
      return;
    }

    setBusy(false);
    await load();
  };

  /**
   * Open edit modal.
   */
  const editEntry = (entry: BlueprintEntry) => {
    setEditing({
      id: entry.id,
      kind: entry.kind,
      title: entry.title,
      organization: entry.organization ?? '',
      description: entry.description ?? '',
      start_date: entry.start_date ?? '',
      end_date: entry.end_date ?? '',
      sort_order: entry.sort_order,
    });

    setError(null);
  };

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-serif text-xl font-semibold">
          Blueprint entries
        </h2>

        <button
          type="button"
          onClick={() => {
            setError(null);
            setEditing({
              ...EMPTY,
              sort_order:
                entries.length > 0
                  ? Math.max(
                      ...entries.map((entry) => entry.sort_order ?? 0)
                    ) + 1
                  : 0,
            });
          }}
          className="btn-primary h-9"
          disabled={busy}
        >
          <Plus size={15} />
          Add entry
        </button>
      </div>

      {/* Error */}
      {error && (
        <p className="text-sm text-danger flex items-center gap-1.5 mb-3">
          <AlertCircle size={14} />
          {error}
        </p>
      )}

      {/* Loading */}
      {loading ? (
        <div className="card p-8 grid place-items-center">
          <Loader2 size={20} className="animate-spin text-muted" />
        </div>
      ) : entries.length === 0 ? (
        <div className="card p-8 text-center text-muted text-sm">
          No entries yet. Add your first career milestone.
        </div>
      ) : (
        <div className="space-y-2">
          {entries.map((entry, index) => (
            <div
              key={entry.id}
              className="card p-4 flex items-start gap-3"
            >
              {/* Entry content */}
              <div className="flex-1 min-w-0">
                {/* Kind + organization */}
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="chip bg-surface-2 text-muted">
                    {entry.kind}
                  </span>

                  {entry.organization && (
                    <span className="text-xs text-muted truncate">
                      {entry.organization}
                    </span>
                  )}
                </div>

                {/* Title */}
                <p className="font-semibold">
                  {entry.title}
                </p>

                {/* Date */}
                <p className="text-sm text-muted mt-1">
                  {formatDateRange(
                    entry.start_date,
                    entry.end_date
                  )}
                </p>

                {/* Description */}
                {entry.description && (
                  <p className="text-sm text-muted mt-2 line-clamp-2">
                    {entry.description}
                  </p>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1 shrink-0">
                {/* Move up */}
                <button
                  type="button"
                  onClick={() => move(index, -1)}
                  disabled={index === 0 || busy}
                  className="btn-ghost h-8 w-8 !px-0 disabled:opacity-30 disabled:cursor-not-allowed"
                  title="Move up"
                >
                  <ArrowUp size={14} />
                </button>

                {/* Move down */}
                <button
                  type="button"
                  onClick={() => move(index, 1)}
                  disabled={
                    index === entries.length - 1 || busy
                  }
                  className="btn-ghost h-8 w-8 !px-0 disabled:opacity-30 disabled:cursor-not-allowed"
                  title="Move down"
                >
                  <ArrowDown size={14} />
                </button>

                {/* Edit */}
                <button
                  type="button"
                  onClick={() => editEntry(entry)}
                  disabled={busy}
                  className="btn-ghost h-8 w-8 !px-0 disabled:opacity-30"
                  title="Edit"
                >
                  <Pencil size={14} />
                </button>

                {/* Delete */}
                <button
                  type="button"
                  onClick={() => del(entry.id)}
                  disabled={busy}
                  className="btn-ghost h-8 w-8 !px-0 text-danger disabled:opacity-30"
                  title="Delete"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit / Create modal */}
      {editing && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4 animate-fade-in"
          onClick={() => setEditing(null)}
        >
          <div
            className="card w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto"
            onClick={(event) => event.stopPropagation()}
          >
            {/* Modal header */}
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-serif text-lg font-semibold">
                {editing.id ? 'Edit entry' : 'New entry'}
              </h3>

              <button
                type="button"
                onClick={() => setEditing(null)}
                className="btn-ghost h-8 w-8 !px-0"
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-3">
              {/* Kind */}
              <div>
                <label className="text-xs font-medium text-muted mb-1.5 block">
                  Kind
                </label>

                <select
                  value={editing.kind}
                  onChange={(event) =>
                    setEditing({
                      ...editing,
                      kind: event.target
                        .value as BlueprintEntry['kind'],
                    })
                  }
                  className="input"
                >
                  {KINDS.map((kind) => (
                    <option
                      key={kind.value}
                      value={kind.value}
                    >
                      {kind.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Title */}
              <div>
                <label className="text-xs font-medium text-muted mb-1.5 block">
                  Title
                </label>

                <input
                  type="text"
                  value={editing.title}
                  onChange={(event) =>
                    setEditing({
                      ...editing,
                      title: event.target.value,
                    })
                  }
                  className="input"
                  placeholder="e.g. Software Engineer"
                />
              </div>

              {/* Organization */}
              <div>
                <label className="text-xs font-medium text-muted mb-1.5 block">
                  Organization
                </label>

                <input
                  type="text"
                  value={editing.organization}
                  onChange={(event) =>
                    setEditing({
                      ...editing,
                      organization: event.target.value,
                    })
                  }
                  className="input"
                  placeholder="e.g. TCS"
                />
              </div>

              {/* Dates */}
              <div className="grid grid-cols-2 gap-3">
                {/* Start */}
                <div>
                  <label className="text-xs font-medium text-muted mb-1.5 block">
                    Start date
                  </label>

                  <input
                    type="date"
                    value={editing.start_date}
                    onChange={(event) =>
                      setEditing({
                        ...editing,
                        start_date: event.target.value,
                      })
                    }
                    className="input"
                  />
                </div>

                {/* End */}
                <div>
                  <label className="text-xs font-medium text-muted mb-1.5 block">
                    End date
                  </label>

                  <input
                    type="date"
                    value={editing.end_date}
                    onChange={(event) =>
                      setEditing({
                        ...editing,
                        end_date: event.target.value,
                      })
                    }
                    className="input"
                  />

                  <p className="text-[11px] text-muted mt-1">
                    Leave blank if this is current.
                  </p>
                </div>
              </div>

              {/* Date preview */}
              {(editing.start_date || editing.end_date) && (
                <div className="rounded-md bg-surface-2 px-3 py-2">
                  <p className="text-[11px] text-muted mb-0.5">
                    Display preview
                  </p>

                  <p className="text-sm font-medium">
                    {formatDateRange(
                      editing.start_date,
                      editing.end_date
                    )}
                  </p>
                </div>
              )}

              {/* Description */}
              <div>
                <label className="text-xs font-medium text-muted mb-1.5 block">
                  Description (markdown)
                </label>

                <textarea
                  value={editing.description}
                  onChange={(event) =>
                    setEditing({
                      ...editing,
                      description: event.target.value,
                    })
                  }
                  rows={4}
                  className="input font-mono text-sm"
                  placeholder="Describe this experience..."
                />
              </div>

              {/* Sort order */}
              <div>
                <label className="text-xs font-medium text-muted mb-1.5 block">
                  Sort order
                </label>

                <input
                  type="number"
                  value={editing.sort_order}
                  onChange={(event) =>
                    setEditing({
                      ...editing,
                      sort_order: Number(event.target.value),
                    })
                  }
                  className="input"
                />

                <p className="text-[11px] text-muted mt-1">
                  Lower numbers appear first. You can also use the
                  ↑ / ↓ buttons.
                </p>
              </div>
            </div>

            {/* Modal actions */}
            <div className="flex justify-end gap-2 mt-5">
              <button
                type="button"
                onClick={() => setEditing(null)}
                className="btn-outline h-9"
                disabled={busy}
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={save}
                disabled={busy}
                className="btn-primary h-9"
              >
                {busy ? (
                  <Loader2
                    size={15}
                    className="animate-spin"
                  />
                ) : null}

                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}