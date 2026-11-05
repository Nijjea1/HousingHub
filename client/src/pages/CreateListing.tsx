import CreateListingForm from '@/components/listings/CreateListingForm';
import RequireAuth from '@/components/RequireAuth';

const CreateListing = () => (
  <RequireAuth reason="post a listing">
    {() => (
      <div className="page py-8 md:py-12">
        <CreateListingForm />
      </div>
    )}
  </RequireAuth>
);

export default CreateListing;
