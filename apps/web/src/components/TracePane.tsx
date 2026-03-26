import { useAppStore } from '../store/appStore';

export function TracePane() {
  const { events, approvals, resolveApproval } = useAppStore();
  return (
    <aside className="panel flex h-full w-96 flex-col rounded-md p-3">
      <h2 className="mb-2 text-sm font-semibold">Execution Trace</h2>
      <div className="mb-4 space-y-2">
        {approvals.filter((a) => a.state === 'pending').map((a) => (
          <div key={a.id} className="rounded border border-amber-700 bg-amber-900/20 p-2 text-xs">
            <div className="font-medium">Approval: {a.summary}</div>
            <div className="text-slate-300">{a.actionType} · risk {a.riskLevel}</div>
            <div className="mt-2 flex gap-2">
              <button className="rounded bg-emerald-700 px-2 py-1" onClick={() => void resolveApproval(a.id, 'approved')}>Approve</button>
              <button className="rounded bg-rose-700 px-2 py-1" onClick={() => void resolveApproval(a.id, 'rejected')}>Reject</button>
            </div>
          </div>
        ))}
      </div>
      <div className="space-y-2 overflow-auto text-xs">
        {events.map((e) => (
          <details key={e.id} className="rounded border border-slate-700 p-2">
            <summary>{e.type} · {new Date(e.timestamp).toLocaleTimeString()}</summary>
            <pre className="mt-2 overflow-auto text-[11px] text-slate-300">{JSON.stringify(e.payload, null, 2)}</pre>
          </details>
        ))}
      </div>
    </aside>
  );
}
