/** The Socket.IO contract between the browser and the realtime service. */
import { z } from "zod";
import { messageInputSchema, type Message } from "./schema.js";

// Inbound events carry untrusted input, so the service validates them with these.

export const joinConversationSchema = z.object({ conversationId: z.string().uuid() });
export const sendMessageSchema = joinConversationSchema.extend({ content: messageInputSchema.shape.content });
export const markReadSchema = joinConversationSchema;
export const typingSchema = joinConversationSchema.extend({ isTyping: z.boolean() });

/** What the API posts to the service's /notify endpoint. */
export const publishedEventSchema = z.object({
  userId: z.string().uuid(),
  type: z.enum(["viewing:requested", "viewing:answered"]),
  payload: z.record(z.unknown()),
});
export type PublishedEvent = z.infer<typeof publishedEventSchema>;

export interface UnreadUpdate {
  /** The conversation that changed, or null for the connection's first snapshot. */
  conversationId: string | null;
  /** Unread messages left in that conversation (0 when null). */
  unreadCount: number;
  /** Unread messages across every conversation, for the navbar badge. */
  total: number;
}

export interface ReadReceipt {
  conversationId: string;
  readerId: string;
  messageIds: string[];
}

export interface TypingNotice {
  conversationId: string;
  userId: string;
  isTyping: boolean;
}

export interface RealtimeNotification {
  type: PublishedEvent["type"];
  payload: Record<string, unknown>;
  at: string;
}

export type Ack<T = object> = ({ ok: true } & T) | { ok: false; error: string };

export interface ServerToClientEvents {
  "message:new": (message: Message) => void;
  "message:read": (receipt: ReadReceipt) => void;
  "unread:update": (update: UnreadUpdate) => void;
  typing: (notice: TypingNotice) => void;
  notification: (notification: RealtimeNotification) => void;
}

export interface ClientToServerEvents {
  "conversation:join": (input: z.input<typeof joinConversationSchema>, ack: (r: Ack) => void) => void;
  "message:send": (input: z.input<typeof sendMessageSchema>, ack: (r: Ack<{ message: Message }>) => void) => void;
  "message:read": (input: z.input<typeof markReadSchema>, ack: (r: Ack<{ messageIds: string[] }>) => void) => void;
  typing: (input: z.input<typeof typingSchema>) => void;
}
