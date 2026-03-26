# Copilot UI (Internal Developer Tool)

Production-oriented custom UI wrapper for GitHub Copilot CLI / Agent-style flows with a normalized event model and durable local persistence.

## Why Vite instead of Next.js

This implementation uses **Vite + React** for a lightweight local setup and faster iterative development while still meeting all required UI, state, and streaming requirements.

## Architecture overview

1. **Frontend UI layer** (`apps/web/src/components`) – three-pane tool UI + diagnostics drawer.
2. **Frontend state/event layer** (`apps/web/src/store`) – Zustand store consuming REST + SSE normalized events.
3. **Backend API + stream layer** (`apps/server/src/api`) – CRUD APIs + SSE event stream.
4. **Copilot integration layer** (`apps/server/src/integrations`) – adapter interface and swappable providers (`mock` now, CLI/SDK-ready boundary).
5. **Persistence layer** (`prisma/schema.prisma`, Prisma client) – SQLite with migration-ready schema.
6. **Workspace/file/terminal services** (`apps/server/src/services`) – prompt lifecycle, approvals, command runs, event persistence.

## Folder tree

```text
.
├── apps
│   ├── server
│   │   └── src
│   │       ├── api
│   │       ├── db
│   │       ├── integrations
│   │       ├── lib
│   │       ├── services
│   │       └── index.ts
│   └── web
│       └── src
│           ├── components
│           ├── lib
│           ├── store
│           ├── styles
│           ├── App.tsx
│           └── main.tsx
├── packages
│   └── shared
│       └── src/index.ts
├── prisma/schema.prisma
├── tests/server/mockAdapter.test.ts
└── README.md
```

## Implemented capabilities

- Multi-turn chat with persisted sessions and messages.
- SSE streaming for normalized events (`message.delta`, `tool.*`, `approval.*`, `command.*`, errors).
- Long-running task model with cancellation.
- Approval queue (approve/reject) with risk metadata and origin step.
- Command proposal/execution flow with streamed output.
- Execution trace panel and expandable structured events.
- Bottom diagnostics drawer for terminal output + transport traces.
- Workspace-scoped sessions and workspace selector APIs.
- Provider/auth diagnostics endpoint and settings CRUD.
- Durable persistence of sessions/messages/events/approvals/file changes/commands/settings/workspaces.
- Mock adapter for local/demo mode without live Copilot dependency.

## API surface

- `GET/POST /api/sessions`, `GET/PATCH/DELETE /api/sessions/:id`
- `POST /api/sessions/:id/messages`
- `POST /api/sessions/:id/cancel`
- `GET /api/sessions/:id/events/stream`
- `POST /api/approvals/:id/resolve`
- `GET /api/sessions/:id/files`, `GET /api/files/:id/diff`
- `GET /api/sessions/:id/commands`, `POST /api/commands/:id/rerun`, `POST /api/commands/:id/cancel`
- `GET/PUT /api/settings`
- `GET /api/status/provider`, `GET /api/diagnostics`
- `GET /api/workspaces`, `POST /api/workspaces/select`

## Data model

Defined in `packages/shared/src/index.ts` and mapped to Prisma schema:

- Session
- Message
- ExecutionStep (type-level)
- ToolEvent (normalized through `AgentEvent`)
- ApprovalRequest
- FileChange
- CommandRun
- Workspace
- AppSetting
- ProviderStatus

## Setup

### Prerequisites

- Node.js 20+
- npm 10+

### Install

```bash
npm install
```

### Configure env

Create `.env`:

```bash
DATABASE_URL="file:./dev.db"
COPILOT_MODE="mock"
COPILOT_CLI_PATH="copilot"
COPILOT_MODEL="gpt-4.1"
```

### Initialize DB

```bash
npm run prisma:generate
npm run prisma:migrate -- --name init
npm run seed
```

### Run

```bash
npm run dev
```

- Frontend: `http://localhost:5173`
- Backend: `http://localhost:4000`

### Environment doctor

Run a single readiness check for local setup health:

```bash
npm run doctor
```

The doctor checks:
- Node.js version compatibility.
- Installed workspace dependencies.
- Prisma schema validation and migration status.
- Optional backend/frontend reachability on `:4000`/`:5173`.

## Tests

```bash
npm test
```

## Codex Web fallback for UI validation (no `browser_container`)

If your Codex Web environment does not expose screenshot/browser tooling, use this workflow:

1. Start the app locally (`npm run dev`).
2. Open `http://localhost:5173` directly in your browser.
3. In another terminal, capture backend health and logs:

```bash
curl -sSf http://localhost:4000/api/diagnostics
curl -sN http://localhost:4000/api/sessions/<session-id>/events/stream
```

4. Use your OS screenshot tool while reproducing flows (approvals, command runs, diffs, cancellation).
5. Attach the screenshots and the terminal output snippet to your review/issue.

## Notes on Copilot integration

The backend currently uses `MockAdapter` and a strict `CopilotAdapter` interface. To wire Copilot CLI / Agent SDK:

1. Add `CopilotCliAdapter` implementing `sendPrompt/cancel/health`.
2. Parse provider-native output into normalized `AgentEvent`s.
3. Keep approvals in service layer and resume blocked execution after approval.

## Future Electron/Tauri packaging

- Keep backend as local process launched by desktop shell.
- Route frontend calls to localhost or IPC bridge.
- Persist DB under user app data directory.
- Add deep-link to open changed file in editor.

## Known limitations

- Mock adapter simulates practical Copilot flow but does not invoke live Copilot CLI yet.
- Diff UI currently uses structured event trace and file-change endpoint; richer side-by-side renderer can be added.
- Command execution is modeled and persisted; secure sandboxed shell execution should be added before production rollout.
