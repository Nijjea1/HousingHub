import { Link, useParams } from 'wouter';
import type { User } from '@supabase/supabase-js';
import CreateListingForm from '@/components/listings/CreateListingForm';
import RequireAuth, { PageSpinner } from '@/components/RequireAuth';
import { Button } from '@/components/ui/button';
import { useListing } from '@/hooks/use-listings';

const Message = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div className="page py-16 text-center">
    <h1 className="mb-2 text-2xl font-semibold">{title}</h1>
    {children}
  </div>
);

function EditListingPage({ user }: { user: User }) {
  const { id } = useParams<{ id: string }>();
  const { data: listing, isLoading, error, refetch } = useListing(id);

  if (isLoading) return <PageSpinner label="Loading listing" />;
  if (error) {
    return (
      <Message title="Couldn't load this listing">
        <p className="text-muted-foreground mb-6">{error.message}</p>
        <Button onClick={() => refetch()}>Try again</Button>
      </Message>
    );
  }
  if (!listing || listing.userId !== user.id) {
    return (
      <Message title={listing ? "This isn't your listing" : 'Listing not found'}>
        <p className="text-muted-foreground mb-6">You can only edit listings you posted.</p>
        <Button asChild>
          <Link href="/profile/my-listings">Go to my listings</Link>
        </Button>
      </Message>
    );
  }

  return (
    <div className="page py-8 md:py-12">
      <CreateListingForm initialData={listing} mode="edit" />
    </div>
  );
}

const EditListing = () => <RequireAuth reason="edit your listing">{(user) => <EditListingPage user={user} />}</RequireAuth>;

export default EditListing;
