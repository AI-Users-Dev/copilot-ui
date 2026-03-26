import { prisma } from './client.js';

async function main() {
  const ws = await prisma.workspace.upsert({
    where: { path: '/workspace/copilot-ui' },
    update: {},
    create: { name: 'copilot-ui', path: '/workspace/copilot-ui', repoName: 'copilot-ui', branch: 'main' }
  });

  await prisma.session.upsert({
    where: { id: 'seed-session' },
    update: {},
    create: { id: 'seed-session', workspaceId: ws.id, title: 'Welcome Session', status: 'idle' }
  });
}

main().finally(async () => prisma.$disconnect());
