/** True in a demo build: the browser serves the seeded data itself and no backend is needed. Set in vite.config.ts. */
export const DEMO = import.meta.env.VITE_DEMO_MODE === 'true';
