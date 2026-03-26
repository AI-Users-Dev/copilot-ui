import { useAppStore } from '../store/appStore';

export function BottomDrawer() {
  const { drawerOpen, toggleDrawer, commandLog, events } = useAppStore();
  return (
    <div className="panel mt-2 rounded-md">
      <button onClick={toggleDrawer} className="w-full border-b border-slate-800 p-2 text-left text-xs">{drawerOpen ? 'Hide' : 'Show'} diagnostics & terminal</button>
      {drawerOpen && (
        <div className="grid h-48 grid-cols-3 gap-2 p-2 text-xs">
          <section className="rounded border border-slate-700 p-2"><div className="mb-1 text-slate-400">stdout/stderr</div><pre className="overflow-auto">{commandLog.join('\n')}</pre></section>
          <section className="rounded border border-slate-700 p-2"><div className="mb-1 text-slate-400">Raw events</div><pre className="overflow-auto">{events.map((e) => e.type).join('\n')}</pre></section>
          <section className="rounded border border-slate-700 p-2"><div className="mb-1 text-slate-400">Command history</div><pre>Use approvals to execute proposed commands.</pre></section>
        </div>
      )}
    </div>
  );
}
