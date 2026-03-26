import { useMemo, useState } from 'react';
import { useAppStore } from '../store/appStore';

export function Sidebar() {
  const { sessions, selectedSessionId, selectSession, createSession, workspaces, selectedWorkspaceId } = useAppStore();
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => sessions.filter((s) => s.title.toLowerCase().includes(query.toLowerCase())), [sessions, query]);

  return (
    <aside className="panel flex h-full w-72 flex-col rounded-md p-3">
      <div className="mb-2 text-xs text-slate-400">Workspace</div>
      <div className="rounded border border-slate-700 p-2 text-sm">{workspaces.find((w) => w.id === selectedWorkspaceId)?.name ?? 'None'}</div>
      <button onClick={createSession} className="mt-3 rounded bg-blue-600 px-3 py-2 text-sm">+ New Session</button>
      <input className="mt-3 rounded border border-slate-700 bg-slate-950 p-2 text-sm" placeholder="Search sessions" value={query} onChange={(e) => setQuery(e.target.value)} />
      <div className="mt-3 space-y-1 overflow-auto">
        {filtered.map((s) => (
          <button key={s.id} onClick={() => selectSession(s.id)} className={`block w-full rounded px-2 py-2 text-left text-sm ${selectedSessionId === s.id ? 'bg-slate-700' : 'hover:bg-slate-800'}`}>
            <div>{s.title}</div>
            <div className="text-xs text-slate-400">{s.status}</div>
          </button>
        ))}
      </div>
    </aside>
  );
}
