import type { AgentEvent, ApprovalRequest, Message, Session, Workspace } from '@copilot-ui/shared';
import { create } from 'zustand';
import { api, streamSession } from '../lib/api';

interface State {
  workspaces: Workspace[];
  sessions: Session[];
  selectedWorkspaceId?: string;
  selectedSessionId?: string;
  messages: Message[];
  events: AgentEvent[];
  approvals: ApprovalRequest[];
  commandLog: string[];
  drawerOpen: boolean;
  loadInitial(): Promise<void>;
  createSession(): Promise<void>;
  selectSession(id: string): Promise<void>;
  sendPrompt(content: string): Promise<void>;
  resolveApproval(id: string, decision: 'approved' | 'rejected'): Promise<void>;
  toggleDrawer(): void;
}

let stopStream: undefined | (() => void);

export const useAppStore = create<State>((set, get) => ({
  workspaces: [], sessions: [], messages: [], events: [], approvals: [], commandLog: [], drawerOpen: true,
  async loadInitial() {
    const workspaces = await api.get<Workspace[]>('/workspaces');
    const selectedWorkspaceId = workspaces[0]?.id;
    const sessions = selectedWorkspaceId ? await api.get<Session[]>(`/sessions?workspaceId=${selectedWorkspaceId}`) : [];
    set({ workspaces, sessions, selectedWorkspaceId, selectedSessionId: sessions[0]?.id });
    if (sessions[0]?.id) await get().selectSession(sessions[0].id);
  },
  async createSession() {
    const workspaceId = get().selectedWorkspaceId;
    if (!workspaceId) return;
    const created = await api.post<Session>('/sessions', { workspaceId, title: 'New Session' });
    set((state) => ({ sessions: [created, ...state.sessions] }));
    await get().selectSession(created.id);
  },
  async selectSession(id: string) {
    if (stopStream) stopStream();
    const detail = await api.get<{ messages: Message[]; events: AgentEvent[]; approvals: ApprovalRequest[] }>(`/sessions/${id}`);
    set({ selectedSessionId: id, messages: detail.messages, events: detail.events, approvals: detail.approvals });
    stopStream = streamSession(id, (event) => {
      const e = event as AgentEvent;
      set((state) => ({ events: [...state.events, e] }));
      if (e.type === 'message.created') {
        set((state) => ({ messages: [...state.messages, { id: e.messageId!, sessionId: e.sessionId, role: 'assistant', content: '', status: 'streaming', createdAt: e.timestamp }] }));
      }
      if (e.type === 'message.delta' && e.messageId) {
        set((state) => ({ messages: state.messages.map((m) => m.id === e.messageId ? { ...m, content: m.content + String((e.payload as any).delta) } : m) }));
      }
      if (e.type === 'approval.requested') {
        // refresh so we get DB-generated approval id
        void get().selectSession(id);
      }
      if (e.type === 'command.output') {
        set((state) => ({ commandLog: [...state.commandLog, String((e.payload as any).chunk)] }));
      }
    });
  },
  async sendPrompt(content: string) {
    if (!get().selectedSessionId || !content.trim()) return;
    set((state) => ({ messages: [...state.messages, { id: crypto.randomUUID(), sessionId: get().selectedSessionId!, role: 'user', content, status: 'completed', createdAt: new Date().toISOString() }] }));
    await api.post(`/sessions/${get().selectedSessionId}/messages`, { content });
  },
  async resolveApproval(id, decision) {
    await api.post(`/approvals/${id}/resolve`, { decision });
    if (get().selectedSessionId) await get().selectSession(get().selectedSessionId!);
  },
  toggleDrawer() {
    set((state) => ({ drawerOpen: !state.drawerOpen }));
  }
}));
