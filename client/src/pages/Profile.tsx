import { useState } from 'react';
import { Link } from 'wouter';
import { toast } from 'sonner';
import type { User } from '@supabase/supabase-js';
import ListingCover from '@/components/listings/ListingCover';
import RequireAuth from '@/components/RequireAuth';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/AuthContext';
import { useFavoritesContext, useSavedListings } from '@/hooks/use-favorites';
import { useUniversities } from '@/hooks/use-universities';
import { useUserProfile } from '@/hooks/use-user-profile';
import { PROFILE_PICTURES_BUCKET, removeImages, validateImage } from '@/lib/storage';
import {
  PROPERTY_TYPES,
  PROPERTY_TYPE_LABELS,
  preferencesSchema,
  profileUpdateSchema,
  type Preferences,
  type Profile as ProfileData,
  type SavedListing,
} from '@shared/schema';

const BEDROOM_CHOICES = ['1', '2', '3', '4+'];
const NEW_COLLECTION = '__new__';

const ProfileSkeleton = () => (
  <div className="page grid gap-8 py-8 md:grid-cols-3 md:py-10" role="status" aria-label="Loading your profile">
    <Skeleton className="h-80 w-full" />
    <div className="space-y-4 md:col-span-2">
      <Skeleton className="h-10 w-72" />
      <Skeleton className="h-32 w-full" />
      <Skeleton className="h-32 w-full" />
    </div>
  </div>
);

const Avatar = ({ profile, size }: { profile: ProfileData | null; size: string }) => (
  <div className={`${size} shrink-0 rounded-full overflow-hidden bg-primary/10 flex items-center justify-center`} aria-hidden>
    {profile?.avatarUrl ? (
      <img src={profile.avatarUrl} alt="" className="w-full h-full object-cover" />
    ) : (
      <span className="text-xl font-semibold text-primary">{(profile?.fullName ?? '?')[0]?.toUpperCase()}</span>
    )}
  </div>
);

function SavedListingRow({ saved, collections }: { saved: SavedListing; collections: string[] }) {
  const { removeFavorite, setCollection } = useFavoritesContext();
  const [naming, setNaming] = useState(false);
  const [newName, setNewName] = useState('');
  const { listing, favorite } = saved;

  const move = async (name: string | null) => {
    try {
      await setCollection(listing.id, name);
    } catch {
      toast.error('Could not update the collection');
    }
  };

  return (
    <li className="flex flex-col overflow-hidden rounded-lg border bg-card sm:flex-row">
      <div className="h-32 shrink-0 sm:h-auto sm:w-40">
        <ListingCover listing={listing} />
      </div>
      <div className="p-4 flex-1 min-w-0 space-y-2">
        <div className="flex justify-between gap-2">
          <Link href={`/listings/${listing.id}`} className="font-medium hover:text-primary">
            {listing.title}
          </Link>
          <p className="whitespace-nowrap font-semibold tabular-nums">${listing.price.toLocaleString('en-CA')}/mo</p>
        </div>
        <p className="text-sm text-muted-foreground">
          {listing.address}, {listing.city} · {listing.bedrooms} {listing.bedrooms === 1 ? 'bed' : 'beds'}
          {!listing.isAvailable && <span className="ml-2 font-medium text-foreground">No longer available</span>}
        </p>
        {favorite.note && <p className="rounded-md border-l-2 border-primary bg-muted/60 px-3 py-2 text-sm">{favorite.note}</p>}
        <div className="flex flex-wrap items-center gap-2 pt-1">
          {naming ? (
            <form
              className="flex gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                if (newName.trim()) move(newName).then(() => setNaming(false));
              }}
            >
              <Input
                autoFocus
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Collection name"
                aria-label="New collection name"
                maxLength={100}
                className="h-9 w-44"
              />
              <Button type="submit" size="sm" disabled={!newName.trim()}>
                Add
              </Button>
              <Button type="button" size="sm" variant="ghost" onClick={() => setNaming(false)}>
                Cancel
              </Button>
            </form>
          ) : (
            <Select
              value={favorite.collectionName ?? 'none'}
              onValueChange={(v) => (v === NEW_COLLECTION ? setNaming(true) : move(v === 'none' ? null : v))}
            >
              <SelectTrigger className="h-9 w-48" aria-label={`Collection for ${listing.title}`}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No collection</SelectItem>
                {collections.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
                <SelectItem value={NEW_COLLECTION}>New collection...</SelectItem>
              </SelectContent>
            </Select>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => removeFavorite(listing.id).catch(() => toast.error('Could not remove it'))}
          >
            Unsave
          </Button>
        </div>
      </div>
    </li>
  );
}

function EditProfileDialog({
  open,
  onClose,
  profile,
  user,
}: {
  open: boolean;
  onClose: () => void;
  profile: ProfileData | null;
  user: User;
}) {
  const { updateProfile, uploadAvatar } = useUserProfile(user.id);
  const { data: universities = [] } = useUniversities();
  const [name, setName] = useState(profile?.fullName ?? '');
  const [universityId, setUniversityId] = useState<string | null>(profile?.universityId ?? null);
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const invalidFile = file ? validateImage(file, PROFILE_PICTURES_BUCKET) : null;
    if (invalidFile) return setError(invalidFile);
    const check = profileUpdateSchema.safeParse({ fullName: name, universityId, avatarUrl: profile?.avatarUrl ?? null });
    if (!check.success) return setError(check.error.issues[0]?.message ?? 'Check the form');

    setSaving(true);
    let uploaded: string | null = null;
    try {
      if (file) uploaded = await uploadAvatar(file);
      await updateProfile.mutateAsync({ ...check.data, avatarUrl: uploaded ?? check.data.avatarUrl });
      if (uploaded && profile?.avatarUrl) void removeImages([profile.avatarUrl], PROFILE_PICTURES_BUCKET);
      toast.success('Profile saved');
      onClose();
    } catch (err) {
      if (uploaded) void removeImages([uploaded], PROFILE_PICTURES_BUCKET);
      setError(err instanceof Error ? err.message : 'Could not save your profile');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit profile</DialogTitle>
        </DialogHeader>
        <form className="space-y-4" onSubmit={save}>
          <div>
            <label htmlFor="profile-name" className="block text-sm font-medium text-foreground mb-1">
              Name
            </label>
            <Input id="profile-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={100} />
          </div>
          <div>
            <span id="profile-university-label" className="block text-sm font-medium text-foreground mb-1">
              University
            </span>
            <Select value={universityId ?? 'none'} onValueChange={(v) => setUniversityId(v === 'none' ? null : v)}>
              <SelectTrigger aria-labelledby="profile-university-label">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                {universities.map((u) => (
                  <SelectItem key={u.id} value={u.id}>
                    {u.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label htmlFor="profile-photo" className="block text-sm font-medium text-foreground mb-1">
              Profile photo (JPEG, PNG or WebP, up to 2 MB)
            </label>
            <input
              id="profile-photo"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
          </div>
          {error && (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'Saving' : 'Save'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function PreferencesForm({ initial, onSave }: { initial: Preferences; onSave: (p: Preferences) => Promise<void> }) {
  const [maxRent, setMaxRent] = useState(initial.maxRent?.toString() ?? '');
  const [types, setTypes] = useState(initial.housingTypes);
  const [bedrooms, setBedrooms] = useState(initial.bedrooms);
  const [lookingFor, setLookingFor] = useState(initial.lookingFor ?? '');
  const [roommates, setRoommates] = useState(initial.wantsRoommates);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    const check = preferencesSchema.safeParse({
      maxRent: maxRent.trim() ? Number(maxRent) : null,
      housingTypes: types,
      bedrooms,
      lookingFor: lookingFor.trim() || null,
      wantsRoommates: roommates,
    });
    if (!check.success) return setError('Maximum rent must be a whole number of dollars');
    setError(null);
    setSaving(true);
    try {
      await onSave(check.data);
      toast.success('Preferences saved');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save your preferences');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form className="space-y-5 max-w-lg" onSubmit={save}>
      <div>
        <label htmlFor="pref-rent" className="block text-sm font-medium text-foreground mb-1">
          Maximum rent per month ($)
        </label>
        <Input id="pref-rent" type="number" min="0" step="1" value={maxRent} onChange={(e) => setMaxRent(e.target.value)} />
      </div>
      <fieldset>
        <legend className="block text-sm font-medium text-foreground mb-2">Housing types</legend>
        <div className="flex flex-wrap gap-4">
          {PROPERTY_TYPES.map((t) => (
            <label key={t} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                className="h-4 w-4 accent-primary"
                checked={types.includes(t)}
                onChange={() => setTypes(types.includes(t) ? types.filter((x) => x !== t) : [...types, t])}
              />
              {PROPERTY_TYPE_LABELS[t]}
            </label>
          ))}
        </div>
      </fieldset>
      <div>
        <span id="pref-bedrooms-label" className="block text-sm font-medium text-foreground mb-1">
          Bedrooms
        </span>
        <Select value={bedrooms ?? 'any'} onValueChange={(v) => setBedrooms(v === 'any' ? null : v)}>
          <SelectTrigger className="w-40" aria-labelledby="pref-bedrooms-label">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="any">Any</SelectItem>
            {BEDROOM_CHOICES.map((b) => (
              <SelectItem key={b} value={b}>
                {b}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div>
        <label htmlFor="pref-looking" className="block text-sm font-medium text-foreground mb-1">
          Looking for
        </label>
        <Input
          id="pref-looking"
          value={lookingFor}
          onChange={(e) => setLookingFor(e.target.value)}
          placeholder="e.g. a place from September"
          maxLength={200}
        />
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" className="h-4 w-4 accent-primary" checked={roommates} onChange={(e) => setRoommates(e.target.checked)} />
        Open to roommates
      </label>
      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}
      <Button type="submit" disabled={saving}>
        {saving ? 'Saving' : 'Save preferences'}
      </Button>
    </form>
  );
}

function ProfilePage({ user }: { user: User }) {
  const { signOut } = useAuth();
  const { profile, preferences, isLoading, error, updatePreferences } = useUserProfile(user.id);
  const saved = useSavedListings(user.id);
  const { collections } = useFavoritesContext();
  const { data: universities = [] } = useUniversities();
  const [editing, setEditing] = useState(false);

  if (isLoading) return <ProfileSkeleton />;
  if (error) {
    return (
      <div className="page py-16 text-center" role="alert">
        <h1 className="mb-2 text-2xl font-semibold">Couldn't load your profile</h1>
        <p className="text-muted-foreground">{error.message}</p>
      </div>
    );
  }

  const university = universities.find((u) => u.id === profile?.universityId);
  const savedListings = saved.data ?? [];
  const byCollection = collections.map((name) => ({
    name,
    items: savedListings.filter((s) => s.favorite.collectionName === name),
  }));

  return (
    <div className="page py-8 md:py-10">
      <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
        <aside className="h-fit rounded-lg border bg-card p-6 md:sticky md:top-20">
          <div className="flex items-center gap-4">
            <Avatar profile={profile} size="h-16 w-16" />
            <div className="min-w-0">
              <h1 className="truncate text-2xl font-semibold">{profile?.fullName ?? 'Your profile'}</h1>
              <p className="text-muted-foreground text-sm truncate">{user.email}</p>
            </div>
          </div>
          <dl className="mt-6 space-y-3 text-sm">
            <div>
              <dt className="text-muted-foreground">Account</dt>
              <dd className="font-medium capitalize">{profile?.role ?? 'student'}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">University</dt>
              <dd className="font-medium">{university?.name ?? 'Not set'}</dd>
            </div>
            {profile && (
              <div>
                <dt className="text-muted-foreground">Member since</dt>
                <dd className="font-medium">
                  {new Date(profile.createdAt).toLocaleDateString('en-CA', { month: 'long', year: 'numeric' })}
                </dd>
              </div>
            )}
          </dl>
          <div className="mt-6 space-y-2">
            <Button variant="outline" className="w-full" onClick={() => setEditing(true)}>
              Edit profile
            </Button>
            <Button asChild variant="outline" className="w-full">
              <Link href="/profile/my-listings">My listings</Link>
            </Button>
            <Button variant="ghost" className="w-full" onClick={signOut}>
              Sign out
            </Button>
          </div>
        </aside>

        <section className="md:col-span-2">
          <Tabs defaultValue="saved">
            <TabsList>
              <TabsTrigger value="saved">Saved ({savedListings.length})</TabsTrigger>
              <TabsTrigger value="collections">Collections ({collections.length})</TabsTrigger>
              <TabsTrigger value="preferences">Preferences</TabsTrigger>
            </TabsList>

            <TabsContent value="saved" className="pt-4">
              {saved.isLoading ? (
                <ul className="space-y-4" role="status" aria-label="Loading saved listings">
                  {[0, 1].map((i) => (
                    <li key={i} className="flex gap-4 rounded-lg border bg-card p-3">
                      <Skeleton className="h-24 w-36" />
                      <div className="flex-1 space-y-2 py-1">
                        <Skeleton className="h-5 w-2/3" />
                        <Skeleton className="h-4 w-1/2" />
                      </div>
                    </li>
                  ))}
                </ul>
              ) : saved.error ? (
                <div role="alert" className="text-destructive">
                  Couldn't load your saved listings: {saved.error.message}{' '}
                  <Button variant="link" onClick={() => saved.refetch()}>
                    Try again
                  </Button>
                </div>
              ) : savedListings.length === 0 ? (
                <div className="rounded-lg border border-dashed px-6 py-12 text-center">
                  <h2 className="mb-2 text-xl font-semibold">No saved listings yet</h2>
                  <p className="text-muted-foreground mb-4">Tap the heart on a listing to keep it here.</p>
                  <Button asChild>
                    <Link href="/listings">Browse listings</Link>
                  </Button>
                </div>
              ) : (
                <ul className="space-y-4">
                  {savedListings.map((s) => (
                    <SavedListingRow key={s.favorite.id} saved={s} collections={collections} />
                  ))}
                </ul>
              )}
            </TabsContent>

            <TabsContent value="collections" className="pt-4">
              {byCollection.length === 0 ? (
                <p className="rounded-lg border border-dashed px-6 py-10 text-center text-muted-foreground">
                  No collections yet. Use the collection menu on a saved listing to group it, for example "Shortlist".
                </p>
              ) : (
                <div className="space-y-6">
                  {byCollection.map(({ name, items }) => (
                    <div key={name} className="rounded-lg border bg-card p-4">
                      <h2 className="mb-3 font-sans text-base font-semibold">
                        {name} <span className="text-sm font-normal text-muted-foreground">({items.length})</span>
                      </h2>
                      <ul className="space-y-2">
                        {items.map(({ listing }) => (
                          <li key={listing.id} className="flex justify-between gap-2 text-sm">
                            <Link href={`/listings/${listing.id}`} className="text-primary hover:text-primary truncate">
                              {listing.title}
                            </Link>
                            <span className="whitespace-nowrap tabular-nums">${listing.price.toLocaleString('en-CA')}/mo</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="preferences" className="pt-4">
              <div className="bg-card rounded-lg border border-border p-6">
                <p className="text-sm text-muted-foreground mb-4">Private: only you can see these.</p>
                {preferences && (
                  <PreferencesForm
                    initial={preferences}
                    onSave={async (p) => {
                      await updatePreferences.mutateAsync(p);
                    }}
                  />
                )}
              </div>
            </TabsContent>
          </Tabs>
        </section>
      </div>

      {editing && <EditProfileDialog open onClose={() => setEditing(false)} profile={profile} user={user} />}
    </div>
  );
}

const Profile = () => <RequireAuth reason="see your profile and saved listings">{(user) => <ProfilePage user={user} />}</RequireAuth>;

export default Profile;
