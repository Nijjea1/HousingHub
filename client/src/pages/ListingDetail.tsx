import { Suspense, lazy, useState } from 'react';
import { Link, useRoute } from 'wouter';
import { ArrowLeft, Check, ChevronLeft, ChevronRight, Heart, MapPin } from 'lucide-react';
import ListingCover from '@/components/listings/ListingCover';
import MessageLandlord from '@/components/messages/MessageLandlord';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/contexts/AuthContext';
import { useCampus } from '@/hooks/use-campus';
import { useListing } from '@/hooks/use-listings';
import { useSaveListing } from '@/hooks/use-save-listing';
import { useProfile } from '@/hooks/use-user-profile';
import { formatDistance } from '@/lib/map';
import { haversineKm } from '@shared/search';
import { PROPERTY_TYPE_LABELS, PROVINCES, type Listing } from '@shared/schema';

const MiniMap = lazy(() => import('@/components/listings/MiniMap'));

// Date-only strings parse as UTC midnight, which is the previous day in Ontario.
const formatDate = (isoDate: string) =>
  new Date(`${isoDate}T00:00:00`).toLocaleDateString('en-CA', { month: 'long', day: 'numeric', year: 'numeric' });

const yesNo = (value: boolean) => (value ? 'Yes' : 'No');

const Centered = ({ children }: { children: React.ReactNode }) => (
  <div className="page flex min-h-[60vh] flex-col items-center justify-center py-16 text-center">{children}</div>
);

const DetailSkeleton = () => (
  <div className="page py-8" role="status" aria-label="Loading listing">
    <Skeleton className="mb-3 h-4 w-28" />
    <Skeleton className="mb-2 h-9 w-2/3" />
    <Skeleton className="mb-6 h-5 w-1/3" />
    <div className="grid gap-10 lg:grid-cols-[1fr_20rem]">
      <Skeleton className="aspect-[16/10] w-full" />
      <Skeleton className="h-56 w-full" />
    </div>
  </div>
);

const Gallery = ({ listing }: { listing: Listing }) => {
  const [active, setActive] = useState(0);
  const images = listing.images;
  if (images.length === 0) {
    return (
      <div className="aspect-[16/10] overflow-hidden rounded-lg">
        <ListingCover listing={listing} eager size="large" />
      </div>
    );
  }
  const index = Math.min(active, images.length - 1);
  const step = (delta: number) => setActive((i) => (i + delta + images.length) % images.length);
  const arrow = 'absolute top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-background/90 shadow-sm hover:bg-background';

  return (
    <div className="space-y-3">
      <div className="relative aspect-[16/10] overflow-hidden rounded-lg bg-muted">
        <img src={images[index]} alt={`${listing.title}, photo ${index + 1} of ${images.length}`} className="h-full w-full object-cover" />
        {images.length > 1 && (
          <>
            <button type="button" aria-label="Previous photo" onClick={() => step(-1)} className={`${arrow} left-3`}>
              <ChevronLeft className="h-5 w-5" aria-hidden="true" />
            </button>
            <button type="button" aria-label="Next photo" onClick={() => step(1)} className={`${arrow} right-3`}>
              <ChevronRight className="h-5 w-5" aria-hidden="true" />
            </button>
            <span className="absolute bottom-3 right-3 rounded bg-background/90 px-2 py-0.5 text-xs tabular-nums">
              {index + 1} / {images.length}
            </span>
          </>
        )}
      </div>
      {images.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {images.map((src, i) => (
            <button
              type="button"
              key={src}
              onClick={() => setActive(i)}
              aria-label={`Show photo ${i + 1}`}
              aria-current={i === index}
              className={`h-16 w-24 shrink-0 overflow-hidden rounded-md ${i === index ? 'ring-2 ring-primary ring-offset-2 ring-offset-background' : 'opacity-70 hover:opacity-100'}`}
            >
              <img src={src} alt="" className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

const ListingDetail = () => {
  const [, params] = useRoute('/listings/:id');
  const { user } = useAuth();
  const { campus } = useCampus();
  const { data: listing, isLoading, error, refetch } = useListing(params?.id);
  const { data: landlord } = useProfile(listing?.userId);
  const { saved, toggle } = useSaveListing(params?.id ?? '');

  if (isLoading) return <DetailSkeleton />;

  if (error) {
    return (
      <Centered>
        <h1 className="mb-2 text-2xl font-semibold">Couldn't load this listing</h1>
        <p className="mb-6 text-muted-foreground">{error.message}</p>
        <Button onClick={() => refetch()}>Try again</Button>
      </Centered>
    );
  }

  if (!listing) {
    return (
      <Centered>
        <h1 className="mb-2 text-2xl font-semibold">Listing not found</h1>
        <p className="mb-6 text-muted-foreground">It doesn't exist, or the landlord has taken it down.</p>
        <Button asChild>
          <Link href="/listings">See all listings</Link>
        </Button>
      </Centered>
    );
  }

  const place =
    listing.latitude !== null && listing.longitude !== null ? { latitude: listing.latitude, longitude: listing.longitude } : null;
  const distanceKm = place && campus ? haversineKm(place, campus) : null;
  const fullAddress = `${listing.address}, ${listing.city}, ${PROVINCES[listing.province] ?? listing.province} ${listing.postalCode}`;
  const isOwner = user?.id === listing.userId;

  const facts: Array<[string, React.ReactNode]> = [
    ['Rent', `$${listing.price.toLocaleString('en-CA')} a month`],
    ['Type', PROPERTY_TYPE_LABELS[listing.propertyType]],
    ['Bedrooms', listing.bedrooms],
    ['Bathrooms', listing.bathrooms],
    ...(listing.squareFeet !== null ? [['Size', `${listing.squareFeet.toLocaleString('en-CA')} sq ft`] as [string, string]] : []),
    ['Available from', listing.availableFrom ? formatDate(listing.availableFrom) : 'Ask the landlord'],
    ['Lease', listing.leaseTerm ?? 'Ask the landlord'],
    ['Furnished', yesNo(listing.furnished)],
    ['Pets allowed', yesNo(listing.petsAllowed)],
  ];

  const contact = (
    <div className="space-y-5 rounded-lg border bg-card p-5">
      <div>
        <p className="text-2xl font-semibold tabular-nums">
          ${listing.price.toLocaleString('en-CA')}
          <span className="text-base font-normal text-muted-foreground"> /month</span>
        </p>
        <p className={`mt-1 text-sm ${listing.isAvailable ? 'text-success' : 'text-muted-foreground'}`}>
          {listing.isAvailable
            ? listing.availableFrom
              ? `Available ${formatDate(listing.availableFrom)}`
              : 'Available now'
            : 'Not available right now'}
        </p>
      </div>
      {isOwner ? (
        <Button asChild variant="outline" className="w-full">
          <Link href={`/edit-listing/${listing.id}`}>Edit listing</Link>
        </Button>
      ) : (
        <MessageLandlord listingId={listing.id} userId={user?.id} />
      )}
      <Button variant="outline" className="w-full" onClick={toggle} aria-pressed={saved}>
        <Heart className={`mr-2 h-4 w-4 ${saved ? 'fill-primary text-primary' : ''}`} aria-hidden="true" />
        {saved ? 'Saved' : 'Save'}
      </Button>
      <div className="flex items-center gap-3 border-t pt-4">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-secondary text-sm font-semibold">
          {landlord?.avatarUrl ? (
            <img src={landlord.avatarUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            (landlord?.fullName ?? 'L').charAt(0)
          )}
        </span>
        <div className="min-w-0 text-sm">
          <p className="truncate font-medium">{landlord?.fullName ?? 'Landlord'}</p>
          {landlord && (
            <p className="text-muted-foreground">
              On LetMeKnock since {new Date(landlord.createdAt).toLocaleDateString('en-CA', { month: 'long', year: 'numeric' })}
            </p>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="page pb-28 pt-6 md:pb-16">
      <Link href="/listings" className="mb-5 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        All listings
      </Link>

      <header className="mb-6">
        <p className="eyebrow mb-2">
          {PROPERTY_TYPE_LABELS[listing.propertyType]}
          {listing.neighborhood && ` · ${listing.neighborhood}`}
        </p>
        <h1 className="text-3xl font-semibold leading-tight md:text-4xl">{listing.title}</h1>
        <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-muted-foreground">
          <span>{fullAddress}</span>
          {distanceKm !== null && campus && (
            <span className="inline-flex items-center gap-1 tabular-nums">
              <MapPin className="h-4 w-4" aria-hidden="true" />
              {formatDistance(distanceKm)} from {campus.shortName}
            </span>
          )}
        </p>
      </header>

      <div className="grid gap-10 lg:grid-cols-[1fr_20rem]">
        <div className="min-w-0 space-y-10">
          <Gallery listing={listing} />

          <section aria-labelledby="facts-heading">
            <h2 id="facts-heading" className="mb-4 text-xl font-semibold">
              The facts
            </h2>
            <dl className="grid grid-cols-2 border-t sm:grid-cols-3">
              {facts.map(([label, value]) => (
                <div key={label} className="border-b py-3 pr-4">
                  <dt className="eyebrow">{label}</dt>
                  <dd className="mt-1 tabular-nums">{value}</dd>
                </div>
              ))}
            </dl>
          </section>

          <section aria-labelledby="about-heading">
            <h2 id="about-heading" className="mb-3 text-xl font-semibold">
              About this place
            </h2>
            <p className="max-w-prose whitespace-pre-line leading-relaxed">{listing.detailedDescription ?? listing.description}</p>
          </section>

          {(listing.amenities.length > 0 || listing.utilitiesIncluded.length > 0) && (
            <section aria-labelledby="included-heading" className="grid gap-8 sm:grid-cols-2">
              <h2 id="included-heading" className="sr-only">
                What's included
              </h2>
              {[
                ['Amenities', listing.amenities],
                ['Utilities included', listing.utilitiesIncluded],
              ].map(([title, items]) =>
                (items as string[]).length > 0 ? (
                  <div key={title as string}>
                    <h3 className="mb-3 font-sans text-base font-semibold">{title}</h3>
                    <ul className="space-y-2">
                      {(items as string[]).map((item) => (
                        <li key={item} className="flex items-center gap-2.5">
                          <Check className="h-4 w-4 text-primary" aria-hidden="true" />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null,
              )}
            </section>
          )}

          <section aria-labelledby="location-heading">
            <h2 id="location-heading" className="mb-3 text-xl font-semibold">
              Where it is
            </h2>
            {place ? (
              <div className="relative z-0 aspect-[16/9] overflow-hidden rounded-lg border bg-muted sm:aspect-[2/1]">
                <Suspense fallback={null}>
                  <MiniMap place={place} price={listing.price} campus={campus} />
                </Suspense>
              </div>
            ) : (
              <p className="text-muted-foreground">We couldn't place this address on the map.</p>
            )}
            {listing.nearbyPlaces.length > 0 && (
              <>
                <h3 className="mb-2 mt-6 font-sans text-base font-semibold">Nearby</h3>
                <ul className="grid gap-1.5 text-muted-foreground sm:grid-cols-2">
                  {listing.nearbyPlaces.map((spot) => (
                    <li key={spot}>{spot}</li>
                  ))}
                </ul>
              </>
            )}
          </section>
        </div>

        <aside id="contact" className="scroll-mt-20 lg:sticky lg:top-20 lg:self-start" aria-label="Contact">
          {contact}
        </aside>
      </div>

      {/* On phones the price and the way to act stay in reach. */}
      <div className="fixed inset-x-0 bottom-0 z-40 flex items-center justify-between gap-4 border-t bg-background/95 px-4 py-3 backdrop-blur lg:hidden">
        <p className="font-semibold tabular-nums">
          ${listing.price.toLocaleString('en-CA')}
          <span className="text-sm font-normal text-muted-foreground"> /month</span>
        </p>
        <Button asChild>
          <a href="#contact">{isOwner ? 'Manage' : 'Message landlord'}</a>
        </Button>
      </div>
    </div>
  );
};

export default ListingDetail;
