import { useSyncExternalStore } from 'react';

/** Light or dark. Follows the device until the user picks one; the choice lives in localStorage. */
export type Theme = 'light' | 'dark';

const listeners = new Set<() => void>();
const notify = () => listeners.forEach((listener) => listener());
const current = (): Theme => (document.documentElement.classList.contains('dark') ? 'dark' : 'light');

function storedTheme(): Theme | null {
  try {
    const value = localStorage.getItem('theme');
    return value === 'light' || value === 'dark' ? value : null;
  } catch {
    return null;
  }
}

export function setTheme(theme: Theme) {
  document.documentElement.classList.toggle('dark', theme === 'dark');
  try {
    localStorage.setItem('theme', theme);
  } catch {
    // Private windows can refuse storage; the theme still applies until reload.
  }
  notify();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  const media = matchMedia('(prefers-color-scheme: dark)');
  const followDevice = () => {
    if (storedTheme()) return;
    document.documentElement.classList.toggle('dark', media.matches);
    notify();
  };
  media.addEventListener('change', followDevice);
  return () => {
    listeners.delete(listener);
    media.removeEventListener('change', followDevice);
  };
}

// Prerendered HTML is always built light; the inline script in index.html and this
// client snapshot take over after hydration, so React never sees a mismatch.
export const useTheme = (): Theme => useSyncExternalStore(subscribe, current, () => 'light');
