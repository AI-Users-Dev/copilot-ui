export type SessionStatus = 'idle' | 'running' | 'awaiting_approval' | 'failed' | 'completed' | 'cancelled';
export type MessageRole = 'user' | 'assistant' | 'system';

export type EventType =
  | 'session.created'
  | 'session.updated'
  | 'message.created'
  | 'message.delta'
  | 'message.completed'
  | 'agent.status'
  | 'tool.started'
  | 'tool.completed'
  | 'tool.failed'
  | 'command.proposed'
  | 'command.started'
  | 'command.output'
  | 'command.completed'
  | 'file.changed'
  | 'diff.ready'
  | 'approval.requested'
  | 'approval.resolved'
  | 'error.occurred';

export interface Workspace {
  id: string;
  name: string;
  path: string;
  repoName?: string;
  branch?: string;
  dirty?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Session {
  id: string;
  title: string;
  workspaceId: string;
  status: SessionStatus;
  archived: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Message {
  id: string;
  sessionId: string;
  role: MessageRole;
  content: string;
  status: 'pending' | 'streaming' | 'completed' | 'error';
  createdAt: string;
}

export interface ExecutionStep {
  id: string;
  sessionId: string;
  name: string;
  status: 'started' | 'completed' | 'failed';
  startedAt: string;
  endedAt?: string;
}

export interface ApprovalRequest {
  id: string;
  sessionId: string;
  stepId?: string;
  actionType: 'command' | 'file_write' | 'destructive' | 'patch' | 'other';
  summary: string;
  payload: Record<string, unknown>;
  riskLevel: 'low' | 'medium' | 'high';
  state: 'pending' | 'approved' | 'rejected';
  policy: 'always_ask' | 'approve_once' | 'approve_session';
  createdAt: string;
  resolvedAt?: string;
}

export interface FileChange {
  id: string;
  sessionId: string;
  path: string;
  before?: string;
  after: string;
  patch: string;
  stepId?: string;
  createdAt: string;
}

export interface CommandRun {
  id: string;
  sessionId: string;
  command: string;
  cwd?: string;
  status: 'proposed' | 'running' | 'completed' | 'failed' | 'cancelled';
  stdout: string;
  stderr: string;
  exitCode?: number;
  createdAt: string;
  updatedAt: string;
}

export interface AppSetting {
  key: string;
  value: string;
  updatedAt: string;
}

export interface ProviderStatus {
  provider: 'copilot-cli' | 'copilot-agent-sdk' | 'mock';
  cliPath?: string;
  model?: string;
  authenticated: boolean;
  connectivity: 'ok' | 'degraded' | 'down';
  diagnostics: string[];
}

export interface AgentEvent<T = Record<string, unknown>> {
  id: string;
  sessionId: string;
  type: EventType;
  timestamp: string;
  messageId?: string;
  stepId?: string;
  payload: T;
}

export interface SendPromptInput {
  content: string;
  model?: string;
}
