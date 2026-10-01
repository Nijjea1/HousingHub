import { useState } from 'react';
import { useRoute, Link } from 'wouter';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/AuthContext';
import { useFavoritesContext } from '@/hooks/use-favorites';
import { useListing } from '@/hooks/use-listings';
import { useProfile } from '@/hooks/use-user-profile';
import { PROPERTY_TYPE_LABELS, PROVINCES } from '@shared/schema';

// Date-only strings parse as UTC midnight, which is the previous day in Ontario.
const formatDate = (isoDate: string) =>
  new Date(`${isoDate}T00:00:00`).toLocaleDateString('en-CA', { month: 'long', day: 'numeric', year: 'numeric' });

const Centered = ({ children }: { children: React.ReactNode }) => (
  <div className="pt-32 pb-20 flex flex-col justify-center items-center min-h-screen bg-gray-50">
    <div className="text-center max-w-md px-4">{children}</div>
  </div>
);

const DetailRow = ({ label, value }: { label: string; value: React.ReactNode }) => (
  <div>
    <h3 className="text-sm font-medium text-gray-500">{label}</h3>
    <p className="mt-1 text-gray-900">{value}</p>
  </div>
);

const ListingDetail = () => {
  const [, params] = useRoute('/listings/:id');
  const { user } = useAuth();
  const { data: listing, isLoading, error, refetch } = useListing(params?.id);
  const { data: landlord } = useProfile(listing?.userId);
  const { isFavorite, addFavorite, removeFavorite } = useFavoritesContext();
  const [activeImage, setActiveImage] = useState(0);

  if (isLoading) {
    return (
      <Centered>
        <div className="w-16 h-16 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin mx-auto"></div>
        <p className="mt-4 text-gray-600">Loading listing...</p>
      </Centered>
    );
  }

  if (error) {
    return (
      <Centered>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Couldn't load this listing</h1>
        <p className="text-gray-600 mb-8">{error.message}</p>
        <Button onClick={() => refetch()}>Try again</Button>
      </Centered>
    );
  }

  if (!listing) {
    return (
      <Centered>
        <div className="w-20 h-20 mx-auto mb-6 bg-gray-100 rounded-full flex items-center justify-center">
          <i className="fas fa-home text-gray-400 text-3xl"></i>
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Listing not found</h1>
        <p className="text-gray-600 mb-8">This listing doesn't exist or has been removed.</p>
        <Link href="/listings">
          <Button>View all listings</Button>
        </Link>
      </Centered>
    );
  }

  const images = listing.images;
  const shownImage = images[Math.min(activeImage, images.length - 1)];
  const step = (delta: number) => setActiveImage((i) => (i + delta + images.length) % images.length);
  const typeLabel = PROPERTY_TYPE_LABELS[listing.propertyType];
  const fullAddress = `${listing.address}, ${listing.city}, ${PROVINCES[listing.province] ?? listing.province} ${listing.postalCode}`;
  const bathroomText = `${listing.bathrooms} ${listing.bathrooms === 1 ? 'bathroom' : 'bathrooms'}`;
  const isOwner = user?.id === listing.userId;
  const saved = isFavorite(listing.id);

  const toggleFavorite = async () => {
    try {
      if (saved) {
        await removeFavorite(listing.id);
        toast.success('Removed from favorites');
      } else {
        await addFavorite(listing.id);
        toast.success('Added to favorites');
      }
    } catch {
      toast.error(user ? 'Failed to update favorites' : 'Sign in to save listings');
    }
  };

  return (
    <div className="pt-32 pb-20 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <nav className="mb-4">
          <ol className="flex items-center space-x-2 text-sm text-gray-500">
            <li>
              <Link href="/listings" className="hover:text-primary-700">Listings</Link>
            </li>
            <li><i className="fas fa-chevron-right text-xs"></i></li>
            <li className="text-primary-700 font-medium truncate max-w-[240px]">{listing.title}</li>
          </ol>
        </nav>

        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{listing.title}</h1>
              <p className="text-lg text-gray-600 mt-1">{fullAddress}</p>
            </div>
            <div className="flex flex-col md:items-end">
              <div className="text-3xl font-bold text-primary-700">
                ${listing.price}
                <span className="text-lg font-normal text-gray-500">/month</span>
              </div>
              <div className="flex items-center mt-1 space-x-2">
                <span className="bg-primary-100 text-primary-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
                  {typeLabel}
                </span>
                {listing.availableFrom && (
                  <span className="bg-green-100 text-green-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
                    Available {formatDate(listing.availableFrom)}
                  </span>
                )}
                {!listing.isAvailable && (
                  <span className="bg-gray-200 text-gray-700 text-xs font-medium px-2.5 py-0.5 rounded-full">
                    Not available
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2">
            <div className="bg-white rounded-xl shadow-sm overflow-hidden mb-6">
              <div className="relative h-96 bg-gray-100">
                {shownImage ? (
                  <img src={shownImage} alt={listing.title} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-400">
                    <i className="fas fa-home text-6xl"></i>
                  </div>
                )}
                <button
                  type="button"
                  onClick={toggleFavorite}
                  aria-label={saved ? 'Remove from favorites' : 'Add to favorites'}
                  className="absolute top-4 right-4 bg-white w-10 h-10 rounded-full flex items-center justify-center shadow-lg hover:bg-gray-50 transition-colors"
                >
                  <i className={`${saved ? 'fas text-red-500' : 'far text-gray-600'} fa-heart`}></i>
                </button>
                {images.length > 1 && (
                  <>
                    <button
                      type="button"
                      aria-label="Previous photo"
                      onClick={() => step(-1)}
                      className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/50 w-10 h-10 rounded-full flex items-center justify-center text-white hover:bg-black/70 transition-colors"
                    >
                      <i className="fas fa-chevron-left"></i>
                    </button>
                    <button
                      type="button"
                      aria-label="Next photo"
                      onClick={() => step(1)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/50 w-10 h-10 rounded-full flex items-center justify-center text-white hover:bg-black/70 transition-colors"
                    >
                      <i className="fas fa-chevron-right"></i>
                    </button>
                  </>
                )}
              </div>

              {images.length > 1 && (
                <div className="flex p-4 overflow-x-auto space-x-4">
                  {images.map((src, index) => (
                    <button
                      type="button"
                      key={src}
                      onClick={() => setActiveImage(index)}
                      aria-label={`Show photo ${index + 1}`}
                      className={`flex-shrink-0 w-24 h-24 rounded-md overflow-hidden ${
                        activeImage === index ? 'ring-2 ring-primary-500' : 'opacity-70 hover:opacity-100'
                      } transition-all`}
                    >
                      <img src={src} alt="" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-white rounded-xl shadow-sm overflow-hidden mb-6">
              <Tabs defaultValue="overview" className="w-full">
                <div className="border-b border-gray-200">
                  <TabsList className="w-full justify-start px-6 pt-4 bg-white">
                    <TabsTrigger value="overview">Overview</TabsTrigger>
                    <TabsTrigger value="details">Details</TabsTrigger>
                    <TabsTrigger value="amenities">Amenities</TabsTrigger>
                    <TabsTrigger value="location">Location</TabsTrigger>
                  </TabsList>
                </div>

                <TabsContent value="overview" className="p-6">
                  <h2 className="text-xl font-semibold text-gray-900 mb-4">About this place</h2>
                  <p className="text-gray-700 whitespace-pre-line">
                    {listing.detailedDescription ?? listing.description}
                  </p>
                  <div className="mt-8 grid grid-cols-2 sm:grid-cols-3 gap-6 text-center">
                    <div>
                      <h3 className="font-medium text-gray-900">{listing.bedrooms}</h3>
                      <p className="text-gray-500 text-sm">{listing.bedrooms === 1 ? 'Bedroom' : 'Bedrooms'}</p>
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-900">{listing.bathrooms}</h3>
                      <p className="text-gray-500 text-sm">{listing.bathrooms === 1 ? 'Bathroom' : 'Bathrooms'}</p>
                    </div>
                    {listing.squareFeet !== null && (
                      <div>
                        <h3 className="font-medium text-gray-900">{listing.squareFeet}</h3>
                        <p className="text-gray-500 text-sm">Square feet</p>
                      </div>
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="details" className="p-6">
                  <h2 className="text-xl font-semibold text-gray-900 mb-4">Details</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <DetailRow label="Property type" value={typeLabel} />
                    <DetailRow label="Bedrooms" value={listing.bedrooms} />
                    <DetailRow label="Bathrooms" value={bathroomText} />
                    <DetailRow label="Lease term" value={listing.leaseTerm ?? 'Ask the landlord'} />
                    <DetailRow
                      label="Available from"
                      value={listing.availableFrom ? formatDate(listing.availableFrom) : 'Ask the landlord'}
                    />
                    <DetailRow label="Pets allowed" value={listing.petsAllowed ? 'Yes' : 'No'} />
                    <DetailRow label="Furnished" value={listing.furnished ? 'Yes' : 'No'} />
                  </div>
                  {listing.utilitiesIncluded.length > 0 && (
                    <div className="mt-8">
                      <h3 className="text-lg font-medium text-gray-900 mb-3">Utilities included</h3>
                      <div className="flex flex-wrap gap-2">
                        {listing.utilitiesIncluded.map((utility) => (
                          <span key={utility} className="bg-green-100 text-green-800 text-xs font-medium px-2.5 py-1 rounded-full">
                            <i className="fas fa-check mr-1"></i> {utility}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="amenities" className="p-6">
                  <h2 className="text-xl font-semibold text-gray-900 mb-4">Amenities</h2>
                  {listing.amenities.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                      {listing.amenities.map((amenity) => (
                        <div key={amenity} className="flex items-center">
                          <i className="fas fa-check text-primary-600 mr-3"></i>
                          <span className="text-gray-700">{amenity}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500">No amenities listed.</p>
                  )}
                </TabsContent>

                <TabsContent value="location" className="p-6">
                  <h2 className="text-xl font-semibold text-gray-900 mb-4">Location</h2>
                  <p className="text-gray-700">{fullAddress}</p>
                  {listing.neighborhood && <p className="text-gray-600 mt-1">{listing.neighborhood}</p>}
                  {listing.distanceFromCampus && (
                    <p className="mt-2 text-gray-600">
                      <i className="fas fa-university mr-1.5"></i>
                      {listing.distanceFromCampus} from campus
                    </p>
                  )}
                  {listing.nearbyPlaces.length > 0 && (
                    <div className="mt-6">
                      <h3 className="text-lg font-medium text-gray-900 mb-3">What's nearby</h3>
                      <ul className="space-y-2">
                        {listing.nearbyPlaces.map((place) => (
                          <li key={place} className="flex items-start text-gray-700">
                            <i className="fas fa-location-dot mt-1 mr-2 text-primary-600"></i>
                            {place}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </div>
          </div>

          <div className="md:col-span-1">
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Listed by</h2>
              <div className="flex items-center">
                <div className="w-12 h-12 rounded-full overflow-hidden mr-3 bg-gray-100 flex items-center justify-center">
                  {landlord?.avatarUrl ? (
                    <img src={landlord.avatarUrl} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <i className="fas fa-user text-gray-400"></i>
                  )}
                </div>
                <div>
                  <h3 className="font-medium text-gray-900">{landlord?.fullName ?? 'Landlord'}</h3>
                  {landlord && (
                    <p className="text-gray-500 text-sm">
                      Member since {new Date(landlord.createdAt).toLocaleDateString('en-CA', { month: 'long', year: 'numeric' })}
                    </p>
                  )}
                </div>
              </div>
              {isOwner && (
                <Link href={`/edit-listing/${listing.id}`}>
                  <Button variant="outline" className="w-full mt-6">Edit listing</Button>
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ListingDetail;
