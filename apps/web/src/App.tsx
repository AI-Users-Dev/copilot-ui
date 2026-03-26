import { useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { ConversationPane } from './components/ConversationPane';
import { TracePane } from './components/TracePane';
import { BottomDrawer } from './components/BottomDrawer';
import { useAppStore } from './store/appStore';

export default function App() {
  const loadInitial = useAppStore((s) => s.loadInitial);

  useEffect(() => {
    void loadInitial();
  }, [loadInitial]);

  return (
    <main className="flex h-full flex-col gap-2 p-2">
      <div className="grid min-h-0 flex-1 grid-cols-[18rem_1fr_24rem] gap-2">
        <Sidebar />
        <ConversationPane />
        <TracePane />
      </div>
      <BottomDrawer />
    </main>
  );
}
