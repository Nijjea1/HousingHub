import { useState } from 'react';
import { Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ApiError, apiFetch } from '@/lib/api';
import { DEFAULT_SEARCH_LIMIT, MAX_DESCRIPTION_LENGTH, type ParsedSearch, type SearchParams, type University } from '@shared/schema';

const EXAMPLE = '2 bedroom under $900 within 2 km of campus';

interface DescribeSearchProps {
  campus: University | null;
  onSearch: (next: SearchParams) => void;
  /** Larger on the home page, where it is the main thing to do. */
  size?: 'default' | 'large';
  /** Example searches shown under the box; tapping one runs it. */
  examples?: string[];
}

/** "Describe your place": a sentence becomes a fresh search, measured from the user's campus. */
const DescribeSearch = ({ campus, onSearch, size = 'default', examples = [] }: DescribeSearchProps) => {
  const large = size === 'large';
  const [query, setQuery] = useState('');
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    run(query);
  };

  const run = async (text: string) => {
    setMessage(null);
    setPending(true);
    try {
      const parsed = await apiFetch<ParsedSearch>('/search/parse', { method: 'POST', body: { query: text } });
      if (parsed.understood.length === 0) {
        setMessage(`We couldn't find any filters in that. Try something like "${EXAMPLE}".`);
        return;
      }
      const center = parsed.radiusKm !== null && campus ? { latitude: campus.latitude, longitude: campus.longitude } : null;
      onSearch({ center, radiusKm: center ? parsed.radiusKm : null, filters: parsed.filters, limit: DEFAULT_SEARCH_LIMIT });
    } catch (err) {
      setMessage(err instanceof ApiError ? (err.fields?.query?.[0] ?? err.message) : 'Search is unavailable right now.');
    } finally {
      setPending(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-2" role="search">
      <label htmlFor="describe-place" className={large ? 'eyebrow block' : 'block text-sm font-medium'}>
        Describe your place
      </label>
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <Input
            id="describe-place"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={`e.g. ${EXAMPLE}`}
            maxLength={MAX_DESCRIPTION_LENGTH}
            aria-describedby={message ? 'describe-place-message' : undefined}
            className={`bg-card pl-9 ${large ? 'h-12 text-base' : ''}`}
          />
        </div>
        <Button type="submit" className={large ? 'h-12 px-6' : ''} disabled={pending || !query.trim()}>
          {pending ? 'Searching' : 'Search'}
        </Button>
      </div>
      {examples.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 pt-1 text-sm">
          <span className="text-muted-foreground">Try</span>
          {examples.map((example) => (
            <button
              key={example}
              type="button"
              disabled={pending}
              onClick={() => {
                setQuery(example);
                run(example);
              }}
              className="rounded-full border bg-card px-3 py-1 hover:border-foreground/30"
            >
              {example}
            </button>
          ))}
        </div>
      )}
      {message && (
        <p id="describe-place-message" className="text-sm text-muted-foreground" role="status">
          {message}
        </p>
      )}
    </form>
  );
};

export default DescribeSearch;
