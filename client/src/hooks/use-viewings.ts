import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import type { ViewingRequest, ViewingRequestInput } from '@shared/schema';

/** Viewing requests the user made as a student and requests for listings they own, soonest first. */
export function useViewings(userId: string | undefined) {
  return useQuery({
    queryKey: ['viewings', userId],
    enabled: !!userId,
    queryFn: async () => (await apiFetch<{ viewingRequests: ViewingRequest[] }>('/viewings')).viewingRequests,
  });
}

export function useRequestViewing(listingId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: ViewingRequestInput) =>
      apiFetch<{ viewingRequest: ViewingRequest }>(`/listings/${listingId}/viewings`, { method: 'POST', body: input }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['viewings'] }),
  });
}

export function useAnswerViewing() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'accepted' | 'declined' }) =>
      apiFetch<{ viewingRequest: ViewingRequest }>(`/viewings/${id}`, { method: 'PATCH', body: { status } }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['viewings'] }),
  });
}
