const API = import.meta.env.VITE_API_URL ?? 'http://localhost:4000/api';

async function parse<T>(resPromise: Promise<Response>): Promise<T> {
  const res = await resPromise;
  if (!res.ok) throw new Error(await res.text());
  return res.json() as Promise<T>;
}

export const api = {
  get: <T>(path: string) => parse<T>(fetch(`${API}${path}`)),
  post: <T>(path: string, body?: unknown) => parse<T>(fetch(`${API}${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined })),
  patch: <T>(path: string, body: unknown) => parse<T>(fetch(`${API}${path}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })),
  put: <T>(path: string, body: unknown) => parse<T>(fetch(`${API}${path}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }))
};

export const streamSession = (sessionId: string, onEvent: (event: unknown) => void) => {
  const es = new EventSource(`${API}/sessions/${sessionId}/events/stream`);
  es.onmessage = (msg) => onEvent(JSON.parse(msg.data));
  return () => es.close();
};
