import { randomUUID } from 'node:crypto';
import type { AgentEvent, EventType } from '@copilot-ui/shared';
import type { CopilotAdapter, PromptContext } from './types.js';

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const makeEvent = (sessionId: string, type: EventType, payload: Record<string, unknown>, messageId?: string, stepId?: string): AgentEvent => ({
  id: randomUUID(),
  sessionId,
  type,
  timestamp: new Date().toISOString(),
  messageId,
  stepId,
  payload
});

export class MockAdapter implements CopilotAdapter {
  name = 'mock' as const;
  private cancelled = new Set<string>();

  async sendPrompt(ctx: PromptContext, emit: (event: AgentEvent) => Promise<void>): Promise<void> {
    const mid = randomUUID();
    const stepId = randomUUID();
    await emit(makeEvent(ctx.sessionId, 'agent.status', { status: 'running', message: 'Planning task' }, mid));
    await emit(makeEvent(ctx.sessionId, 'message.created', { role: 'assistant', content: '' }, mid));
    const deltas = [
      `I reviewed your prompt: \"${ctx.prompt.slice(0, 80)}\".`,
      ' Next I will inspect files and propose a safe command.',
      ' I can continue with patch application once approved.'
    ];
    for (const delta of deltas) {
      if (this.cancelled.has(ctx.sessionId)) break;
      await sleep(300);
      await emit(makeEvent(ctx.sessionId, 'message.delta', { delta }, mid));
    }

    if (this.cancelled.has(ctx.sessionId)) {
      await emit(makeEvent(ctx.sessionId, 'error.occurred', { code: 'cancelled', detail: 'Task cancelled by user' }, mid));
      return;
    }

    await emit(makeEvent(ctx.sessionId, 'tool.started', { name: 'shell', summary: 'Propose npm test' }, mid, stepId));
    await emit(makeEvent(ctx.sessionId, 'command.proposed', { command: 'npm test', cwd: ctx.workspacePath }, mid, stepId));
    await emit(makeEvent(ctx.sessionId, 'approval.requested', {
      actionType: 'command',
      summary: 'Run test suite',
      payload: { command: 'npm test' },
      riskLevel: 'low'
    }, mid, stepId));
  }

  async cancel(sessionId: string): Promise<void> {
    this.cancelled.add(sessionId);
  }

  async health(): Promise<{ authenticated: boolean; diagnostics: string[] }> {
    return { authenticated: true, diagnostics: ['Mock adapter active. No external auth required.'] };
  }
}
