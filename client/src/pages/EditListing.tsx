import { useEffect } from 'react';
import { useParams, useLocation } from 'wouter';
import { useAuth } from '@/contexts/AuthContext';
import { useListing } from '@/hooks/use-listings';
import CreateListingForm from '@/components/listings/CreateListingForm';
import { toast } from 'sonner';

const EditListing = () => {
  const { id } = useParams();
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { data: listing, isLoading } = useListing(id);

  useEffect(() => {
    if (!user) {
      setLocation('/signin');
      return;
    }

    if (!isLoading && !listing) {
      toast.error('Listing not found');
      setLocation('/profile/my-listings');
    }
  }, [user, listing, isLoading, setLocation]);

  if (!user) {
    return null;
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!listing) {
    return null;
  }

  if (listing.userId !== user.id) {
    toast.error('You do not have permission to edit this listing');
    setLocation('/profile/my-listings');
    return null;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Edit Listing</h1>
      <CreateListingForm initialData={listing} mode="edit" />
    </div>
  );
};

export default EditListing; 