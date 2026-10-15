/** Renders a route to HTML at build time (scripts/prerender.mjs), so public pages show content before JS runs. */
import { Writable } from 'node:stream';
import { StrictMode } from 'react';
import { renderToPipeableStream } from 'react-dom/server';
import { Router } from 'wouter';
import App from './App';

export function render(path: string): Promise<string> {
  return new Promise((resolve, reject) => {
    let html = '';
    const sink = new Writable({
      write(chunk, _encoding, done) {
        html += chunk.toString();
        done();
      },
    });
    sink.on('finish', () => resolve(html));

    // onAllReady waits for lazy-loaded pages, so their HTML is included rather than the loading fallback.
    const stream = renderToPipeableStream(
      <StrictMode>
        <Router ssrPath={path} ssrSearch="">
          <App />
        </Router>
      </StrictMode>,
      {
        onAllReady: () => stream.pipe(sink),
        onShellError: reject,
        onError: (err) => reject(err),
      },
    );
  });
}
