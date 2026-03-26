import { EventEmitter } from 'node:events';
import type { AgentEvent } from '@copilot-ui/shared';

export const bus = new EventEmitter();

export function publish(event: AgentEvent): void {
  bus.emit(event.sessionId, event);
}
