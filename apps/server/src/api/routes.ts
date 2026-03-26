import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../db/client.js';
import { bus } from '../lib/events.js';
import { fromJson } from '../lib/utils.js';
import { SessionService } from '../services/sessionService.js';

export function buildRouter(service: SessionService) {
  const router = Router();

  router.get('/workspaces', async (_req, res) => {
    const workspaces = await prisma.workspace.findMany({ orderBy: { updatedAt: 'desc' } });
    res.json(workspaces);
  });

  router.post('/workspaces/select', async (req, res) => {
    const body = z.object({ path: z.string(), name: z.string().default('Workspace') }).parse(req.body);
    const workspace = await prisma.workspace.upsert({
      where: { path: body.path },
      update: { name: body.name },
      create: { path: body.path, name: body.name }
    });
    res.json(workspace);
  });

  router.get('/sessions', async (req, res) => {
    const workspaceId = z.string().optional().parse(req.query.workspaceId);
    const sessions = await prisma.session.findMany({
      where: workspaceId ? { workspaceId } : undefined,
      orderBy: { updatedAt: 'desc' }
    });
    res.json(sessions);
  });

  router.post('/sessions', async (req, res) => {
    const body = z.object({ workspaceId: z.string(), title: z.string().optional() }).parse(req.body);
    const session = await service.createSession(body.workspaceId, body.title);
    res.status(201).json(session);
  });

  router.get('/sessions/:id', async (req, res) => {
    const session = await prisma.session.findUnique({
      where: { id: req.params.id },
      include: { messages: { orderBy: { createdAt: 'asc' } }, approvals: true, fileChanges: true, commandRuns: true, events: { orderBy: { createdAt: 'asc' } } }
    });
    if (!session) return res.status(404).json({ error: 'Session not found' });
    res.json({ ...session, events: session.events.map((e) => ({ ...e, payload: fromJson(e.payload) })) });
  });

  router.patch('/sessions/:id', async (req, res) => {
    const body = z.object({ title: z.string().optional(), archived: z.boolean().optional() }).parse(req.body);
    const updated = await prisma.session.update({ where: { id: req.params.id }, data: body });
    res.json(updated);
  });

  router.delete('/sessions/:id', async (req, res) => {
    await prisma.session.delete({ where: { id: req.params.id } });
    res.status(204).end();
  });

  router.post('/sessions/:id/messages', async (req, res) => {
    const body = z.object({ content: z.string().min(1), model: z.string().optional() }).parse(req.body);
    void service.sendPrompt(req.params.id, body);
    res.status(202).json({ accepted: true });
  });

  router.post('/sessions/:id/cancel', async (req, res) => {
    await service.cancelSession(req.params.id);
    res.json({ cancelled: true });
  });

  router.get('/sessions/:id/events/stream', async (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    const handler = (event: unknown) => {
      res.write(`event: message\n`);
      res.write(`data: ${JSON.stringify(event)}\n\n`);
    };
    bus.on(req.params.id, handler);
    req.on('close', () => bus.off(req.params.id, handler));
  });

  router.post('/approvals/:id/resolve', async (req, res) => {
    const body = z.object({ decision: z.enum(['approved', 'rejected']) }).parse(req.body);
    await service.resolveApproval(req.params.id, body.decision);
    res.json({ ok: true });
  });

  router.get('/sessions/:id/files', async (req, res) => {
    res.json(await prisma.fileChange.findMany({ where: { sessionId: req.params.id }, orderBy: { createdAt: 'desc' } }));
  });

  router.get('/files/:id/diff', async (req, res) => {
    const f = await prisma.fileChange.findUnique({ where: { id: req.params.id } });
    if (!f) return res.status(404).json({ error: 'File change not found' });
    res.json({ patch: f.patch, before: f.before, after: f.after });
  });

  router.get('/sessions/:id/commands', async (req, res) => {
    res.json(await prisma.commandRun.findMany({ where: { sessionId: req.params.id }, orderBy: { createdAt: 'desc' } }));
  });

  router.post('/commands/:id/rerun', async (req, res) => {
    const run = await prisma.commandRun.findUniqueOrThrow({ where: { id: req.params.id } });
    const rerun = await prisma.commandRun.create({ data: { sessionId: run.sessionId, command: run.command, status: 'running' } });
    await prisma.commandRun.update({ where: { id: rerun.id }, data: { status: 'completed', stdout: 'Rerun succeeded', exitCode: 0 } });
    res.json(rerun);
  });

  router.post('/commands/:id/cancel', async (req, res) => {
    const updated = await prisma.commandRun.update({ where: { id: req.params.id }, data: { status: 'cancelled' } });
    res.json(updated);
  });

  router.get('/settings', async (_req, res) => {
    res.json(await prisma.setting.findMany({ orderBy: { key: 'asc' } }));
  });

  router.put('/settings', async (req, res) => {
    const body = z.object({ key: z.string(), value: z.string() }).parse(req.body);
    const setting = await prisma.setting.upsert({ where: { key: body.key }, update: { value: body.value }, create: body });
    res.json(setting);
  });

  router.get('/status/provider', async (_req, res) => {
    res.json(await service.providerStatus());
  });

  router.get('/diagnostics', async (_req, res) => {
    res.json({ node: process.version, uptime: process.uptime(), env: { mockMode: process.env.COPILOT_MODE ?? 'mock' } });
  });

  return router;
}
