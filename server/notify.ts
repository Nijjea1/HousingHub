/** Emails the receiver of a message when they haven't had the app open recently. Sent through Resend's HTTP API. */
import type { NewMessageNotice } from "./deps.js";

export const OFFLINE_AFTER_MS = 5 * 60_000;
const PREVIEW_LENGTH = 300;
const TIMEOUT_MS = 4000;

/** Someone who has never been seen, or not for `thresholdMs`, counts as offline. */
export function isOffline(lastSeenAt: string | null, now: number, thresholdMs = OFFLINE_AFTER_MS): boolean {
  return lastSeenAt === null || now - Date.parse(lastSeenAt) >= thresholdMs;
}

const escapeHtml = (text: string) =>
  text.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

export interface MessageEmail {
  subject: string;
  text: string;
  html: string;
}

export function buildMessageEmail(input: { senderName: string; listingTitle: string; content: string; link: string }): MessageEmail {
  const preview =
    input.content.length > PREVIEW_LENGTH ? `${input.content.slice(0, PREVIEW_LENGTH).trimEnd()}...` : input.content;
  const subject = `New message from ${input.senderName} about ${input.listingTitle}`;
  const text = `${input.senderName} wrote:\n\n${preview}\n\nReply on LetMeKnock: ${input.link}\n`;
  const html = [
    `<p><strong>${escapeHtml(input.senderName)}</strong> wrote about <strong>${escapeHtml(input.listingTitle)}</strong>:</p>`,
    `<blockquote style="border-left:3px solid #ccc;margin:0;padding-left:12px;white-space:pre-wrap">${escapeHtml(preview)}</blockquote>`,
    `<p><a href="${escapeHtml(input.link)}">Reply on LetMeKnock</a></p>`,
  ].join("\n");
  return { subject, text, html };
}

/** What the notifier needs to know about people and listings. Production reads these with the service role key. */
export interface NotifyLookup {
  lastSeenAt(userId: string): Promise<string | null>;
  email(userId: string): Promise<string | null>;
  displayName(userId: string): Promise<string | null>;
  listingTitle(listingId: string): Promise<string | null>;
}

export type NotifyOutcome = "sent" | "online" | "no-email" | "failed";

export function createEmailNotifier(options: {
  lookup: NotifyLookup;
  resendApiKey: string;
  from: string;
  appUrl: string;
  fetchFn?: typeof fetch;
  now?: () => number;
}) {
  const { lookup, resendApiKey, from, appUrl, fetchFn = fetch, now = Date.now } = options;

  return async function notify(notice: NewMessageNotice): Promise<NotifyOutcome> {
    if (!isOffline(await lookup.lastSeenAt(notice.receiverId), now())) return "online";
    const to = await lookup.email(notice.receiverId);
    if (!to) return "no-email";

    const [senderName, listingTitle] = await Promise.all([
      lookup.displayName(notice.senderId),
      lookup.listingTitle(notice.listingId),
    ]);
    const email = buildMessageEmail({
      senderName: senderName ?? "Someone",
      listingTitle: listingTitle ?? "your listing",
      content: notice.content,
      link: `${appUrl.replace(/\/$/, "")}/inbox/${notice.conversationId}`,
    });

    try {
      const res = await fetchFn("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${resendApiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({ from, to: [to], ...email }),
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
      if (!res.ok) {
        console.warn("Message email failed:", res.status, await res.text().catch(() => ""));
        return "failed";
      }
      return "sent";
    } catch (err) {
      console.warn("Message email failed:", err instanceof Error ? err.message : err);
      return "failed";
    }
  };
}
