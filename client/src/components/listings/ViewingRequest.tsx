import { useState } from 'react';
import { CalendarClock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useRequestViewing } from '@/hooks/use-viewings';
import { ApiError } from '@/lib/api';

/** The value a datetime-local input accepts for "now", in the visitor's own time zone. */
const localNow = () => {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
};

/** "Request a viewing": propose a time and the landlord accepts or declines. */
const ViewingRequest = ({ listingId }: { listingId: string }) => {
  const request = useRequestViewing(listingId);
  const [open, setOpen] = useState(false);
  const [when, setWhen] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  if (sent) {
    return (
      <p className="rounded-md bg-muted p-3 text-sm" role="status">
        Request sent. You'll hear back here and in your viewings.
      </p>
    );
  }

  if (!open) {
    return (
      <Button variant="outline" className="w-full" onClick={() => setOpen(true)}>
        <CalendarClock className="mr-2 h-4 w-4" aria-hidden="true" />
        Request a viewing
      </Button>
    );
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      await request.mutateAsync({ proposedAt: new Date(when).toISOString(), message: message.trim() || null });
      setSent(true);
    } catch (err) {
      setError(err instanceof ApiError ? (err.fields?.proposedAt?.[0] ?? err.message) : 'Could not send your request');
    }
  };

  return (
    <form onSubmit={submit} className="space-y-3">
      <label className="block text-sm font-medium" htmlFor="viewing-time">
        When would suit you?
      </label>
      <Input id="viewing-time" type="datetime-local" required min={localNow()} value={when} onChange={(e) => setWhen(e.target.value)} />
      <Textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        maxLength={500}
        rows={2}
        placeholder="Anything the landlord should know (optional)"
        aria-label="Message to the landlord"
      />
      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}
      <div className="flex gap-2">
        <Button type="submit" className="flex-1" disabled={request.isPending || !when}>
          {request.isPending ? 'Sending...' : 'Send request'}
        </Button>
        <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
          Cancel
        </Button>
      </div>
    </form>
  );
};

export default ViewingRequest;
