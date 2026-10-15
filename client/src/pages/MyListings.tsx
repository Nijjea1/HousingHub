import { useState } from 'react';
import { Link } from 'wouter';
import { toast } from 'sonner';
import type { User } from '@supabase/supabase-js';
import { Plus, TriangleAlert } from 'lucide-react';
import ListingCover from '@/components/listings/ListingCover';
import { listingFacts } from '@/components/listings/ListingCard';
import RequireAuth from '@/components/RequireAuth';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useListingMutations, useUserListings } from '@/hooks/use-listings';
import { LISTING_IMAGES_BUCKET, removeImages } from '@/lib/storage';
import type { Listing } from '@shared/schema';

type SortOption = 'newest' | 'oldest' | 'price-low' | 'price-high';

const compare: Record<SortOption, (a: Listing, b: Listing) => number> = {
  newest: (a, b) => b.createdAt.localeCompare(a.createdAt),
  oldest: (a, b) => a.createdAt.localeCompare(b.createdAt),
  'price-low': (a, b) => a.price - b.price,
  'price-high': (a, b) => b.price - a.price,
};

function MyListingsPage({ user }: { user: User }) {
  const { data: listings, isLoading, error, refetch } = useUserListings(user.id);
  const { deleteListing } = useListingMutations();
  const [query, setQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('newest');
  const [toDelete, setToDelete] = useState<Listing | null>(null);

  if (isLoading) {
    return (
      <div className="page py-8 md:py-10" role="status" aria-label="Loading your listings">
        <Skeleton className="mb-8 h-10 w-56" />
        <div className="divide-y rounded-lg border">
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex gap-4 p-4">
              <Skeleton className="h-20 w-28" />
              <div className="flex-1 space-y-2 py-1">
                <Skeleton className="h-5 w-1/2" />
                <Skeleton className="h-4 w-1/3" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const q = query.trim().toLowerCase();
  const shown = (listings ?? [])
    .filter((l) => !q || l.title.toLowerCase().includes(q) || l.address.toLowerCase().includes(q))
    .sort(compare[sortBy]);

  const confirmDelete = async () => {
    if (!toDelete) return;
    try {
      await deleteListing.mutateAsync(toDelete.id);
      void removeImages(toDelete.images, LISTING_IMAGES_BUCKET);
      toast.success('Listing deleted');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not delete the listing');
    } finally {
      setToDelete(null);
    }
  };

  return (
    <div className="page py-8 md:py-10">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow mb-2">Landlord</p>
          <h1 className="text-3xl font-semibold">My listings</h1>
        </div>
        <Button asChild>
          <Link href="/create-listing">
            <Plus className="mr-1.5 h-4 w-4" aria-hidden="true" />
            New listing
          </Link>
        </Button>
      </div>

      {error ? (
        <div className="rounded-lg border bg-card p-8 text-center" role="alert">
          <h2 className="mb-2 text-xl font-semibold">Couldn't load your listings</h2>
          <p className="mb-4 text-muted-foreground">{error.message}</p>
          <Button onClick={() => refetch()}>Try again</Button>
        </div>
      ) : listings && listings.length > 0 ? (
        <>
          <div className="mb-4 flex flex-col gap-3 sm:flex-row">
            <Input
              className="bg-card sm:max-w-sm"
              placeholder="Search by title or address"
              aria-label="Search your listings"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <Select value={sortBy} onValueChange={(v: SortOption) => setSortBy(v)}>
              <SelectTrigger className="w-[200px] bg-card" aria-label="Sort by">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">Newest first</SelectItem>
                <SelectItem value="oldest">Oldest first</SelectItem>
                <SelectItem value="price-low">Price: low to high</SelectItem>
                <SelectItem value="price-high">Price: high to low</SelectItem>
              </SelectContent>
            </Select>
            <p className="self-center text-sm text-muted-foreground tabular-nums sm:ml-auto">
              {listings.length} {listings.length === 1 ? 'listing' : 'listings'}
            </p>
          </div>

          {shown.length === 0 && <p className="py-6 text-muted-foreground">No listings match "{query}".</p>}
          <ul className="divide-y rounded-lg border bg-card">
            {shown.map((listing) => (
              <li key={listing.id} className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center">
                <div className="h-20 w-full shrink-0 overflow-hidden rounded-md sm:w-28">
                  <ListingCover listing={listing} size="thumb" />
                </div>
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link href={`/listings/${listing.id}`} className="font-medium hover:text-primary">
                      {listing.title}
                    </Link>
                    {!listing.isAvailable && (
                      <span className="rounded border px-1.5 py-0.5 text-xs text-muted-foreground">Hidden from search</span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {listing.address}, {listing.city} · {listingFacts(listing)}
                  </p>
                  <p className="text-xs text-muted-foreground">Posted {new Date(listing.createdAt).toLocaleDateString('en-CA', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
                  {listing.latitude === null && (
                    <p className="flex items-start gap-1.5 text-sm text-destructive">
                      <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                      We couldn't find this address on the map, so it won't appear in distance searches. Check the street name and save again.
                    </p>
                  )}
                </div>
                <p className="shrink-0 font-semibold tabular-nums sm:w-24 sm:text-right">${listing.price.toLocaleString('en-CA')}/mo</p>
                <div className="flex shrink-0 gap-2">
                  <Button asChild variant="outline" size="sm">
                    <Link href={`/edit-listing/${listing.id}`}>Edit</Link>
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                    onClick={() => setToDelete(listing)}
                  >
                    Delete
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </>
      ) : (
        <div className="rounded-lg border border-dashed px-6 py-16 text-center">
          <h2 className="mb-2 text-xl font-semibold">No listings yet</h2>
          <p className="mb-5 text-muted-foreground">Post your first place to start hearing from students.</p>
          <Button asChild>
            <Link href="/create-listing">Post a listing</Link>
          </Button>
        </div>
      )}

      <AlertDialog open={toDelete !== null} onOpenChange={(open) => !open && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this listing?</AlertDialogTitle>
            <AlertDialogDescription>
              "{toDelete?.title}" and its conversations will be removed. This can't be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={confirmDelete}>
              Delete listing
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

const MyListings = () => <RequireAuth reason="manage your listings">{(user) => <MyListingsPage user={user} />}</RequireAuth>;

export default MyListings;
