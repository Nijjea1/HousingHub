import { useState } from 'react';
import { LayoutGrid, Rows3, SlidersHorizontal } from 'lucide-react';
import DescribeSearch from '@/components/listings/DescribeSearch';
import ListingCard, { CardSkeleton } from '@/components/listings/ListingCard';
import ListingsFilters from '@/components/listings/ListingsFilters';
import SearchChips from '@/components/listings/SearchChips';
import SearchToolbar from '@/components/listings/SearchToolbar';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { useCampus } from '@/hooks/use-campus';
import { useSearchResults } from '@/hooks/use-listings';
import { useSearchUrl } from '@/hooks/use-search-url';
import { SORT_LABELS, searchChips } from '@/lib/chips';
import { distanceOrigin, withCampusCenter } from '@/lib/map';
import { DEFAULT_SEARCH_PARAMS, type SortOption } from '@shared/schema';

const Listings = () => {
  const [params, setParams] = useSearchUrl();
  const { campus, ready: campusReady } = useCampus();
  const [layout, setLayout] = useState<'grid' | 'list'>('grid');
  const [filtersOpen, setFiltersOpen] = useState(false);
  // The API filters and sorts; each change to the URL is a new request.
  // isPending, not isLoading: a query waiting on the campus is disabled, and disabled queries never "load".
  const { data: results = [], isPending: isLoading, error, refetch } = useSearchResults(withCampusCenter(params, campus), { enabled: campusReady });
  const { filters } = params;
  const origin = distanceOrigin(params, campus);
  const filtering = JSON.stringify(params) !== JSON.stringify(DEFAULT_SEARCH_PARAMS);
  const activeCount = searchChips(params, origin).length;
  const setFilters = (next: typeof filters) => setParams({ ...params, filters: next });
  const sortSelect = (
    <Select value={filters.sortBy} onValueChange={(sortBy) => setFilters({ ...filters, sortBy: sortBy as SortOption })}>
      <SelectTrigger className="h-9 w-full sm:w-auto sm:min-w-[10rem]" aria-label="Sort by">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {Object.entries(SORT_LABELS).map(([option, label]) => (
          <SelectItem key={option} value={option}>
            {label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
  const gridClass = layout === 'grid' ? 'grid gap-5 sm:grid-cols-2 xl:grid-cols-3' : 'flex flex-col gap-4';

  return (
    <div className="page py-8 md:py-10">
      <header className="mb-6 max-w-2xl space-y-1">
        <h1 className="text-3xl font-semibold md:text-4xl">Places to rent</h1>
        <p className="text-muted-foreground">
          Rooms, apartments and houses near {campus?.name ?? 'campus'}, posted by landlords.
        </p>
      </header>

      <div className="mb-8 max-w-2xl">
        <DescribeSearch campus={campus} onSearch={setParams} />
      </div>

      <div className="flex gap-10">
        <aside className="hidden w-60 shrink-0 lg:block" aria-label="Filters">
          <div className="sticky top-20 max-h-[calc(100vh-6rem)] overflow-y-auto pb-6 pr-1">
            <ListingsFilters value={filters} onChange={setFilters} />
          </div>
        </aside>

        <section className="min-w-0 flex-1 space-y-4" aria-label="Results">
          <SearchToolbar params={params} onChange={setParams} campus={campus} count={results.length} view="list">
            <Sheet open={filtersOpen} onOpenChange={setFiltersOpen}>
              <SheetTrigger asChild>
                <Button variant="outline" className="h-9 px-3 lg:hidden">
                  <SlidersHorizontal className="mr-2 h-4 w-4" aria-hidden="true" />
                  Filters
                  {activeCount > 0 && <span className="ml-1.5 tabular-nums text-muted-foreground">({activeCount})</span>}
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-[85vw] max-w-sm overflow-y-auto">
                <SheetHeader className="mb-4 text-left">
                  <SheetTitle>Filters</SheetTitle>
                </SheetHeader>
                <div className="mb-5 space-y-2">
                  <p className="eyebrow">Sort</p>
                  {sortSelect}
                </div>
                <ListingsFilters value={filters} onChange={setFilters} />
                <Button className="mt-6 w-full" onClick={() => setFiltersOpen(false)}>
                  Show {results.length} {results.length === 1 ? 'place' : 'places'}
                </Button>
              </SheetContent>
            </Sheet>
            <div className="hidden sm:block">{sortSelect}</div>
            <div className="hidden rounded-md bg-muted p-0.5 sm:flex" role="group" aria-label="Layout">
              {(
                [
                  ['grid', 'Grid layout', LayoutGrid],
                  ['list', 'List layout', Rows3],
                ] as const
              ).map(([value, label, Icon]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setLayout(value)}
                  aria-label={label}
                  aria-pressed={layout === value}
                  className={`inline-flex h-8 w-8 items-center justify-center rounded ${
                    layout === value ? 'bg-background shadow-sm' : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <Icon className="h-4 w-4" aria-hidden="true" />
                </button>
              ))}
            </div>
          </SearchToolbar>

          <SearchChips params={params} origin={origin} onChange={setParams} />

          {error ? (
            <div className="rounded-lg border bg-card p-8 text-center" role="alert">
              <h2 className="mb-2 text-xl font-semibold">Couldn't load listings</h2>
              <p className="mb-4 text-muted-foreground">{error.message}</p>
              <Button onClick={() => refetch()}>Try again</Button>
            </div>
          ) : isLoading ? (
            <div className={gridClass} role="status" aria-label="Loading listings">
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <CardSkeleton key={i} />
              ))}
            </div>
          ) : results.length === 0 ? (
            <div className="rounded-lg border border-dashed px-6 py-16 text-center">
              <h2 className="mb-2 text-xl font-semibold">{filtering ? 'Nothing matches that search' : 'No listings yet'}</h2>
              <p className="text-muted-foreground">{filtering ? 'Try a wider distance or fewer filters.' : 'Check back soon.'}</p>
              {filtering && (
                <Button variant="outline" className="mt-5" onClick={() => setParams(DEFAULT_SEARCH_PARAMS)}>
                  Reset search
                </Button>
              )}
            </div>
          ) : (
            <div className={gridClass}>
              {results.map(({ listing, distanceKm }) => (
                <ListingCard
                  key={listing.id}
                  listing={listing}
                  layout={layout}
                  distance={distanceKm === null ? null : { km: distanceKm, from: origin }}
                />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

export default Listings;
