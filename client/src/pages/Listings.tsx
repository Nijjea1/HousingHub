import { useMemo, useState } from 'react';
import ListingCard from '@/components/listings/ListingCard';
import ListingsFilters from '@/components/listings/ListingsFilters';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useListings } from '@/hooks/use-listings';
import { applyFilters } from '@shared/filters';
import { DEFAULT_LISTING_FILTERS, type ListingFilters } from '@shared/schema';

const Listings = () => {
  const { data: listings, isLoading, error, refetch } = useListings();
  const [filters, setFilters] = useState<ListingFilters>(DEFAULT_LISTING_FILTERS);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const visible = useMemo(() => applyFilters(listings ?? [], filters), [listings, filters]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Couldn't load listings</h2>
          <p className="text-gray-600 mb-4">{error.message}</p>
          <Button onClick={() => refetch()}>Try again</Button>
        </div>
      </div>
    );
  }

  const hasListings = (listings?.length ?? 0) > 0;

  return (
    <div className="min-h-screen bg-gray-50 pt-24 pb-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row gap-8">
          <div className="w-full md:w-1/3 md:max-w-sm">
            <ListingsFilters value={filters} onChange={setFilters} />
          </div>

          <div className="flex-1">
            <div className="flex items-center justify-between mb-8">
              <p className="text-sm text-gray-600">
                {visible.length} {visible.length === 1 ? 'place' : 'places'}
              </p>
              <div className="flex items-center space-x-2">
                <Button
                  variant={viewMode === 'grid' ? 'default' : 'outline'}
                  onClick={() => setViewMode('grid')}
                  aria-label="Grid view"
                >
                  <i className="fas fa-th-large"></i>
                </Button>
                <Button
                  variant={viewMode === 'list' ? 'default' : 'outline'}
                  onClick={() => setViewMode('list')}
                  aria-label="List view"
                >
                  <i className="fas fa-list"></i>
                </Button>
              </div>
            </div>

            {filters.amenities.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-8">
                {filters.amenities.map((amenity) => (
                  <Badge
                    key={amenity}
                    variant="secondary"
                    className="cursor-pointer"
                    onClick={() =>
                      setFilters({ ...filters, amenities: filters.amenities.filter((a) => a !== amenity) })
                    }
                  >
                    {amenity} <i className="fas fa-times ml-1"></i>
                  </Badge>
                ))}
              </div>
            )}

            <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 gap-6' : 'space-y-6'}>
              {visible.map((listing, index) => (
                <ListingCard key={listing.id} listing={listing} index={index} />
              ))}
            </div>

            {visible.length === 0 && (
              <div className="text-center py-12">
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  {hasListings ? 'No listings match your filters' : 'No listings yet'}
                </h3>
                <p className="text-gray-500">
                  {hasListings ? 'Try widening your filters.' : 'Check back soon.'}
                </p>
                {hasListings && (
                  <Button variant="outline" className="mt-4" onClick={() => setFilters(DEFAULT_LISTING_FILTERS)}>
                    Reset filters
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Listings;
