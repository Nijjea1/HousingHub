import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import type { Review, ReviewInput } from '@shared/schema';

interface ReviewList {
  reviews: Review[];
  count: number;
  average: number | null;
}

export function useReviews(listingId: string | undefined) {
  return useQuery({
    queryKey: ['reviews', listingId],
    enabled: !!listingId,
    queryFn: () => apiFetch<ReviewList>(`/listings/${listingId}/reviews`),
  });
}

export function useAddReview(listingId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: ReviewInput) => apiFetch<{ review: Review }>(`/listings/${listingId}/reviews`, { method: 'POST', body: input }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['reviews', listingId] }),
  });
}
