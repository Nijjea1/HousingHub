import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiError, apiFetch } from './api';

vi.mock('@/lib/supabase', () => ({
  supabase: { auth: { getSession: async () => ({ data: { session: { access_token: 'jwt-123' } } }) } },
}));

const reply = (body: BodyInit | null, init: ResponseInit = {}) => vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(body, init));

afterEach(() => vi.restoreAllMocks());

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
});
