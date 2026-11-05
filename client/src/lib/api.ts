import { demoApi } from '@/demo/api';
import { DEMO } from '@/demo/flag';
import { ApiError } from '@/lib/api-error';
import { supabase } from '@/lib/supabase';

export { ApiError };

/** Calls /api with the signed-in user's token. Throws ApiError on any non-2xx response. */
export async function apiFetch<T>(path: string, options: { method?: string; body?: unknown } = {}): Promise<T> {
  // Demo mode answers from the browser, so there is no server to reach.
  if (DEMO) return demoApi<T>(path, options);

  const method = options.method ?? 'GET';
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;

  const send = (bearer: string | undefined) =>
    fetch(`/api${path}`, {
      method,
      headers: {
        ...(bearer ? { Authorization: `Bearer ${bearer}` } : {}),
        ...(options.body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      },
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    });

  let res = await send(token);

  // The API refuses a token it can't verify, even on public pages. The stored session is dead (expired, or its
  // server-side session is gone), so drop it: the app shows the signed-out state, and reads retry as a visitor.
  if (res.status === 401 && token) {
    await supabase.auth.signOut({ scope: 'local' });
    if (method === 'GET') res = await send(undefined);
  }

  if (res.status === 204) return undefined as T;
  const json = await res.json().catch(() => null);
  if (!res.ok) {
    throw new ApiError(res.status, json?.error ?? `Request failed (${res.status})`, json?.fields);
  }
  // A 200 that isn't JSON means something other than our API answered, e.g. a dev server with no API behind it.
  if (json === null) {
    throw new ApiError(502, "The server didn't answer with data. Is the API running? (Start it with npm run dev.)");
  }
  return json as T;
}
