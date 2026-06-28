import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, Loader2, AlertCircle, X, ArrowUp, ArrowDown } from 'lucide-react';
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

export default function BlueprintEditor() {
  const [entries, setEntries] = useState<BlueprintEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Draft | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('blueprint_entries')
      .select('*')
      .order('start_date', { ascending: false });
    setEntries((data as BlueprintEntry[]) ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

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
      res = await supabase.from('blueprint_entries').update(body).eq('id', editing.id);
    } else {
      res = await supabase.from('blueprint_entries').insert(body);
    }
    setBusy(false);
    if (res.error) {
      setError(res.error.message);
      return;
    }
    setEditing(null);
    await load();
  };

  const del = async (id: string) => {
    if (!confirm('Delete this entry?')) return;
    await supabase.from('blueprint_entries').delete().eq('id', id);
    await load();
  };

  const move = async (entry: BlueprintEntry, dir: -1 | 1) => {
    const newOrder = entry.sort_order + dir;
    await supabase.from('blueprint_entries').update({ sort_order: newOrder }).eq('id', entry.id);
    await load();
  };

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-serif text-xl font-semibold">Blueprint entries</h2>
        <button
          type="button"
          onClick={() => setEditing({ ...EMPTY })}
          className="btn-primary h-9"
        >
          <Plus size={15} />
          Add entry
        </button>
      </div>

      {error && (
        <p className="text-sm text-danger flex items-center gap-1.5 mb-3">
          <AlertCircle size={14} />
          {error}
        </p>
      )}

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
          {entries.map((e) => (
            <div key={e.id} className="card p-4 flex items-start gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="chip bg-surface-2 text-muted">{e.kind}</span>
                  {e.organization && <span className="text-xs text-muted">{e.organization}</span>}
                </div>
                <p className="font-semibold">{e.title}</p>
                <p className="text-xs text-muted">
                  {e.start_date ?? '—'} → {e.end_date ?? 'present'}
                </p>
              </div>
              <div className="flex items-center gap-1">
                <button type="button" onClick={() => move(e, 1)} className="btn-ghost h-8 w-8 !px-0" title="Move up">
                  <ArrowUp size={14} />
                </button>
                <button type="button" onClick={() => move(e, -1)} className="btn-ghost h-8 w-8 !px-0" title="Move down">
                  <ArrowDown size={14} />
                </button>
                <button
                  type="button"
                  onClick={() => setEditing({
                    id: e.id, kind: e.kind, title: e.title,
                    organization: e.organization ?? '', description: e.description ?? '',
                    start_date: e.start_date ?? '', end_date: e.end_date ?? '',
                    sort_order: e.sort_order,
                  })}
                  className="btn-ghost h-8 w-8 !px-0"
                >
                  <Pencil size={14} />
                </button>
                <button
                  type="button"
                  onClick={() => del(e.id)}
                  className="btn-ghost h-8 w-8 !px-0 text-danger"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {editing && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4 animate-fade-in" onClick={() => setEditing(null)}>
          <div className="card w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-serif text-lg font-semibold">
                {editing.id ? 'Edit entry' : 'New entry'}
              </h3>
              <button type="button" onClick={() => setEditing(null)} className="btn-ghost h-8 w-8 !px-0">
                <X size={16} />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-muted mb-1.5 block">Kind</label>
                <select
                  value={editing.kind}
                  onChange={(e) => setEditing({ ...editing, kind: e.target.value as BlueprintEntry['kind'] })}
                  className="input"
                >
                  {KINDS.map((k) => (
                    <option key={k.value} value={k.value}>{k.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-muted mb-1.5 block">Title</label>
                <input
                  type="text"
                  value={editing.title}
                  onChange={(e) => setEditing({ ...editing, title: e.target.value })}
                  className="input"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted mb-1.5 block">Organization</label>
                <input
                  type="text"
                  value={editing.organization}
                  onChange={(e) => setEditing({ ...editing, organization: e.target.value })}
                  className="input"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-muted mb-1.5 block">Start date</label>
                  <input
                    type="date"
                    value={editing.start_date}
                    onChange={(e) => setEditing({ ...editing, start_date: e.target.value })}
                    className="input"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted mb-1.5 block">End date (blank = present)</label>
                  <input
                    type="date"
                    value={editing.end_date}
                    onChange={(e) => setEditing({ ...editing, end_date: e.target.value })}
                    className="input"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-muted mb-1.5 block">Description (markdown)</label>
                <textarea
                  value={editing.description}
                  onChange={(e) => setEditing({ ...editing, description: e.target.value })}
                  rows={4}
                  className="input font-mono text-sm"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted mb-1.5 block">Sort order</label>
                <input
                  type="number"
                  value={editing.sort_order}
                  onChange={(e) => setEditing({ ...editing, sort_order: Number(e.target.value) })}
                  className="input"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-5">
              <button type="button" onClick={() => setEditing(null)} className="btn-outline h-9">
                Cancel
              </button>
              <button type="button" onClick={save} disabled={busy} className="btn-primary h-9">
                {busy ? <Loader2 size={15} className="animate-spin" /> : null}
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
