import express from 'express';
import cors from 'cors';
import { buildRouter } from './api/routes.js';
import { SessionService } from './services/sessionService.js';
import { MockAdapter } from './integrations/mockAdapter.js';

const app = express();
app.use(cors());
app.use(express.json({ limit: '1mb' }));

const service = new SessionService(new MockAdapter());
app.use('/api', buildRouter(service));

const port = Number(process.env.PORT ?? 4000);
app.listen(port, () => {
  console.log(`Copilot UI backend listening on ${port}`);
});
