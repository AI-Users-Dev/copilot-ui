import type { AgentEvent } from '@copilot-ui/shared';

export interface PromptContext {
  sessionId: string;
  workspacePath?: string;
  prompt: string;
}

export interface CopilotAdapter {
  name: 'mock' | 'copilot-cli' | 'copilot-agent-sdk';
  sendPrompt(ctx: PromptContext, emit: (event: AgentEvent) => Promise<void>): Promise<void>;
  cancel(sessionId: string): Promise<void>;
  health(): Promise<{ authenticated: boolean; diagnostics: string[] }>;
}
