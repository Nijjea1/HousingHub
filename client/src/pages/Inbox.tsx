import { useEffect, useRef, useState } from 'react';
import { Link, useRoute } from 'wouter';
import { format, formatDistanceToNowStrict, isToday } from 'date-fns';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/contexts/AuthContext';
import { useInbox, useMessageMutations, useThread } from '@/hooks/use-messages';
import { ApiError } from '@/lib/api';
import { signInHref } from '@/lib/redirect';
import { MAX_MESSAGE_LENGTH, type InboxEntry } from '@shared/schema';

const Avatar = ({ url, name }: { url: string | null; name: string | null }) => (
  <div className="w-10 h-10 shrink-0 rounded-full overflow-hidden bg-muted flex items-center justify-center" aria-hidden>
    {url ? <img src={url} alt="" className="w-full h-full object-cover" /> : <span className="text-muted-foreground font-medium">{(name ?? '?')[0]}</span>}
  </div>
);

function ConversationList({ entries, selectedId, userId }: { entries: InboxEntry[]; selectedId: string | null; userId: string }) {
  if (entries.length === 0) {
    return (
      <div className="p-6 text-sm">
        <p className="font-medium">No conversations yet</p>
        <p className="mt-1 text-muted-foreground">Open a listing and use "Message landlord" to start one.</p>
      </div>
    );
  }
  return (
    <ul className="divide-y" aria-label="Conversations">
      {entries.map((e) => (
        <li key={e.conversationId}>
          <Link
            href={`/inbox/${e.conversationId}`}
            className={`flex gap-3 border-l-2 p-4 hover:bg-accent ${e.conversationId === selectedId ? 'border-primary bg-accent' : 'border-transparent'}`}
            aria-current={e.conversationId === selectedId ? 'page' : undefined}
          >
            <Avatar url={e.otherAvatarUrl} name={e.otherName} />
            <div className="min-w-0 flex-1">
              <div className="flex justify-between gap-2">
                <span className={`truncate ${e.unreadCount > 0 ? 'font-semibold text-foreground' : 'text-foreground'}`}>
                  {e.otherName ?? 'Unnamed user'}
                </span>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {formatDistanceToNowStrict(new Date(e.lastMessageAt), { addSuffix: true })}
                </span>
              </div>
              <p className="truncate text-xs text-muted-foreground">{e.listingTitle}</p>
              <div className="flex justify-between gap-2">
                <p className="truncate text-sm text-muted-foreground">
                  {e.lastSenderId === userId && 'You: '}
                  {e.lastMessage}
                </p>
                {e.unreadCount > 0 && (
                  <span className="shrink-0 rounded-full bg-primary px-2 text-xs font-medium text-primary-foreground" aria-label={`${e.unreadCount} unread`}>
                    {e.unreadCount}
                  </span>
                )}
              </div>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}

function Thread({ conversationId, entry, userId }: { conversationId: string; entry: InboxEntry | undefined; userId: string }) {
  const { data: messages = [], isLoading, error } = useThread(conversationId);
  const { sendMessage, markRead } = useMessageMutations(userId);
  const [draft, setDraft] = useState('');
  const [sendError, setSendError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Opening the thread, or a new message arriving while it's open, marks it read. Each message is
  // tried once, so a failing update can't turn into a retry loop through the refetch.
  const attempted = useRef(new Set<string>());
  const toMark = messages
    .filter((m) => m.receiverId === userId && !m.isRead && !attempted.current.has(m.id))
    .map((m) => m.id)
    .join(',');
  const { mutate: markReadNow } = markRead;
  useEffect(() => {
    if (!toMark) return;
    for (const id of toMark.split(',')) attempted.current.add(id);
    markReadNow(conversationId);
  }, [toMark, markReadNow, conversationId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: 'end' });
  }, [messages.length]);

  const send = async () => {
    const content = draft.trim();
    if (!content || sendMessage.isPending) return;
    setSendError(null);
    try {
      await sendMessage.mutateAsync({ conversationId, content });
      setDraft('');
    } catch (err) {
      setSendError(err instanceof ApiError ? (err.fields?.content?.[0] ?? err.message) : 'Could not send your message');
    }
  };

  if (error) return <p className="p-6 text-sm text-destructive" role="alert">Couldn't load this conversation: {error.message}</p>;
  if (!isLoading && messages.length === 0 && !entry) {
    return <p className="p-6 text-sm text-muted-foreground">Conversation not found.</p>;
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-3 border-b p-4">
        <Link href="/inbox" className="-ml-1 rounded-md p-1 text-muted-foreground hover:text-foreground md:hidden" aria-label="Back to conversations">
          <ArrowLeft className="h-5 w-5" aria-hidden="true" />
        </Link>
        {entry && <Avatar url={entry.otherAvatarUrl} name={entry.otherName} />}
        <div className="min-w-0">
          <p className="font-medium text-foreground truncate">{entry?.otherName ?? 'Conversation'}</p>
          {entry && (
            <Link href={`/listings/${entry.listingId}`} className="text-sm text-primary truncate block">
              {entry.listingTitle}
            </Link>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3" aria-live="polite" aria-label="Messages">
        {isLoading && (
          <div className="space-y-3" role="status" aria-label="Loading messages">
            <Skeleton className="h-12 w-2/3 rounded-2xl" />
            <Skeleton className="ml-auto h-12 w-1/2 rounded-2xl" />
          </div>
        )}
        {messages.map((m) => {
          const mine = m.senderId === userId;
          const at = new Date(m.createdAt);
          return (
            <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-2 ${mine ? 'rounded-br-sm bg-primary text-primary-foreground' : 'rounded-bl-sm bg-muted text-foreground'}`}
              >
                <p className="whitespace-pre-wrap break-words">{m.content}</p>
                <p className={`mt-1 text-xs ${mine ? 'text-primary-foreground/75' : 'text-muted-foreground'}`}>
                  {isToday(at) ? format(at, 'h:mm a') : format(at, 'MMM d, h:mm a')}
                </p>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      <form
        className="border-t p-3 space-y-2"
        onSubmit={(e) => {
          e.preventDefault();
          send();
        }}
      >
        <div className="flex gap-2">
          <label htmlFor="reply" className="sr-only">
            Write a message
          </label>
          <Textarea
            id="reply"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              // Enter sends, Shift+Enter adds a new line.
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            placeholder="Write a message"
            maxLength={MAX_MESSAGE_LENGTH}
            rows={2}
            className="resize-none"
          />
          <Button type="submit" disabled={!draft.trim() || sendMessage.isPending}>
            Send
          </Button>
        </div>
        {sendError && (
          <p className="text-sm text-destructive" role="alert">
            {sendError}
          </p>
        )}
      </form>
    </div>
  );
}

const Inbox = () => {
  const [, params] = useRoute('/inbox/:id');
  const selectedId = params?.id ?? null;
  const { user, loading } = useAuth();
  const { data: entries = [], isLoading, error, refetch } = useInbox(user?.id);

  if (!loading && !user) {
    return (
      <div className="page py-16 text-center">
        <h1 className="mb-2 text-3xl font-semibold">Messages</h1>
        <p className="text-muted-foreground mb-6">Sign in to see your conversations with landlords and students.</p>
        <Button asChild>
          <Link href={signInHref(selectedId ? `/inbox/${selectedId}` : '/inbox')}>Sign in</Link>
        </Button>
      </div>
    );
  }

  const entry = entries.find((e) => e.conversationId === selectedId);

  return (
    <div className="page py-6 md:py-8">
      <div>
        <h1 className="mb-4 text-3xl font-semibold">Messages</h1>
        <div className="h-[calc(100vh-12rem)] min-h-[26rem] overflow-hidden rounded-lg border bg-card md:grid md:grid-cols-[20rem_1fr]">
          <aside className={`border-r overflow-y-auto ${selectedId ? 'hidden md:block' : ''}`}>
            {error ? (
              <div className="p-6 text-sm text-destructive" role="alert">
                <p className="mb-3">Couldn't load your conversations: {error.message}</p>
                <Button size="sm" variant="outline" onClick={() => refetch()}>
                  Try again
                </Button>
              </div>
            ) : isLoading || !user ? (
              <ul className="divide-y" role="status" aria-label="Loading conversations">
                {[0, 1, 2].map((i) => (
                  <li key={i} className="flex gap-3 p-4">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-1/2" />
                      <Skeleton className="h-3 w-3/4" />
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <ConversationList entries={entries} selectedId={selectedId} userId={user.id} />
            )}
          </aside>
          <section className={`h-full ${selectedId ? '' : 'hidden md:flex md:items-center md:justify-center'}`}>
            {selectedId && user ? (
              <Thread key={selectedId} conversationId={selectedId} entry={entry} userId={user.id} />
            ) : (
              <p className="text-sm text-muted-foreground">Choose a conversation.</p>
            )}
          </section>
        </div>
      </div>
    </div>
  );
};

export default Inbox;
