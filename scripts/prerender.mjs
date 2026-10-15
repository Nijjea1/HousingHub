// Writes static HTML for the public pages after `vite build`. Every other route gets an empty shell
// (app.html) that renders in the browser, like before.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

export const PRERENDERED_ROUTES = ['/', '/listings', '/about', '/resources', '/signin', '/signup'];

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(repo, 'client', 'dist');
const ssrEntry = path.join(repo, '.ssr', 'entry-server.js');
const EMPTY_ROOT = '<div id="root"></div>';

const template = fs.readFileSync(path.join(dist, 'index.html'), 'utf8');
if (!template.includes(EMPTY_ROOT)) throw new Error(`index.html has no ${EMPTY_ROOT} to fill`);
fs.writeFileSync(path.join(dist, 'app.html'), template);

const { render } = await import(pathToFileURL(ssrEntry).href);
for (const route of PRERENDERED_ROUTES) {
  const started = performance.now();
  const body = await render(route);
  const html = template.replace(EMPTY_ROOT, `<div id="root" data-prerendered="${route}">${body}</div>`);
  const file = route === '/' ? path.join(dist, 'index.html') : path.join(dist, route.slice(1), 'index.html');
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, html);
  console.log(`prerendered ${route.padEnd(11)} ${(body.length / 1024).toFixed(1)} kB in ${Math.round(performance.now() - started)} ms`);
}
fs.rmSync(path.join(repo, '.ssr'), { recursive: true, force: true });
