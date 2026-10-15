import { Link } from 'wouter';
import ListingCard, { CardSkeleton } from '@/components/listings/ListingCard';
import { useCampus } from '@/hooks/use-campus';
import { useSearchResults } from '@/hooks/use-listings';
import { distanceOrigin, withCampusCenter } from '@/lib/map';
import { DEFAULT_SEARCH_PARAMS } from '@shared/schema';

const PARAMS = { ...DEFAULT_SEARCH_PARAMS, limit: 3 };

/** The three newest listings, so the home page shows real places rather than a description of them. */
const RecentListings = () => {
  const { campus, ready } = useCampus();
  const params = withCampusCenter(PARAMS, campus);
  const { data: results, isPending, error } = useSearchResults(params, { enabled: ready });
  if (error || (results && results.length === 0)) return null;

  return (
    <section className="page py-14 md:py-16" aria-labelledby="recent-heading">
      <div className="mb-6 flex items-end justify-between gap-4">
        <div>
          <p className="eyebrow mb-2">Just listed</p>
          <h2 id="recent-heading" className="text-2xl font-semibold md:text-3xl">
            Recently posted near campus
          </h2>
        </div>
        <Link href="/listings" className="shrink-0 text-sm font-medium text-primary hover:underline">
          See all listings
        </Link>
      </div>
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {isPending || !results
          ? [0, 1, 2].map((i) => <CardSkeleton key={i} />)
          : results.map(({ listing, distanceKm }) => (
              <ListingCard
                key={listing.id}
                listing={listing}
                distance={distanceKm === null ? null : { km: distanceKm, from: distanceOrigin(params, campus) }}
              />
            ))}
      </div>
    </section>
  );
};

export default RecentListings;
