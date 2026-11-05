import { Link } from 'wouter';
import { List, Map as MapIcon } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DISTANCE_CHOICES_KM, samePlace } from '@/lib/map';
import { searchToQuery } from '@shared/search';
import type { SearchParams, University } from '@shared/schema';

interface SearchToolbarProps {
  params: SearchParams;
  onChange: (next: SearchParams) => void;
  campus: University | null;
  count: number;
  view: 'list' | 'map';
  children?: React.ReactNode;
}

/** Result count, distance from campus, and the list/map switch. Both views read the same URL. */
const SearchToolbar = ({ params, onChange, campus, count, view, children }: SearchToolbarProps) => {
  const campusPoint = campus ? { latitude: campus.latitude, longitude: campus.longitude } : null;
  const fromCampus = !params.center || (campusPoint !== null && samePlace(params.center, campusPoint));
  // A center set by "search this area" on the map isn't one of the campus choices.
  const value = !fromCampus ? 'area' : params.radiusKm === null ? 'any' : String(params.radiusKm);

  const choose = (choice: string) => {
    if (choice === 'any') onChange({ ...params, center: null, radiusKm: null });
    else if (choice !== 'area' && campusPoint) onChange({ ...params, center: campusPoint, radiusKm: Number(choice) });
  };

  const query = searchToQuery(params).toString();
  const href = (path: string) => (query ? `${path}?${query}` : path);
  const tab = (active: boolean) =>
    `inline-flex h-8 items-center gap-1.5 rounded px-2.5 text-sm ${active ? 'bg-background font-medium shadow-sm' : 'text-muted-foreground hover:text-foreground'}`;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <p className="w-full text-sm text-muted-foreground tabular-nums sm:mr-auto sm:w-auto" aria-live="polite">
        {count} {count === 1 ? 'place' : 'places'}
      </p>
      <Select value={value} onValueChange={choose} disabled={!campus}>
        <SelectTrigger className="h-9 w-auto min-w-[8.5rem] sm:min-w-[11rem]" aria-label="Distance">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="any">Any distance</SelectItem>
          {DISTANCE_CHOICES_KM.map((km) => (
            <SelectItem key={km} value={String(km)}>
              Within {km} km of {campus?.shortName ?? 'campus'}
            </SelectItem>
          ))}
          {value === 'area' && <SelectItem value="area">Map area ({params.radiusKm ?? 'any'} km)</SelectItem>}
        </SelectContent>
      </Select>
      {children}
      <div className="flex rounded-md bg-muted p-0.5" role="group" aria-label="View">
        <Link href={href('/listings')} className={tab(view === 'list')} aria-current={view === 'list' ? 'page' : undefined}>
          <List className="h-3.5 w-3.5" aria-hidden="true" />
          <span className="sr-only sm:not-sr-only">List</span>
        </Link>
        <Link href={href('/map')} className={tab(view === 'map')} aria-current={view === 'map' ? 'page' : undefined}>
          <MapIcon className="h-3.5 w-3.5" aria-hidden="true" />
          <span className="sr-only sm:not-sr-only">Map</span>
        </Link>
      </div>
    </div>
  );
};

export default SearchToolbar;
