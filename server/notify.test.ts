import { describe, expect, it, vi } from "vitest";
import { OFFLINE_AFTER_MS, buildMessageEmail, createEmailNotifier, isOffline, type NotifyLookup } from "./notify";

const NOW = Date.parse("2026-10-14T12:00:00Z");
const notice = {
  conversationId: "c0000000-0000-4000-8000-000000000001",
  listingId: "00000000-0000-4000-8000-000000000001",
  senderId: "0a000000-0000-4000-8000-00000000000a",
  receiverId: "0b000000-0000-4000-8000-00000000000b",
  content: "Is the room still available?",
};

const lookup = (overrides: Partial<NotifyLookup> = {}): NotifyLookup => ({
  lastSeenAt: async () => null,
  email: async () => "landlord@example.com",
  displayName: async () => "Ava",
  listingTitle: async () => "Room near campus",
  ...overrides,
});

function setup(overrides: Partial<NotifyLookup> = {}, status = 200) {
  const fetchFn = vi.fn(async () => new Response("{}", { status }));
  const notify = createEmailNotifier({
    lookup: lookup(overrides),
    resendApiKey: "re_test",
    from: "LetMeKnock <alerts@example.com>",
    appUrl: "https://letmeknock.example/",
    fetchFn: fetchFn as unknown as typeof fetch,
    now: () => NOW,
  });
  return { notify, fetchFn };
}

describe("isOffline", () => {
  it("treats never seen and seen 5+ minutes ago as offline", () => {
    expect(isOffline(null, NOW)).toBe(true);
    expect(isOffline(new Date(NOW - OFFLINE_AFTER_MS).toISOString(), NOW)).toBe(true);
    expect(isOffline(new Date(NOW - OFFLINE_AFTER_MS + 1000).toISOString(), NOW)).toBe(false);
  });
});

describe("buildMessageEmail", () => {
  it("escapes HTML from user text and shortens long messages", () => {
    const email = buildMessageEmail({
      senderName: "<b>Eve</b>",
      listingTitle: "A & B",
      content: "x".repeat(400),
      link: "https://letmeknock.example/inbox/1",
    });
    expect(email.html).toContain("&lt;b&gt;Eve&lt;/b&gt;");
    expect(email.html).toContain("A &amp; B");
    expect(email.html).not.toContain("<b>Eve</b>");
    expect(email.text).toContain(`${"x".repeat(300)}...`);
    expect(email.subject).toBe("New message from <b>Eve</b> about A & B");
  });
});

describe("createEmailNotifier", () => {
  it("emails an offline receiver through Resend with a link to the conversation", async () => {
    const { notify, fetchFn } = setup();
    expect(await notify(notice)).toBe("sent");
    expect(fetchFn).toHaveBeenCalledTimes(1);
    const [url, init] = fetchFn.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://api.resend.com/emails");
    expect((init.headers as Record<string, string>).Authorization).toBe("Bearer re_test");
    const body = JSON.parse(init.body as string);
    expect(body.to).toEqual(["landlord@example.com"]);
    expect(body.subject).toBe("New message from Ava about Room near campus");
    expect(body.text).toContain(`https://letmeknock.example/inbox/${notice.conversationId}`);
  });

  it("does not email someone who has the app open", async () => {
    const { notify, fetchFn } = setup({ lastSeenAt: async () => new Date(NOW - 60_000).toISOString() });
    expect(await notify(notice)).toBe("online");
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it("skips users without an email and reports provider errors without throwing", async () => {
    expect(await setup({ email: async () => null }).notify(notice)).toBe("no-email");
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    expect(await setup({}, 422).notify(notice)).toBe("failed");
    warn.mockRestore();
  });
});
