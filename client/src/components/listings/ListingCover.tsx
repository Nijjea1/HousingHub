import { streetName, toneFor } from '@/lib/cover';
import { PROPERTY_TYPE_LABELS, type Listing } from '@shared/schema';

interface ListingCoverProps {
  listing: Pick<Listing, 'id' | 'title' | 'address' | 'propertyType' | 'images'>;
  className?: string;
  /** Above the fold on the detail page; everywhere else photos load as they scroll in. */
  eager?: boolean;
  size?: 'thumb' | 'card' | 'large';
}

const PADDING = { thumb: 'p-2', card: 'p-4', large: 'p-6 md:p-8' };
const STREET = { thumb: 'text-sm', card: 'text-2xl', large: 'text-4xl md:text-5xl' };

/** The first photo, or a street-sign tile when the landlord hasn't added any. */
const ListingCover = ({ listing, className = '', eager = false, size = 'card' }: ListingCoverProps) =>
  listing.images[0] ? (
    <img
      src={listing.images[0]}
      alt={size === 'thumb' ? '' : listing.title}
      loading={eager ? 'eager' : 'lazy'}
      decoding="async"
      className={`h-full w-full object-cover ${className}`}
    />
  ) : (
    <div className={`flex h-full w-full flex-col justify-between text-tone-ink ${PADDING[size]} ${toneFor(listing.id)} ${className}`}>
      {size === 'thumb' ? (
        <span />
      ) : (
        <span className="text-[11px] font-semibold uppercase tracking-[0.12em] opacity-70">
          {PROPERTY_TYPE_LABELS[listing.propertyType] ?? listing.propertyType}
        </span>
      )}
      <span className={`font-serif leading-tight ${STREET[size]}`}>{streetName(listing.address)}</span>
      {size !== 'thumb' && <span className="sr-only">No photos yet</span>}
    </div>
  );

export default ListingCover;
