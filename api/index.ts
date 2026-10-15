/** Vercel serverless function: every /api/* request is rewritten here (see vercel.json). */
import { createApp } from "../server/app.js";
import { createSupabaseDeps } from "../server/supabase-deps.js";

export default createApp(createSupabaseDeps());
