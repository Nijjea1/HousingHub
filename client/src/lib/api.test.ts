import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiError, apiFetch } from './api';

const signOut = vi.hoisted(() => vi.fn(async () => ({ error: null })));
vi.mock('@/lib/supabase', () => ({
  supabase: { auth: { getSession: async () => ({ data: { session: { access_token: 'jwt-123' } } }), signOut } },
}));

const reply = (body: BodyInit | null, init: ResponseInit = {}) => vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(body, init));

afterEach(() => {
  vi.restoreAllMocks();
  signOut.mockClear();
});

describe('apiFetch', () => {
  it('sends the signed-in token and returns the parsed body', async () => {
    const spy = reply(JSON.stringify({ ok: true }), { status: 200 });
    expect(await apiFetch('/health')).toEqual({ ok: true });
    const [url, init] = spy.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('/api/health');
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer jwt-123');
  });

  it('turns an error response into an ApiError with its field messages', async () => {
    reply(JSON.stringify({ error: 'Invalid input', fields: { note: ['Too long'] } }), { status: 400 });
    const err = await apiFetch('/favorites/x', { method: 'PUT', body: {} }).catch((e) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect(err).toMatchObject({ status: 400, message: 'Invalid input', fields: { note: ['Too long'] } });
  });

  it('says the API is missing when a 200 is not JSON, instead of returning null', async () => {
    reply('<!doctype html><html></html>', { status: 200, headers: { 'Content-Type': 'text/html' } });
    const err = await apiFetch('/search').catch((e: unknown) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect((err as ApiError).message).toMatch(/Is the API running/);
  });

  it('returns undefined for 204', async () => {
    reply(null, { status: 204 });
    expect(await apiFetch('/saved-searches/x', { method: 'DELETE' })).toBeUndefined();
  });

  it('drops a rejected session and retries a read as a visitor', async () => {
    const spy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(new Response(JSON.stringify({ error: 'Your session has expired, sign in again' }), { status: 401 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ results: [] }), { status: 200 }));
    expect(await apiFetch('/search')).toEqual({ results: [] });
    expect(signOut).toHaveBeenCalledWith({ scope: 'local' });
    const [, first] = spy.mock.calls[0] as [string, RequestInit];
    const [, second] = spy.mock.calls[1] as [string, RequestInit];
    expect((first.headers as Record<string, string>).Authorization).toBe('Bearer jwt-123');
    expect((second.headers as Record<string, string>).Authorization).toBeUndefined();
  });

  it('drops a rejected session on a write but does not resend it', async () => {
    const spy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({ error: 'Your session has expired, sign in again' }), { status: 401 }));
    const err = await apiFetch('/favorites/x', { method: 'PUT', body: {} }).catch((e: unknown) => e);
    expect(err).toMatchObject({ status: 401 });
    expect(signOut).toHaveBeenCalledOnce();
    expect(spy).toHaveBeenCalledOnce();
  });

  it('still reports a 401 that remains after retrying as a visitor', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({ error: 'Sign in required' }), { status: 401 }));
    const err = await apiFetch('/favorites').catch((e: unknown) => e);
    expect(err).toMatchObject({ status: 401, message: 'Sign in required' });
  });
});
