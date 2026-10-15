import { useCallback, useMemo } from 'react';
import { useLocation, useSearch } from 'wouter';
import { searchFromQueryString, searchToQuery } from '@shared/search';
import type { SearchParams } from '@shared/schema';

/**
 * The current search, kept in the page URL so it survives a refresh, can be shared,
 * and carries over between the list and the map.
 */
export function useSearchUrl(): [SearchParams, (next: SearchParams) => void] {
  const queryString = useSearch();
  const [location, navigate] = useLocation();
  const params = useMemo(() => searchFromQueryString(queryString), [queryString]);

  const setParams = useCallback(
    (next: SearchParams) => {
      const query = searchToQuery(next).toString();
      // replace: filter tweaks shouldn't fill the back button history.
      navigate(query ? `${location}?${query}` : location, { replace: true });
    },
    [location, navigate],
  );

  return [params, setParams];
}
