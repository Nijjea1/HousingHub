/** Starts the Socket.IO service. Run it on a long-running host: Vercel functions can't hold sockets open. */
import { createSupabaseDeps } from "../server/supabase-deps.js";
import { createRealtimeServer } from "./server.js";

const env = process.env;
const base = createSupabaseDeps(env);
if (!base.db) throw new Error("The realtime service needs DATABASE_URL");

const allowedOrigins = (env.REALTIME_ORIGINS ?? env.APP_URL ?? "http://localhost:5000,http://localhost:5173")
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);

const { server } = createRealtimeServer({
  verifyToken: base.verifyToken,
  db: base.db,
  notifyOffline: base.notifyNewMessage,
  notifySecret: env.REALTIME_NOTIFY_SECRET,
  allowedOrigins,
});

const port = Number(env.PORT ?? 4001);
server.listen(port, () => console.log(`Realtime service on port ${port}, allowing ${allowedOrigins.join(", ")}`));
