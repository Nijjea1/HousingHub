import { describe, expect, it, vi } from 'vitest';
import { render } from './entry-server';

// The Supabase client warns when env vars are missing; that's expected in tests.
vi.spyOn(console, 'error').mockImplementation(() => {});

describe('prerendering', () => {
  it('renders the home page with a visible headline and the describe box', async () => {
    const html = await render('/');
    expect(html).toContain('Student rentals near McMaster');
    expect(html).toContain('Describe your place');
    // The headline must not start hidden, or prerendering wouldn't help the first paint.
    const h1 = html.slice(html.indexOf('<h1'), html.indexOf('>', html.indexOf('<h1')));
    expect(h1).not.toContain('opacity:0');
  });

  it('renders the browse page with its filters and a loading state for results', async () => {
    const html = await render('/listings');
    expect(html).toContain('Places to rent');
    expect(html).toContain('Monthly rent');
    expect(html).toContain('Loading listings');
  });

  it('renders lazy-loaded pages in full instead of their loading fallback', async () => {
    const html = await render('/about');
    expect(html).toContain('A simpler way to rent near campus');
    expect(html).not.toContain('Loading page');
  });
});
