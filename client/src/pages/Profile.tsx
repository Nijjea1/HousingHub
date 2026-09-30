import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Link } from 'wouter';
import { useFavoritesContext } from '@/hooks/use-favorites';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/contexts/AuthContext';
import { useListings } from '@/hooks/use-listings';
import { useUserProfile } from '@/hooks/use-user-profile';
import { PROPERTY_TYPES, type PropertyType } from '@shared/schema';

interface UserPreferences {
  maxRent: number;
  housingType: string[];
  bedrooms: string;
  lookingFor: string;
  roommates: boolean;
}

interface UserData {
  name: string;
  email: string;
  university: string;
  graduationYear: string;
  profileImage: string;
  joinDate: string;
  preferences: UserPreferences;
}

const Profile = () => {
  const { user, signOut } = useAuth();
  const { data: listings = [] } = useListings();
  const [activeTab, setActiveTab] = useState('saved');
  const [newCollectionName, setNewCollectionName] = useState('');
  const [isCreateCollectionOpen, setIsCreateCollectionOpen] = useState(false);
  const [selectedCollection, setSelectedCollection] = useState<string | null>(null);

  const { 
    favorites,
    collections,
    removeFavorite,
    createCollection,
    getFavoriteNote
  } = useFavoritesContext();
  
  const {
    profile,
    preferences,
    updateProfile,
    updatePreferences,
    uploadAvatar,
  } = useUserProfile(user?.id);

  // Editable state for name and preferences
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    name: '',
    profile_image: '',
    maxRent: '',
    housingType: '',
    bedrooms: '',
    lookingFor: '',
    roommates: false,
    imageFile: null as File | null,
  });
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  useEffect(() => {
    if (profile) {
      setEditForm({
        name: profile.fullName || '',
        profile_image: profile.avatarUrl || '',
        maxRent: preferences?.maxRent?.toString() || '',
        housingType: (preferences?.housingTypes || []).join(', '),
        bedrooms: preferences?.bedrooms || '',
        lookingFor: preferences?.lookingFor || '',
        roommates: !!preferences?.wantsRoommates,
        imageFile: null,
      });
    }
  }, [profile, preferences, editModalOpen]);

  const handleEditChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    if (e.target instanceof HTMLInputElement && e.target.type === 'checkbox') {
      const checked = e.target.checked;
      setEditForm(prev => ({ ...prev, [name]: checked }));
    } else {
      setEditForm(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setEditForm(prev => ({ ...prev, imageFile: e.target.files![0] }));
    }
  };

  const handleEditSave = async () => {
    setEditLoading(true);
    setEditError(null);
    try {
      let avatarUrl = editForm.profile_image;
      if (editForm.imageFile) {
        avatarUrl = await uploadAvatar(editForm.imageFile);
      }
      await updateProfile.mutateAsync({
        fullName: editForm.name,
        universityId: profile?.universityId ?? null,
        avatarUrl: avatarUrl || null,
      });
      const housingTypes = editForm.housingType
        .split(',')
        .map(s => s.trim())
        .filter((t): t is PropertyType => (PROPERTY_TYPES as readonly string[]).includes(t));
      await updatePreferences.mutateAsync({
        maxRent: editForm.maxRent ? parseInt(editForm.maxRent) : null,
        housingTypes,
        bedrooms: editForm.bedrooms || null,
        lookingFor: editForm.lookingFor || null,
        wantsRoommates: editForm.roommates,
      });
      setEditModalOpen(false);
    } catch (err) {
      setEditError(err instanceof Error ? err.message : 'Failed to update profile');
    } finally {
      setEditLoading(false);
    }
  };

  // Get the actual listings for favorites
  const favoriteListings = listings?.filter(listing => 
    favorites?.some(fav => fav.listingId === listing.id)
  ) || [];
  
  // Use actual user data if available, otherwise use mock data
  const userData: UserData = {
    name: user?.email?.split('@')[0] || 'Guest User',
    email: user?.email || 'Not signed in',
    university: 'State University',
    graduationYear: '2025',
    profileImage: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?ixlib=rb-1.2.1&auto=format&fit=crop&w=150&q=80',
    joinDate: user?.created_at 
      ? new Date(user.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
      : new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
    preferences: {
      maxRent: 1000,
      housingType: ['Apartment', 'House'],
      bedrooms: '2+',
      lookingFor: 'Fall 2023 Semester',
      roommates: true
    }
  };

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
  };

  // Handle creating a new collection
  const handleCreateCollection = async () => {
    if (newCollectionName.trim()) {
      await createCollection(newCollectionName.trim());
      setNewCollectionName('');
      setIsCreateCollectionOpen(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Profile Information */}
        <div className="md:col-span-1 flex flex-col gap-6">
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center space-x-4">
              <img
                src={profile?.avatarUrl || userData.profileImage}
                alt={profile?.fullName || userData.name}
                className="h-16 w-16 rounded-full object-cover"
              />
              <div>
                <h2 className="text-xl font-semibold text-gray-900">{profile?.fullName || userData.name}</h2>
                <p className="text-gray-500">{userData.email}</p>
              </div>
            </div>
            
            <div className="mt-6 space-y-4">
              <div>
                <p className="text-sm text-gray-500">University</p>
                <p className="font-medium">{userData.university}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Graduation Year</p>
                <p className="font-medium">{userData.graduationYear}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Member Since</p>
                <p className="font-medium">{userData.joinDate}</p>
              </div>
            </div>

            <div className="mt-6">
              <Button variant="outline" className="w-full" onClick={() => setEditModalOpen(true)}>
                Edit Profile
              </Button>
              <Button variant="destructive" className="w-full mt-2" onClick={signOut}>
                Log Out
              </Button>
            </div>
          </div>
          {/* Preferences Card */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Preferences</h3>
            <ul className="space-y-2">
              <li><span className="text-gray-500">Maximum Rent:</span> <span className="font-medium">{preferences?.maxRent ? `$${preferences.maxRent}` : 'Not set'}</span></li>
              <li><span className="text-gray-500">Housing Type:</span> <span className="font-medium">{preferences?.housingTypes && preferences.housingTypes.length > 0 ? preferences.housingTypes.join(', ') : 'Not set'}</span></li>
              <li><span className="text-gray-500">Bedrooms:</span> <span className="font-medium">{preferences?.bedrooms || 'Not set'}</span></li>
              <li><span className="text-gray-500">Looking For:</span> <span className="font-medium">{preferences?.lookingFor || 'Not set'}</span></li>
              <li><span className="text-gray-500">Open to Roommates:</span> <span className="font-medium">{preferences?.wantsRoommates === true ? 'Yes' : preferences?.wantsRoommates === false ? 'No' : 'Not set'}</span></li>
            </ul>
          </div>
        </div>

        {/* Main Content */}
        <div className="md:col-span-2">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList>
              <TabsTrigger value="saved">Saved Listings</TabsTrigger>
              <TabsTrigger value="collections">Collections</TabsTrigger>
              <TabsTrigger value="preferences">Preferences</TabsTrigger>
            </TabsList>

            <TabsContent value="saved" className="p-6">
              <div className="mb-4 flex justify-between items-center">
                <h2 className="text-lg font-semibold text-gray-900">
                  Saved Listings ({favoriteListings.length})
                </h2>
                <Button variant="outline" size="sm">
                  <i className="fas fa-sort-amount-down mr-2"></i> Sort
                </Button>
              </div>
              
              {favoriteListings.length > 0 ? (
                <motion.div 
                  className="space-y-4"
                  variants={containerVariants}
                  initial="hidden"
                  animate="visible"
                >
                  {favoriteListings.map((listing) => (
                    <motion.div 
                      key={listing.id}
                      variants={itemVariants}
                      className="bg-white border border-gray-200 rounded-lg overflow-hidden hover:shadow-md transition-shadow"
                    >
                      <div className="flex flex-col sm:flex-row">
                        <div className="sm:w-1/3 relative">
                          {/* No images property, already handled above */}
                        </div>
                        <div className="sm:w-2/3 p-4">
                          <div className="flex justify-between items-start">
                            <div>
                              <h3 className="text-lg font-semibold text-gray-900">{listing.title}</h3>
                              <p className="text-gray-600">{listing.address}</p>
                            </div>
                            <p className="text-lg font-bold text-primary-600">${listing.price}/mo</p>
                          </div>
                          
                          <div className="mt-2 flex items-center space-x-4 text-sm text-gray-500">
                            <span>{listing.bedrooms} beds</span>
                            <span>•</span>
                            <span>{listing.bathrooms} baths</span>
                            {listing.squareFeet && (
                              <>
                                <span>•</span>
                                <span>{listing.squareFeet} sq ft</span>
                              </>
                            )}
                          </div>
                          
                          <p className="mt-2 text-sm text-gray-600 line-clamp-2">{listing.description}</p>
                          
                          {getFavoriteNote(listing.id) && (
                            <div className="mt-2 p-2 bg-gray-50 rounded-md">
                              <p className="text-sm text-gray-600 italic">
                                {getFavoriteNote(listing.id)}
                              </p>
                            </div>
                          )}
                          
                          <div className="mt-4 flex items-center justify-between">
                            <div className="flex space-x-2">
                              <Button variant="outline" size="sm" className="flex items-center">
                                <i className="fas fa-share-alt mr-1.5 text-primary-600"></i> Share
                              </Button>
                              <Button 
                                variant="outline" 
                                size="sm" 
                                className="text-red-500"
                                onClick={() => removeFavorite(listing.id)}
                              >
                                <i className="fas fa-heart-broken mr-1.5"></i> Unsave
                              </Button>
                            </div>
                            <Link href={`/listings/${listing.id}`}>
                              <Button size="sm">
                                View Details
                              </Button>
                            </Link>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </motion.div>
              ) : (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <i className="fas fa-heart text-2xl text-gray-400"></i>
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No saved listings yet</h3>
                  <p className="text-gray-500 mb-4">Start saving listings you're interested in</p>
                  <Link href="/listings">
                    <Button>Browse Listings</Button>
                  </Link>
                </div>
              )}
            </TabsContent>

            <TabsContent value="collections" className="p-6">
              <div className="mb-4 flex justify-between items-center">
                <h2 className="text-lg font-semibold text-gray-900">
                  Collections ({collections.length})
                </h2>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setIsCreateCollectionOpen(true)}
                >
                  <i className="fas fa-plus mr-2"></i> New Collection
                </Button>
              </div>

              {collections.length > 0 ? (
                <div className="space-y-4">
                  {collections.map((collection) => {
                    const collectionListings = favoriteListings.filter(
                      listing => favorites?.find(
                        fav => fav.listingId === listing.id && fav.collectionName === collection
                      )
                    );
                    
                    return (
                      <div key={collection} className="border border-gray-200 rounded-lg overflow-hidden">
                        <div 
                          className="p-4 bg-gray-50 flex justify-between items-center cursor-pointer"
                          onClick={() => setSelectedCollection(selectedCollection === collection ? null : collection)}
                        >
                          <div>
                            <h3 className="font-medium text-gray-900">{collection}</h3>
                            <p className="text-sm text-gray-500">{collectionListings.length} listings</p>
                          </div>
                          <Button variant="ghost" size="sm">
                            <i className={`fas fa-chevron-${selectedCollection === collection ? 'up' : 'down'}`}></i>
                          </Button>
                        </div>

                        {selectedCollection === collection && (
                          <div className="p-4">
                            {collectionListings.length > 0 ? (
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {collectionListings.map(listing => (
                                  <div key={listing.id} className="border border-gray-200 rounded-lg overflow-hidden flex flex-col">
                                    <div className="h-40 relative">
                                      {/* No images property, already handled above */}
                                    </div>
                                    <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-transparent to-black/50 flex items-end">
                                      <div className="p-3 text-white">
                                        <h4 className="font-medium">{listing.title}</h4>
                                        <p className="text-sm">${listing.price}/mo</p>
                                      </div>
                                    </div>
                                    <Button 
                                      variant="destructive" 
                                      size="icon" 
                                      className="absolute top-2 right-2 h-7 w-7 rounded-full"
                                      onClick={() => removeFavorite(listing.id)}
                                    >
                                      <i className="fas fa-times text-xs"></i>
                                    </Button>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div className="text-center py-8">
                                <p className="text-gray-500">No listings in this collection</p>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <i className="fas fa-folder text-2xl text-gray-400"></i>
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No collections yet</h3>
                  <p className="text-gray-500 mb-4">Create collections to organize your saved listings</p>
                  <Button onClick={() => setIsCreateCollectionOpen(true)}>
                    Create First Collection
                  </Button>
                </div>
              )}
            </TabsContent>

            <TabsContent value="preferences" className="p-6">
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Housing Preferences</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-500">Maximum Rent</p>
                      <p className="font-medium">${editForm.maxRent ? editForm.maxRent : ''}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Housing Type</p>
                      <p className="font-medium">{editForm.housingType || ''}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Bedrooms</p>
                      <p className="font-medium">{editForm.bedrooms}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Looking For</p>
                      <p className="font-medium">{editForm.lookingFor}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Open to Roommates</p>
                      <p className="font-medium">{editForm.roommates ? 'Yes' : 'No'}</p>
                    </div>
                  </div>
                </div>

                <div>
                  <Button variant="outline">
                    Update Preferences
                  </Button>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      <Dialog open={isCreateCollectionOpen} onOpenChange={setIsCreateCollectionOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Collection</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Collection Name
              </label>
              <Input
                value={newCollectionName}
                onChange={(e) => setNewCollectionName(e.target.value)}
                placeholder="e.g., Favorites, Shortlist, etc."
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateCollectionOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateCollection}>
                Create Collection
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Profile</DialogTitle>
          </DialogHeader>
          <form className="space-y-4" onSubmit={e => { e.preventDefault(); handleEditSave(); }}>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
              <Input name="name" value={editForm.name} onChange={handleEditChange} required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Profile Picture</label>
              <input type="file" accept="image/*" onChange={handleImageChange} />
              {editForm.profile_image && (
                <img src={editForm.profile_image} alt="Profile" className="h-16 w-16 rounded-full mt-2 object-cover" />
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Maximum Rent</label>
              <Input name="maxRent" value={editForm.maxRent} onChange={handleEditChange} type="number" min="0" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Housing Type(s) (comma separated)</label>
              <Input name="housingType" value={editForm.housingType || ''} onChange={handleEditChange} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Bedrooms</label>
              <Input name="bedrooms" value={editForm.bedrooms} onChange={handleEditChange} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Looking For</label>
              <Input name="lookingFor" value={editForm.lookingFor} onChange={handleEditChange} />
            </div>
            <div className="flex items-center">
              <input type="checkbox" name="roommates" checked={editForm.roommates} onChange={handleEditChange} className="mr-2" />
              <label className="text-sm font-medium text-gray-700">Open to Roommates</label>
            </div>
            {editError && <div className="text-red-600 text-sm">{editError}</div>}
            <DialogFooter>
              <Button variant="outline" type="button" onClick={() => setEditModalOpen(false)} disabled={editLoading}>Cancel</Button>
              <Button type="submit" disabled={editLoading}>
                {editLoading ? <span className="animate-spin mr-2 h-4 w-4 border-b-2 border-white inline-block rounded-full"></span> : null}
                Save
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Profile;