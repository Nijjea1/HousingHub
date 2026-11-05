import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DEMO_PASSWORD } from '@shared/demo';
import {
  STORAGE_KEY,
  currentUser,
  getState,
  hashPassword,
  mutate,
  passwordMatches,
  reloadFromStorage,
  resetDemo,
  subscribe,
} from './store';

/** A minimal localStorage, since the tests run in Node. */
function fakeStorage(initial: Record<string, string> = {}) {
  const data = new Map(Object.entries(initial));
  return {
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => void data.set(k, v),
    removeItem: (k: string) => void data.delete(k),
    data,
  };
}

beforeEach(() => {
  vi.stubGlobal('localStorage', fakeStorage());
  reloadFromStorage();
});

describe('seed data', () => {
  it('starts as localhost does: 8 mapped listings, McMaster, two demo accounts, one conversation', () => {
    const s = getState();
    expect(s.listings).toHaveLength(8);
    expect(s.listings.every((l) => l.latitude !== null && l.longitude !== null)).toBe(true);
    expect(s.universities.map((u) => u.id)).toEqual(['mcmaster']);
    expect(s.users.map((u) => u.email).sort()).toEqual(['demo-landlord@example.com', 'demo-student@example.com']);
    expect(s.conversations).toHaveLength(1);
    expect(s.messages).toHaveLength(2);
    expect(s.sessionUserId).toBeNull();
  });
});

describe('persistence', () => {
  it('saves every change and restores it after a reload', () => {
    mutate((s) => void s.saved_searches.push({ id: 'x', userId: 'u', name: 'Mine', params: {} as never, createdAt: '2026-11-05T00:00:00.000Z' }));
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!).saved_searches).toHaveLength(1);
    reloadFromStorage();
    expect(getState().saved_searches[0].name).toBe('Mine');
  });

  it('tells subscribers about changes until they unsubscribe', () => {
    const seen = vi.fn();
    const stop = subscribe(seen);
    mutate((s) => void (s.sessionUserId = null));
    stop();
    mutate((s) => void (s.sessionUserId = null));
    expect(seen).toHaveBeenCalledOnce();
  });

  it('reset returns to the seeded data and signs out', () => {
    mutate((s) => {
      s.listings.pop();
      s.sessionUserId = s.users[0].id;
    });
    resetDemo();
    expect(getState().listings).toHaveLength(8);
    expect(getState().sessionUserId).toBeNull();
    reloadFromStorage();
    expect(getState().listings).toHaveLength(8);
  });

  it('still works when storage is unavailable or full', () => {
    vi.stubGlobal('localStorage', {
      getItem: () => {
        throw new Error('blocked');
      },
      setItem: () => {
        throw new Error('quota');
      },
    });
    reloadFromStorage();
    expect(getState().listings).toHaveLength(8);
    expect(() => mutate((s) => void s.listings.pop())).not.toThrow();
    expect(getState().listings).toHaveLength(7);
  });

  it('ignores a corrupted saved state and falls back to the seed', () => {
    vi.stubGlobal('localStorage', fakeStorage({ [STORAGE_KEY]: '{not json' }));
    reloadFromStorage();
    expect(getState().listings).toHaveLength(8);
  });
});

describe('passwords', () => {
  it('lets the seeded accounts in with the published demo password only', async () => {
    const student = getState().users.find((u) => u.email === 'demo-student@example.com')!;
    expect(await passwordMatches(student, DEMO_PASSWORD)).toBe(true);
    expect(await passwordMatches(student, 'wrong')).toBe(false);
  });

  it('hashes new passwords and never keeps the text', async () => {
    const hash = await hashPassword('New@Example.com ', 'my-real-password');
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
    expect(hash).toBe(await hashPassword('new@example.com', 'my-real-password'));
    expect(hash).not.toContain('my-real-password');
    const user = { id: '1', email: 'new@example.com', passwordHash: hash, metadata: {}, createdAt: '' };
    expect(await passwordMatches(user, 'my-real-password')).toBe(true);
    expect(await passwordMatches(user, DEMO_PASSWORD)).toBe(false);
  });

  it('finds the signed-in user', () => {
    expect(currentUser()).toBeNull();
    mutate((s) => void (s.sessionUserId = s.users[0].id));
    expect(currentUser()?.id).toBe(getState().users[0].id);
  });
});
