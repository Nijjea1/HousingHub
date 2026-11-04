import { useState } from 'react';
import { Link } from 'wouter';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { useUserListings, useListingMutations } from '@/hooks/use-listings';
import { PROPERTY_TYPE_LABELS } from '@shared/schema';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

const MyListings = () => {
  const { user } = useAuth();
  const { data: userListings = [] } = useUserListings(user?.id);
  const { deleteListing } = useListingMutations();
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'price-low' | 'price-high'>('newest');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // useUserListings already scopes to this user, so we only filter by the search query
  const myListings = userListings.filter(listing =>
    searchQuery
      ? listing.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        listing.description.toLowerCase().includes(searchQuery.toLowerCase())
      : true
  );

  // Sort listings
  const sortedListings = [...myListings].sort((a, b) => {
    const aDate = new Date(String(a.createdAt || '1970-01-01')).getTime();
    const bDate = new Date(String(b.createdAt || '1970-01-01')).getTime();

    switch (sortBy) {
      case 'price-low':
        return a.price - b.price;
      case 'price-high':
        return b.price - a.price;
      case 'newest':
        return bDate - aDate;
      case 'oldest':
        return aDate - bDate;
      default:
        return 0;
    }
  });

  const handleDelete = async (listingId: string) => {
    if (!window.confirm('Are you sure you want to delete this listing?')) {
      return;
    }

    try {
      await deleteListing.mutateAsync(listingId);
      toast.success('Listing deleted successfully');
    } catch (error) {
      console.error('Delete error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to delete listing');
    }
  };

  const handleSortChange = (value: typeof sortBy) => {
    setSortBy(value);
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Please sign in</h2>
          <p className="text-gray-600 mb-4">You need to be signed in to view your listings</p>
          <Link href="/signin">
            <Button>Sign In</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900">My Listings</h1>
        <Link href="/create-listing">
          <Button>
            <i className="fas fa-plus mr-2"></i> Create New Listing
          </Button>
        </Link>
      </div>

      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mb-8">
        <div className="w-full sm:w-auto flex-1">
          <Input
            type="text"
            placeholder="Search your listings..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-4">
          <Select value={sortBy} onValueChange={handleSortChange}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Newest First</SelectItem>
              <SelectItem value="oldest">Oldest First</SelectItem>
              <SelectItem value="price-low">Price: Low to High</SelectItem>
              <SelectItem value="price-high">Price: High to Low</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex items-center space-x-2">
            <Button
              variant={viewMode === 'grid' ? 'default' : 'outline'}
              onClick={() => setViewMode('grid')}
            >
              <i className="fas fa-th-large"></i>
            </Button>
            <Button
              variant={viewMode === 'list' ? 'default' : 'outline'}
              onClick={() => setViewMode('list')}
            >
              <i className="fas fa-list"></i>
            </Button>
          </div>
        </div>
      </div>

      {sortedListings.length > 0 ? (
        <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6' : 'space-y-6'}>
          {sortedListings.map((listing, index) => (
            <motion.div
              key={listing.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.1 }}
              className="bg-white rounded-lg shadow-md overflow-hidden"
            >
              <div className="relative">
                {listing.images[0] && (
                  <img
                    src={listing.images[0]}
                    alt={listing.title}
                    className="w-full h-48 object-cover"
                  />
                )}
                <div className="absolute top-4 right-4 flex gap-2">
                  <Link href={`/edit-listing/${listing.id}`}>
                    <Button variant="outline" size="sm">
                      <i className="fas fa-edit"></i>
                    </Button>
                  </Link>
                  <Button 
                    variant="destructive" 
                    size="sm"
                    onClick={() => handleDelete(listing.id)}
                  >
                    <i className="fas fa-trash-alt"></i>
                  </Button>
                </div>
                <div className="absolute bottom-4 left-4">
                  <span className="px-3 py-1 rounded-full text-sm font-medium bg-primary-100 text-primary-800">
                    {PROPERTY_TYPE_LABELS[listing.propertyType]}
                  </span>
                </div>
              </div>
              
              <div className="p-4">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="text-lg font-semibold text-gray-900">{listing.title}</h3>
                  <p className="text-lg font-bold text-primary-600">${listing.price}/mo</p>
                </div>
                
                <p className="text-sm text-gray-600 mb-4">{listing.description}</p>

                <div className="flex items-center gap-4 text-sm text-gray-600 mb-4">
                  <span>{listing.bedrooms} {listing.bedrooms === 1 ? 'bed' : 'beds'}</span>
                  <span>•</span>
                  <span>{listing.bathrooms} {listing.bathrooms === 1 ? 'bath' : 'baths'}</span>
                  {listing.squareFeet && (
                    <>
                      <span>•</span>
                      <span>{listing.squareFeet} sq ft</span>
                    </>
                  )}
                </div>
                
                <div className="flex flex-wrap gap-2 mb-4">
                  {listing.amenities.slice(0, 4).map((amenity) => (
                    <span
                      key={amenity}
                      className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800"
                    >
                      {amenity}
                    </span>
                  ))}
                  {listing.amenities.length > 4 && (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                      +{listing.amenities.length - 4} more
                    </span>
                  )}
                </div>

                <div className="flex justify-between items-center">
                  <Link href={`/listings/${listing.id}`}>
                    <Button variant="outline">View Details</Button>
                  </Link>
                  <span className="text-sm text-gray-500">
                    Posted {new Date(String(listing.createdAt || '1970-01-01')).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <i className="fas fa-home text-2xl text-gray-400"></i>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No listings yet</h3>
          <p className="text-gray-500 mb-4">Create your first listing to start renting out your property</p>
          <Link href="/create-listing">
            <Button>Create Your First Listing</Button>
          </Link>
        </div>
      )}
    </div>
  );
};

export default MyListings; 