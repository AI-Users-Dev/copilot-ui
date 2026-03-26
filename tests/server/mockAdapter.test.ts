import { describe, expect, it } from 'vitest';
import { MockAdapter } from '../../apps/server/src/integrations/mockAdapter';
import type { AgentEvent } from '@copilot-ui/shared';

describe('MockAdapter', () => {
  it('emits approval request in flow', async () => {
    const adapter = new MockAdapter();
    const events: AgentEvent[] = [];
    await adapter.sendPrompt({ sessionId: 's1', prompt: 'run tests', workspacePath: '/tmp' }, async (e) => {
      events.push(e);
    });
    expect(events.some((e) => e.type === 'approval.requested')).toBe(true);
    expect(events.some((e) => e.type === 'command.proposed')).toBe(true);
  });
});
