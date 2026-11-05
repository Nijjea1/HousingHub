/** Hands events to the realtime service so connected users see them live. Failures never fail the request. */
import type { PublishedEvent } from "../shared/realtime.js";

export type Publish = (event: PublishedEvent) => Promise<void>;

export function createPublisher(
  { url, secret }: { url: string; secret: string },
  fetchFn: typeof fetch = fetch,
): Publish {
  const endpoint = `${url.replace(/\/$/, "")}/notify`;
  return async (event) => {
    try {
      const res = await fetchFn(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Notify-Secret": secret },
        body: JSON.stringify(event),
        signal: AbortSignal.timeout(2000),
      });
      if (!res.ok) console.warn(`Realtime service answered ${res.status}`);
    } catch (err) {
      console.warn("Publishing to the realtime service failed:", err instanceof Error ? err.message : err);
    }
  };
}

export function createPublisherFromEnv(env: NodeJS.ProcessEnv): Publish | undefined {
  if (!env.REALTIME_URL || !env.REALTIME_NOTIFY_SECRET) return undefined;
  return createPublisher({ url: env.REALTIME_URL, secret: env.REALTIME_NOTIFY_SECRET });
}
