import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { useAppStore } from '../store/appStore';

export function ConversationPane() {
  const { messages, sendPrompt } = useAppStore();
  const [prompt, setPrompt] = useState('');
  return (
    <section className="panel flex h-full flex-1 flex-col rounded-md">
      <div className="flex-1 space-y-3 overflow-auto p-4">
        {messages.map((m) => (
          <div key={m.id} className={`rounded border p-3 ${m.role === 'assistant' ? 'border-blue-900 bg-slate-800' : 'border-slate-700 bg-slate-900'}`}>
            <div className="mb-2 text-xs uppercase text-slate-400">{m.role}</div>
            <div className="prose prose-invert max-w-none text-sm"><ReactMarkdown>{m.content}</ReactMarkdown></div>
          </div>
        ))}
      </div>
      <div className="border-t border-slate-800 p-3">
        <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} rows={4} className="w-full rounded border border-slate-700 bg-slate-950 p-2 text-sm" placeholder="Steer the agent..." />
        <div className="mt-2 flex justify-end">
          <button onClick={() => { void sendPrompt(prompt); setPrompt(''); }} className="rounded bg-emerald-600 px-3 py-2 text-sm">Send</button>
        </div>
      </div>
    </section>
  );
}
