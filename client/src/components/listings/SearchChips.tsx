import { X } from 'lucide-react';
import { searchChips } from '@/lib/chips';
import { DEFAULT_SEARCH_PARAMS, type SearchParams } from '@shared/schema';

interface SearchChipsProps {
  params: SearchParams;
  origin: string;
  onChange: (next: SearchParams) => void;
}

/** One removable chip per active filter, plus "Clear all". */
const SearchChips = ({ params, origin, onChange }: SearchChipsProps) => {
  const chips = searchChips(params, origin);
  if (chips.length === 0) return null;
  return (
    <ul className="flex flex-wrap items-center gap-2" aria-label="Active filters">
      {chips.map((chip) => (
        <li key={chip.id}>
          <button
            type="button"
            onClick={() => onChange(chip.without)}
            className="inline-flex items-center gap-1.5 rounded-full border bg-card py-1 pl-3 pr-2 text-sm hover:border-foreground/30"
            aria-label={`Remove ${chip.label}`}
          >
            {chip.label}
            <X className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
          </button>
        </li>
      ))}
      <li>
        <button
          type="button"
          className="px-1 text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
          onClick={() => onChange(DEFAULT_SEARCH_PARAMS)}
        >
          Clear all
        </button>
      </li>
    </ul>
  );
};

export default SearchChips;
