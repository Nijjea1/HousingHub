import { Link } from 'wouter';
import RequireAuth from '@/components/RequireAuth';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/contexts/AuthContext';
import { useAnswerViewing, useViewings } from '@/hooks/use-viewings';
import type { ViewingRequest } from '@shared/schema';

const STATUS_STYLE: Record<ViewingRequest['status'], string> = {
  pending: 'bg-amber-100 text-amber-900',
  accepted: 'bg-green-100 text-green-900',
  declined: 'bg-red-100 text-red-900',
};

const formatWhen = (iso: string) =>
  new Date(iso).toLocaleString('en-CA', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });

const Row = ({ request, mine, onAnswer, busy }: { request: ViewingRequest; mine: boolean; onAnswer: (status: 'accepted' | 'declined') => void; busy: boolean }) => (
  <li className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-card p-4">
    <div className="min-w-0">
      <p className="font-medium tabular-nums">{formatWhen(request.proposedAt)}</p>
      <p className="text-sm text-muted-foreground">
        <Link href={`/listings/${request.listingId}`} className="underline underline-offset-2">
          View the listing
        </Link>
        {request.message && ` · "${request.message}"`}
      </p>
    </div>
    <div className="flex items-center gap-2">
      <span className={`rounded-full px-3 py-1 text-xs font-medium capitalize ${STATUS_STYLE[request.status]}`}>{request.status}</span>
      {mine && request.status === 'pending' && (
        <>
          <Button size="sm" disabled={busy} onClick={() => onAnswer('accepted')}>
            Accept
          </Button>
          <Button size="sm" variant="outline" disabled={busy} onClick={() => onAnswer('declined')}>
            Decline
          </Button>
        </>
      )}
    </div>
  </li>
);

const ViewingsContent = () => {
  const { user } = useAuth();
  const { data = [], isLoading, error, refetch } = useViewings(user?.id);
  const answer = useAnswerViewing();

  // Requests for listings you own, and requests you made as a student.
  const forMyListings = data.filter((r) => r.landlordId === user?.id);
  const iRequested = data.filter((r) => r.studentId === user?.id);

  return (
    <div className="page max-w-3xl pb-16 pt-28">
      <h1 className="mb-2 text-3xl font-semibold">Viewings</h1>
      <p className="mb-8 text-muted-foreground">Times students asked to see your places, and times you asked to see others.</p>

      {isLoading ? (
        <div className="space-y-3" role="status" aria-label="Loading viewings">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
      ) : error ? (
        <div role="alert" className="rounded-lg border p-6 text-center">
          <p className="mb-3">Couldn't load your viewings.</p>
          <Button onClick={() => refetch()}>Try again</Button>
        </div>
      ) : data.length === 0 ? (
        <p className="rounded-lg border border-dashed p-10 text-center text-muted-foreground">No viewing requests yet.</p>
      ) : (
        <div className="space-y-10">
          {forMyListings.length > 0 && (
            <section aria-labelledby="for-me">
              <h2 id="for-me" className="mb-3 text-lg font-semibold">
                Requests for your listings
              </h2>
              <ul className="space-y-3">
                {forMyListings.map((r) => (
                  <Row key={r.id} request={r} mine busy={answer.isPending} onAnswer={(status) => answer.mutate({ id: r.id, status })} />
                ))}
              </ul>
            </section>
          )}
          {iRequested.length > 0 && (
            <section aria-labelledby="by-me">
              <h2 id="by-me" className="mb-3 text-lg font-semibold">
                Your requests
              </h2>
              <ul className="space-y-3">
                {iRequested.map((r) => (
                  <Row key={r.id} request={r} mine={false} busy={false} onAnswer={() => undefined} />
                ))}
              </ul>
            </section>
          )}
        </div>
      )}
    </div>
  );
};

const Viewings = () => (
  <RequireAuth reason="see your viewings">{() => <ViewingsContent />}</RequireAuth>
);

export default Viewings;
