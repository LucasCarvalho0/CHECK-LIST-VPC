// Back-end e front-end no mesmo app Next.js: a API fica em /api (mesma origem, sem CORS).
const API = '/api';

export class ApiError extends Error {
  constructor(public status: number, message: string, public body?: any) { super(message); }
}

export const tokenStore = {
  get: () => (typeof window === 'undefined' ? null : window.localStorage.getItem('checklist_token')),
  set: (t: string) => window.localStorage.setItem('checklist_token', t),
  clear: () => window.localStorage.removeItem('checklist_token'),
};

async function raw(path: string, init: RequestInit = {}): Promise<Response> {
  const token = tokenStore.get();
  const headers: Record<string, string> = { ...(init.headers as Record<string, string>) };
  if (init.body && !headers['Content-Type']) headers['Content-Type'] = 'application/json';
  if (token) headers['Authorization'] = `Bearer ${token}`;
  let res: Response;
  try {
    res = await fetch(`${API}${path}`, { ...init, headers });
  } catch {
    throw new ApiError(0, 'Sem conexão com o servidor.');
  }
  if (!res.ok) {
    let body: any = null;
    try { body = await res.json(); } catch { /* sem corpo */ }
    if (res.status === 401 && !path.startsWith('/auth/login') && typeof window !== 'undefined') {
      tokenStore.clear();
      if (!window.location.pathname.startsWith('/login')) window.location.href = '/login';
    }
    const m = body?.message;
    throw new ApiError(res.status, Array.isArray(m) ? m.join('; ') : m || `Erro ${res.status}`, body);
  }
  return res;
}

export const api = {
  get: async <T = any>(path: string): Promise<T> => (await raw(path)).json(),
  post: async <T = any>(path: string, body?: unknown): Promise<T> =>
    (await raw(path, { method: 'POST', body: body === undefined ? undefined : JSON.stringify(body) })).json(),
  patch: async <T = any>(path: string, body: unknown): Promise<T> =>
    (await raw(path, { method: 'PATCH', body: JSON.stringify(body) })).json(),
  blob: async (path: string, init?: { method?: string; body?: unknown }): Promise<Blob> =>
    (await raw(path, { method: init?.method, body: init?.body === undefined ? undefined : JSON.stringify(init.body) })).blob(),
};

export function qs(params: Record<string, unknown>) {
  const p = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => { if (v !== undefined && v !== null && v !== '') p.set(k, String(v)); });
  const s = p.toString();
  return s ? `?${s}` : '';
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}
