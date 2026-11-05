import { useEffect } from 'react';
import { toast } from 'sonner';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import { connectSocket, connectedSocket, disconnectSocket } from '@/lib/socket';
import { supabase } from '@/lib/supabase';
import { inboxEntryFromRow, messageFromRow, type InboxRow, type MessageRow } from '@shared/mappers';
import type { Ack } from '@shared/realtime';
import type { Conversation, InboxEntry, Message } from '@shared/schema';

const messageKeys = {
  all: ['messages'] as const,
  inbox: (userId: string) => [...messageKeys.all, 'inbox', userId] as const,
  unread: (userId: string) => [...messageKeys.all, 'unread', userId] as const,
  thread: (conversationId: string) => [...messageKeys.all, 'thread', conversationId] as const,
};

/** The signed-in user's conversations, most recent first, with unread counts. */
export function useInbox(userId: string | undefined) {
  return useQuery({
    queryKey: messageKeys.inbox(userId ?? ''),
    enabled: !!userId,
    queryFn: async (): Promise<InboxEntry[]> => {
      const { data, error } = await supabase.rpc('my_conversations');
      if (error) throw error;
      return (data as InboxRow[]).map(inboxEntryFromRow);
    },
  });
}

/** Unread messages across all conversations, for the navbar badge. */
export function useUnreadCount(userId: string | undefined) {
  return useQuery({
    queryKey: messageKeys.unread(userId ?? ''),
    enabled: !!userId,
    queryFn: async () => {
      const { count, error } = await supabase
        .from('messages')
        .select('id', { count: 'exact', head: true })
        .eq('receiver_id', userId!)
        .eq('is_read', false)
        .not('conversation_id', 'is', null);
      if (error) throw error;
      return count ?? 0;
    },
  });
}

/** Messages in one conversation, oldest first. RLS returns nothing to non-participants. */
export function useThread(conversationId: string | undefined) {
  return useQuery({
    queryKey: messageKeys.thread(conversationId ?? ''),
    enabled: !!conversationId,
    queryFn: async (): Promise<Message[]> => {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId!)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return (data as MessageRow[]).map(messageFromRow);
    },
  });
}

/** Adds a message to a cached thread unless it is already there (our own send and its realtime echo). */
function appendToThread(queryClient: ReturnType<typeof useQueryClient>, message: Message) {
  queryClient.setQueryData<Message[]>(messageKeys.thread(message.conversationId), (current) =>
    current && !current.some((m) => m.id === message.id) ? [...current, message] : current,
  );
}

/**
 * One realtime subscription per signed-in user. Supabase applies the messages select policy to
 * every event, so only the user's own conversations arrive here.
 */
export function useMessageEvents(userId: string | undefined) {
  const queryClient = useQueryClient();
  useSocketEvents(userId);

  useEffect(() => {
    if (!userId) return;
    const channel = supabase
      .channel(`messages:${userId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, (payload) => {
        if (payload.eventType === 'INSERT') {
          const row = payload.new as MessageRow;
          if (row.conversation_id) appendToThread(queryClient, messageFromRow(row));
        }
        queryClient.invalidateQueries({ queryKey: messageKeys.inbox(userId) });
        queryClient.invalidateQueries({ queryKey: messageKeys.unread(userId) });
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, queryClient]);
}

/**
 * The Socket.IO connection, when the app is configured with one. The service puts each conversation in a room,
 * so these events only ever describe the user's own conversations.
 */
function useSocketEvents(userId: string | undefined) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!userId) return;
    const socket = connectSocket();
    if (!socket) return;

    socket.on('message:new', (message) => {
      appendToThread(queryClient, message);
      queryClient.invalidateQueries({ queryKey: messageKeys.inbox(userId) });
    });
    // Someone read our messages: show the receipt without waiting for a refetch.
    socket.on('message:read', ({ conversationId, readerId, messageIds }) => {
      if (readerId === userId) return;
      queryClient.setQueryData<Message[]>(messageKeys.thread(conversationId), (current) =>
        current?.map((m) => (messageIds.includes(m.id) ? { ...m, isRead: true } : m)),
      );
    });
    socket.on('unread:update', ({ total }) => {
      queryClient.setQueryData(messageKeys.unread(userId), total);
      queryClient.invalidateQueries({ queryKey: messageKeys.inbox(userId) });
    });
    socket.on('notification', ({ type }) => {
      queryClient.invalidateQueries({ queryKey: ['viewings'] });
      toast(type === 'viewing:requested' ? 'New viewing request' : 'A landlord answered your viewing request');
    });

    return () => {
      disconnectSocket();
    };
  }, [userId, queryClient]);
}

const SEND_TIMEOUT_MS = 8000;

/** Emits an event and waits for the service's acknowledgement. */
function emitWithAck<T extends object>(send: (done: (r: Ack<T>) => void) => void): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = window.setTimeout(() => reject(new Error('The message service did not answer')), SEND_TIMEOUT_MS);
    send((result) => {
      window.clearTimeout(timer);
      if (result.ok) resolve(result);
      else reject(new Error(result.error));
    });
  });
}

export function useMessageMutations(userId: string | undefined) {
  const queryClient = useQueryClient();
  const refreshInbox = () => queryClient.invalidateQueries({ queryKey: messageKeys.all });

  const startConversation = useMutation({
    mutationFn: (input: { listingId: string; content: string }) =>
      apiFetch<{ conversation: Conversation; message: Message }>('/conversations', { method: 'POST', body: input }),
    onSuccess: ({ conversation, message }) => {
      appendToThread(queryClient, message);
      refreshInbox();
      // Join the new conversation's room so replies arrive live.
      connectedSocket()?.emit('conversation:join', { conversationId: conversation.id }, () => undefined);
    },
  });

  const sendMessage = useMutation({
    mutationFn: async ({ conversationId, content }: { conversationId: string; content: string }) => {
      // Through the socket when it is open (the service pushes it to the other person), else through the API.
      const socket = connectedSocket();
      if (socket) {
        const { message } = await emitWithAck<{ message: Message }>((done) =>
          socket.emit('message:send', { conversationId, content }, done),
        );
        return message;
      }
      return (await apiFetch<{ message: Message }>(`/conversations/${conversationId}/messages`, { method: 'POST', body: { content } }))
        .message;
    },
    onSuccess: (message) => {
      appendToThread(queryClient, message);
      queryClient.invalidateQueries({ queryKey: messageKeys.inbox(userId ?? '') });
    },
  });

  /** Marks everything addressed to the user in this conversation as read. The column grant only allows is_read. */
  const markRead = useMutation({
    mutationFn: async (conversationId: string) => {
      const socket = connectedSocket();
      if (socket) {
        // The service marks them read and sends the sender a read receipt.
        await emitWithAck<{ messageIds: string[] }>((done) => socket.emit('message:read', { conversationId }, done));
        return;
      }
      const { error } = await supabase
        .from('messages')
        .update({ is_read: true })
        .eq('conversation_id', conversationId)
        .eq('receiver_id', userId!)
        .eq('is_read', false);
      if (error) throw error;
    },
    // Mark the cached thread read right away, so the effect that called this doesn't call it again
    // while the refetch is in flight.
    onMutate: (conversationId) => {
      queryClient.setQueryData<Message[]>(messageKeys.thread(conversationId), (current) =>
        current?.map((m) => (m.receiverId === userId && !m.isRead ? { ...m, isRead: true } : m)),
      );
    },
    onSettled: refreshInbox,
  });

  return { startConversation, sendMessage, markRead };
}

const HEARTBEAT_MS = 60_000;

/** Records that the user has the app open, so the API doesn't email them about messages they can see. */
export function usePresenceHeartbeat(userId: string | undefined) {
  useEffect(() => {
    if (!userId) return;
    const beat = () => {
      if (document.visibilityState !== 'visible') return;
      supabase
        .from('user_presence')
        .upsert({ user_id: userId, last_seen_at: new Date().toISOString() })
        .then(({ error }) => {
          if (error) console.warn('Could not record presence:', error.message);
        });
    };
    beat();
    const timer = window.setInterval(beat, HEARTBEAT_MS);
    document.addEventListener('visibilitychange', beat);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', beat);
    };
  }, [userId]);
}
