import React from 'react';
import { createRoot, hydrateRoot } from 'react-dom/client';
import App from './App';
import './index.css';

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('Failed to find the root element');

const app = (
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// Public pages arrive prerendered (scripts/prerender.mjs). Hydrate only when the HTML was rendered for this
// exact URL: with a query string (filters) the markup would differ, so render fresh instead.
const trimSlash = (p: string) => (p.length > 1 ? p.replace(/\/$/, '') : p);
const prerendered = rootElement.dataset.prerendered;
if (prerendered && prerendered === trimSlash(window.location.pathname) && window.location.search === '') {
  hydrateRoot(rootElement, app);
} else {
  createRoot(rootElement).render(app);
}
