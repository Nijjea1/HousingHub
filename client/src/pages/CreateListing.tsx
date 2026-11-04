import { useAuth } from '@/contexts/AuthContext';
import { useLocation } from 'wouter';
import CreateListingForm from '@/components/listings/CreateListingForm';

const CreateListing = () => {
  const { user } = useAuth();
  const [, setLocation] = useLocation();

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Please sign in to create a listing</h1>
        <button
          onClick={() => setLocation('/signin')}
          className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
        >
          Sign In
        </button>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Create New Listing</h1>
      <CreateListingForm />
    </div>
  );
};

export default CreateListing; 