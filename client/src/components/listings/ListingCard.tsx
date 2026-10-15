import { useState } from 'react';
import { Link } from 'wouter';
import { Heart, MapPin, NotebookPen } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { useFavoritesContext } from '@/hooks/use-favorites';
import { useSaveListing } from '@/hooks/use-save-listing';
import { formatDistance } from '@/lib/map';
import { PROPERTY_TYPE_LABELS, type Listing } from '@shared/schema';
import ListingCover from './ListingCover';

interface ListingCardProps {
  listing: Listing;
  /** Measured by the search, with what it was measured from ("McMaster"). */
  distance?: { km: number; from: string } | null;
  layout?: 'grid' | 'list';
}

export const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

/** Facts in the order students compare them: rooms, then what kind of place. */
export const listingFacts = (listing: Pick<Listing, 'bedrooms' | 'bathrooms' | 'propertyType'>) =>
  [
    // A studio has no separate bedroom, and "0 beds" reads like a mistake.
    listing.bedrooms > 0 ? plural(listing.bedrooms, 'bed') : null,
    plural(listing.bathrooms, 'bath'),
    PROPERTY_TYPE_LABELS[listing.propertyType],
  ]
    .filter(Boolean)
    .join(' · ');

export const CardSkeleton = () => (
  <div className="overflow-hidden rounded-lg border bg-card" aria-hidden="true">
    <Skeleton className="aspect-[4/3] w-full rounded-none" />
    <div className="space-y-2.5 p-4">
      <Skeleton className="h-5 w-1/3" />
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-4 w-1/2" />
    </div>
  </div>
);

const NotesDialog = ({ listing, open, onOpenChange }: { listing: Listing; open: boolean; onOpenChange: (open: boolean) => void }) => {
  const { collections, setCollection, getFavoriteNote, addNoteToFavorite } = useFavoritesContext();
  // Read the note when the dialog opens: favorites may not have loaded when the card mounted.
  const [note, setNote] = useState(() => getFavoriteNote(listing.id) ?? '');
  const [newCollection, setNewCollection] = useState('');

  const saveNote = async () => {
    try {
      await addNoteToFavorite(listing.id, note);
      toast.success('Note saved');
      onOpenChange(false);
    } catch {
      toast.error('Could not save the note');
    }
  };

  const addTo = async (name: string) => {
    try {
      await setCollection(listing.id, name);
      toast.success(`Added to ${name}`);
      setNewCollection('');
    } catch {
      toast.error('Could not update the collection');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Your notes</DialogTitle>
          <DialogDescription>{listing.title}. Only you can see these.</DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <label htmlFor={`note-${listing.id}`} className="text-sm font-medium">
            Note
          </label>
          <Textarea
            id={`note-${listing.id}`}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Viewing on Thursday, ask about the lease start"
            rows={4}
          />
          <Button onClick={saveNote}>Save note</Button>
        </div>
        <div className="space-y-2 border-t pt-4">
          <p className="text-sm font-medium">Add to a collection</p>
          {collections.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {collections.map((name) => (
                <Button key={name} variant="outline" size="sm" onClick={() => addTo(name)}>
                  {name}
                </Button>
              ))}
            </div>
          )}
          <form
            className="flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              if (newCollection.trim()) addTo(newCollection.trim());
            }}
          >
            <Input
              value={newCollection}
              onChange={(e) => setNewCollection(e.target.value)}
              placeholder="New collection, e.g. Shortlist"
              aria-label="New collection name"
            />
            <Button type="submit" variant="outline" disabled={!newCollection.trim()}>
              Add
            </Button>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
};

const ListingCard = ({ listing, distance, layout = 'grid' }: ListingCardProps) => {
  const { saved, toggle: toggleFavorite } = useSaveListing(listing.id);
  const [notesOpen, setNotesOpen] = useState(false);

  const list = layout === 'list';

  return (
    <article
      className={`group relative flex overflow-hidden rounded-lg border bg-card text-card-foreground transition-colors hover:border-foreground/25 ${
        list ? 'flex-col sm:flex-row' : 'flex-col'
      }`}
    >
      <div className={`relative overflow-hidden bg-muted ${list ? 'aspect-[16/10] sm:aspect-auto sm:w-64 sm:shrink-0' : 'aspect-[16/10] sm:aspect-[4/3]'}`}>
        <ListingCover listing={listing} className="transition-transform duration-300 group-hover:scale-[1.02]" />
      </div>

      <button
        type="button"
        onClick={toggleFavorite}
        aria-label={`Save ${listing.title}`}
        aria-pressed={saved}
        className="absolute right-2 top-2 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-background/90 text-foreground shadow-sm hover:bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <Heart className={`h-4 w-4 ${saved ? 'fill-primary text-primary' : ''}`} aria-hidden="true" />
      </button>

      <div className="flex flex-1 flex-col gap-1.5 p-4">
        <p className="text-lg font-semibold tabular-nums">
          ${listing.price.toLocaleString('en-CA')}
          <span className="text-sm font-normal text-muted-foreground"> /month</span>
        </p>
        <h3 className="font-sans text-base font-medium leading-snug">
          {/* The link covers the whole card; the buttons sit above it. */}
          <Link href={`/listings/${listing.id}`} className="after:absolute after:inset-0 focus-visible:outline-none focus-visible:after:rounded-lg focus-visible:after:ring-2 focus-visible:after:ring-ring">
            {listing.title}
          </Link>
        </h3>
        <p className="text-sm text-muted-foreground">{listingFacts(listing)}</p>
        {distance && (
          <p className="flex items-center gap-1 text-sm tabular-nums text-muted-foreground">
            <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            {formatDistance(distance.km)} from {distance.from}
          </p>
        )}
        {list && <p className="line-clamp-2 text-sm text-muted-foreground">{listing.description}</p>}
        {listing.amenities.length > 0 && (
          <p className="text-xs text-muted-foreground">
            {listing.amenities.slice(0, 3).join(', ')}
            {listing.amenities.length > 3 && `, +${listing.amenities.length - 3} more`}
          </p>
        )}
        {saved && (
          <div className="relative z-10 mt-auto pt-2">
            <Button variant="ghost" size="sm" className="-ml-2 h-8 text-muted-foreground" onClick={() => setNotesOpen(true)}>
              <NotebookPen className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
              Notes and collections
            </Button>
          </div>
        )}
      </div>

      {notesOpen && <NotesDialog listing={listing} open={notesOpen} onOpenChange={setNotesOpen} />}
    </article>
  );
};

export default ListingCard;
