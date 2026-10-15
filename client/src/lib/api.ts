import { supabase } from '@/lib/supabase';

/** An error response from our API, with per-field messages when validation failed. */
export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public fields?: Record<string, string[] | undefined>,
  ) {
    super(message);
  }
}

/** Calls /api with the signed-in user's token. Throws ApiError on any non-2xx response. */
export async function apiFetch<T>(path: string, options: { method?: string; body?: unknown } = {}): Promise<T> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;

  const res = await fetch(`/api${path}`, {
    method: options.method ?? 'GET',
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.body !== undefined ? { 'Content-Type': 'application/json' } : {}),
    },
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });

  if (res.status === 204) return undefined as T;
  const json = await res.json().catch(() => null);
  if (!res.ok) {
    throw new ApiError(res.status, json?.error ?? `Request failed (${res.status})`, json?.fields);
  }
  return json as T;
}
