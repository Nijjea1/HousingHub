import { describe, expect, it, vi } from "vitest";
import { createPublisher, createPublisherFromEnv } from "./publish";

const event = { userId: "0a000000-0000-4000-8000-00000000000a", type: "viewing:requested" as const, payload: { id: "v1" } };

describe("createPublisher", () => {
  it("posts the event to /notify with the shared secret", async () => {
    const fetchFn = vi.fn(async () => new Response("{}", { status: 202 }));
    await createPublisher({ url: "https://rt.example.com/", secret: "s3cret" }, fetchFn as unknown as typeof fetch)(event);

    const [url, init] = fetchFn.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://rt.example.com/notify");
    expect(init.method).toBe("POST");
    expect((init.headers as Record<string, string>)["X-Notify-Secret"]).toBe("s3cret");
    expect(JSON.parse(init.body as string)).toEqual(event);
  });

  it("never throws when the service is down or refuses", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const down = createPublisher({ url: "http://x", secret: "s" }, (async () => {
      throw new Error("connect ECONNREFUSED");
    }) as unknown as typeof fetch);
    await expect(down(event)).resolves.toBeUndefined();
    const refused = createPublisher({ url: "http://x", secret: "s" }, (async () => new Response("{}", { status: 401 })) as unknown as typeof fetch);
    await expect(refused(event)).resolves.toBeUndefined();
    expect(warn).toHaveBeenCalledTimes(2);
    warn.mockRestore();
  });
});

describe("createPublisherFromEnv", () => {
  it("is off unless both the URL and the secret are set", () => {
    expect(createPublisherFromEnv({})).toBeUndefined();
    expect(createPublisherFromEnv({ REALTIME_URL: "http://x" })).toBeUndefined();
    expect(createPublisherFromEnv({ REALTIME_URL: "http://x", REALTIME_NOTIFY_SECRET: "s" })).toBeTypeOf("function");
  });
});
