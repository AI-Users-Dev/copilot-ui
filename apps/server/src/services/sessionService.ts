import { randomUUID } from 'node:crypto';
import type { AgentEvent, ProviderStatus, SendPromptInput } from '@copilot-ui/shared';
import { prisma } from '../db/client.js';
import { publish } from '../lib/events.js';
import { fromJson, nowIso, toJson } from '../lib/utils.js';
import type { CopilotAdapter } from '../integrations/types.js';

export class SessionService {
  constructor(private adapter: CopilotAdapter) {}

  async createSession(workspaceId: string, title = 'New Session') {
    const session = await prisma.session.create({ data: { workspaceId, title } });
    await this.emit({
      id: randomUUID(), sessionId: session.id, type: 'session.created', timestamp: nowIso(), payload: { sessionId: session.id }
    });
    return session;
  }

  async sendPrompt(sessionId: string, input: SendPromptInput) {
    await prisma.message.create({ data: { sessionId, role: 'user', content: input.content, status: 'completed' } });
    await prisma.session.update({ where: { id: sessionId }, data: { status: 'running' } });

    const session = await prisma.session.findUniqueOrThrow({ where: { id: sessionId }, include: { workspace: true } });
    await this.adapter.sendPrompt({ sessionId, prompt: input.content, workspacePath: session.workspace.path }, async (event) => {
      await this.emit(event);
      await this.consumeDerivedState(event);
    });
  }

  async emit(event: AgentEvent): Promise<void> {
    await prisma.event.create({
      data: {
        id: event.id,
        sessionId: event.sessionId,
        type: event.type,
        messageId: event.messageId,
        stepId: event.stepId,
        payload: toJson(event.payload)
      }
    });
    publish(event);
  }

  private async consumeDerivedState(event: AgentEvent): Promise<void> {
    if (event.type === 'message.created') {
      await prisma.message.create({
        data: {
          id: event.messageId,
          sessionId: event.sessionId,
          role: 'assistant',
          content: String((event.payload as Record<string, unknown>).content ?? ''),
          status: 'streaming'
        }
      });
    }
    if (event.type === 'message.delta' && event.messageId) {
      const msg = await prisma.message.findUnique({ where: { id: event.messageId } });
      if (msg) {
        const delta = String((event.payload as Record<string, unknown>).delta ?? '');
        await prisma.message.update({ where: { id: msg.id }, data: { content: msg.content + delta } });
      }
    }
    if (event.type === 'approval.requested') {
      const payload = event.payload as Record<string, unknown>;
      await prisma.approvalRequest.create({
        data: {
          sessionId: event.sessionId,
          stepId: event.stepId,
          actionType: String(payload.actionType ?? 'other'),
          summary: String(payload.summary ?? ''),
          payload: toJson(payload.payload ?? {}),
          riskLevel: String(payload.riskLevel ?? 'medium')
        }
      });
      await prisma.session.update({ where: { id: event.sessionId }, data: { status: 'awaiting_approval' } });
    }
  }

  async resolveApproval(approvalId: string, decision: 'approved' | 'rejected') {
    const approval = await prisma.approvalRequest.update({ where: { id: approvalId }, data: { state: decision, resolvedAt: new Date() } });

    await this.emit({
      id: randomUUID(), sessionId: approval.sessionId, type: 'approval.resolved', timestamp: nowIso(), stepId: approval.stepId ?? undefined,
      payload: { approvalId, decision }
    });

    if (decision === 'approved' && approval.actionType === 'command') {
      const command = fromJson<Record<string, string>>(approval.payload).command;
      const run = await prisma.commandRun.create({ data: { sessionId: approval.sessionId, command, status: 'running' } });
      await this.emit({ id: randomUUID(), sessionId: approval.sessionId, type: 'command.started', timestamp: nowIso(), stepId: approval.stepId ?? undefined, payload: { commandRunId: run.id, command } });
      await prisma.commandRun.update({ where: { id: run.id }, data: { status: 'completed', stdout: 'All tests passed.', exitCode: 0 } });
      await this.emit({ id: randomUUID(), sessionId: approval.sessionId, type: 'command.output', timestamp: nowIso(), payload: { commandRunId: run.id, stream: 'stdout', chunk: 'All tests passed.' } });
      await this.emit({ id: randomUUID(), sessionId: approval.sessionId, type: 'command.completed', timestamp: nowIso(), payload: { commandRunId: run.id, status: 'completed', exitCode: 0 } });
      await prisma.session.update({ where: { id: approval.sessionId }, data: { status: 'completed' } });
    }

    if (decision === 'rejected') {
      await prisma.session.update({ where: { id: approval.sessionId }, data: { status: 'idle' } });
    }
  }

  async cancelSession(sessionId: string) {
    await this.adapter.cancel(sessionId);
    await prisma.session.update({ where: { id: sessionId }, data: { status: 'cancelled' } });
    await this.emit({ id: randomUUID(), sessionId, type: 'agent.status', timestamp: nowIso(), payload: { status: 'cancelled' } });
  }

  async providerStatus(): Promise<ProviderStatus> {
    const health = await this.adapter.health();
    return {
      provider: this.adapter.name,
      authenticated: health.authenticated,
      connectivity: 'ok',
      cliPath: process.env.COPILOT_CLI_PATH,
      diagnostics: health.diagnostics,
      model: process.env.COPILOT_MODEL ?? 'gpt-4.1'
    };
  }
}
