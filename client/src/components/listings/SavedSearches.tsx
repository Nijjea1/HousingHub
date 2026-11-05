import { useState } from 'react';
import { Link } from 'wouter';
import { Bookmark, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useSavedSearchMutations, useSavedSearches } from '@/hooks/use-saved-searches';
import { ApiError } from '@/lib/api';
import { signInHref } from '@/lib/redirect';
import type { SearchParams } from '@shared/schema';

interface SavedSearchesProps {
  userId: string | undefined;
  params: SearchParams;
  onApply: (params: SearchParams) => void;
}

/** Save the current search under a name, or jump back to one you saved earlier. */
const SavedSearches = ({ userId, params, onApply }: SavedSearchesProps) => {
  const { data: saved = [] } = useSavedSearches(userId);
  const { save, remove } = useSavedSearchMutations();
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);

  if (!userId) {
    return (
      <Button asChild variant="outline" className="h-9 px-3">
        <Link href={signInHref('/listings')}>
          <Bookmark className="mr-2 h-4 w-4" aria-hidden="true" />
          Save search
        </Link>
      </Button>
    );
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      const { limit: _limit, ...searchWithoutLimit } = params;
      await save.mutateAsync({ name, params: searchWithoutLimit });
      setName('');
    } catch (err) {
      setError(err instanceof ApiError ? (err.fields?.name?.[0] ?? err.message) : 'Could not save this search');
    }
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" className="h-9 px-3">
          <Bookmark className="mr-2 h-4 w-4" aria-hidden="true" />
          Saved searches
          {saved.length > 0 && <span className="ml-1.5 tabular-nums text-muted-foreground">({saved.length})</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 space-y-4">
        <form onSubmit={submit} className="space-y-2">
          <label htmlFor="saved-search-name" className="text-sm font-medium">
            Save this search
          </label>
          <div className="flex gap-2">
            <Input id="saved-search-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={80} placeholder="e.g. Under $900, near campus" />
            <Button type="submit" disabled={save.isPending || name.trim() === ''}>
              Save
            </Button>
          </div>
          {error && (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          )}
        </form>
        {saved.length > 0 ? (
          <ul className="max-h-60 space-y-1 overflow-y-auto">
            {saved.map((search) => (
              <li key={search.id} className="flex items-center gap-1">
                <button
                  type="button"
                  className="flex-1 truncate rounded px-2 py-1.5 text-left text-sm hover:bg-muted"
                  onClick={() => onApply({ ...search.params, limit: params.limit })}
                >
                  {search.name}
                </button>
                <button
                  type="button"
                  aria-label={`Delete ${search.name}`}
                  className="rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                  onClick={() => remove.mutate(search.id)}
                >
                  <X className="h-4 w-4" aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">Nothing saved yet.</p>
        )}
      </PopoverContent>
    </Popover>
  );
};

export default SavedSearches;
