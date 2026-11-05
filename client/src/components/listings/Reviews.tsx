import { useState } from 'react';
import { Link } from 'wouter';
import { Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useAddReview, useReviews } from '@/hooks/use-reviews';
import { ApiError } from '@/lib/api';
import { signInHref } from '@/lib/redirect';
import { MAX_REVIEW_LENGTH } from '@shared/schema';

const Stars = ({ value, className = '' }: { value: number; className?: string }) => (
  <span className={`inline-flex ${className}`} role="img" aria-label={`${value} out of 5 stars`}>
    {[1, 2, 3, 4, 5].map((n) => (
      <Star key={n} className={`h-4 w-4 ${n <= Math.round(value) ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground/40'}`} aria-hidden="true" />
    ))}
  </span>
);

interface ReviewsProps {
  listingId: string;
  userId: string | undefined;
  isOwner: boolean;
}

/** Reviews of a listing. Anyone can read them; signed-in people other than the owner can write one. */
const Reviews = ({ listingId, userId, isOwner }: ReviewsProps) => {
  const { data, isLoading, error } = useReviews(listingId);
  const add = useAddReview(listingId);
  const [rating, setRating] = useState(0);
  const [body, setBody] = useState('');
  const [message, setMessage] = useState<string | null>(null);

  const mine = data?.reviews.some((r) => r.authorId === userId);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    try {
      await add.mutateAsync({ rating, body });
      setRating(0);
      setBody('');
    } catch (err) {
      setMessage(err instanceof ApiError ? (err.fields?.rating?.[0] ?? err.fields?.body?.[0] ?? err.message) : 'Could not post your review');
    }
  };

  return (
    <section aria-labelledby="reviews-heading">
      <div className="mb-4 flex flex-wrap items-baseline gap-x-3">
        <h2 id="reviews-heading" className="text-xl font-semibold">
          Reviews
        </h2>
        {data && data.count > 0 && data.average !== null && (
          <span className="flex items-center gap-2 text-sm text-muted-foreground">
            <Stars value={data.average} />
            <span className="tabular-nums">
              {data.average} from {data.count} {data.count === 1 ? 'review' : 'reviews'}
            </span>
          </span>
        )}
      </div>

      {isLoading ? (
        <p className="text-muted-foreground">Loading reviews...</p>
      ) : error ? (
        <p className="text-muted-foreground" role="alert">
          Couldn't load reviews.
        </p>
      ) : data!.reviews.length === 0 ? (
        <p className="text-muted-foreground">No reviews yet.</p>
      ) : (
        <ul className="space-y-5">
          {data!.reviews.map((review) => (
            <li key={review.id} className="border-b pb-5 last:border-0">
              <div className="flex items-center gap-3">
                <Stars value={review.rating} />
                <span className="text-sm font-medium">{review.authorName ?? 'A student'}</span>
                <time className="text-sm text-muted-foreground" dateTime={review.createdAt}>
                  {new Date(review.createdAt).toLocaleDateString('en-CA', { month: 'long', year: 'numeric' })}
                </time>
              </div>
              <p className="mt-2 max-w-prose whitespace-pre-line">{review.body}</p>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-6">
        {!userId ? (
          <Button asChild variant="outline">
            <Link href={signInHref(`/listings/${listingId}`)}>Sign in to write a review</Link>
          </Button>
        ) : isOwner ? (
          <p className="text-sm text-muted-foreground">You can't review your own listing.</p>
        ) : mine ? (
          <p className="text-sm text-muted-foreground">You've reviewed this listing.</p>
        ) : (
          <form onSubmit={submit} className="max-w-prose space-y-3">
            <div role="radiogroup" aria-label="Your rating" className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  role="radio"
                  aria-checked={rating === n}
                  aria-label={`${n} ${n === 1 ? 'star' : 'stars'}`}
                  onClick={() => setRating(n)}
                  className="rounded p-0.5"
                >
                  <Star className={`h-6 w-6 ${n <= rating ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground/50'}`} aria-hidden="true" />
                </button>
              ))}
            </div>
            <Textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              maxLength={MAX_REVIEW_LENGTH}
              rows={3}
              placeholder="What was it like to live here, or to deal with the landlord?"
              aria-label="Your review"
            />
            {message && (
              <p className="text-sm text-destructive" role="alert">
                {message}
              </p>
            )}
            <Button type="submit" disabled={add.isPending || rating === 0 || body.trim() === ''}>
              {add.isPending ? 'Posting...' : 'Post review'}
            </Button>
          </form>
        )}
      </div>
    </section>
  );
};

export default Reviews;
