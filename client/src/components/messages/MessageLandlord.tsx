import { useState } from 'react';
import { Link, useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useMessageMutations } from '@/hooks/use-messages';
import { ApiError } from '@/lib/api';
import { signInHref } from '@/lib/redirect';
import { MAX_MESSAGE_LENGTH } from '@shared/schema';

interface MessageLandlordProps {
  listingId: string;
  userId: string | undefined;
}

/** "Message landlord" on a listing: opens or continues the conversation, then goes to it in the inbox. */
const MessageLandlord = ({ listingId, userId }: MessageLandlordProps) => {
  const [, navigate] = useLocation();
  const { startConversation } = useMessageMutations(userId);
  const [open, setOpen] = useState(false);
  const [content, setContent] = useState('Hi, is this place still available?');
  const [error, setError] = useState<string | null>(null);

  if (!userId) {
    return (
      <Button asChild className="w-full">
        <Link href={signInHref(`/listings/${listingId}`)}>Sign in to message the landlord</Link>
      </Button>
    );
  }

  if (!open) {
    return (
      <Button className="w-full" onClick={() => setOpen(true)}>
        Message landlord
      </Button>
    );
  }

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      const { conversation } = await startConversation.mutateAsync({ listingId, content });
      navigate(`/inbox/${conversation.id}`);
    } catch (err) {
      setError(err instanceof ApiError ? (err.fields?.content?.[0] ?? err.message) : 'Could not send your message');
    }
  };

  return (
    <form onSubmit={send} className="space-y-2">
      <label htmlFor="first-message" className="text-sm font-medium">
        Your message
      </label>
      <Textarea
        id="first-message"
        value={content}
        onChange={(e) => setContent(e.target.value)}
        maxLength={MAX_MESSAGE_LENGTH}
        rows={4}
        aria-invalid={!!error}
        aria-describedby={error ? 'first-message-error' : undefined}
      />
      {error && (
        <p id="first-message-error" className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}
      <div className="flex gap-2">
        <Button type="submit" className="flex-1" disabled={startConversation.isPending || !content.trim()}>
          {startConversation.isPending ? 'Sending' : 'Send'}
        </Button>
        <Button type="button" variant="outline" onClick={() => setOpen(false)}>
          Cancel
        </Button>
      </div>
    </form>
  );
};

export default MessageLandlord;
