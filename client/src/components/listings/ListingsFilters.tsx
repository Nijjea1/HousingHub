import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  AMENITIES,
  DEFAULT_LISTING_FILTERS,
  PROPERTY_TYPES,
  PROPERTY_TYPE_LABELS,
  type ListingFilters,
} from '@shared/schema';

interface ListingsFiltersProps {
  value: ListingFilters;
  onChange: (filters: ListingFilters) => void;
}

const COUNT_OPTIONS: Array<{ label: string; value: number | null }> = [
  { label: 'Any', value: null },
  { label: '1+', value: 1 },
  { label: '2+', value: 2 },
  { label: '3+', value: 3 },
];

const toNumberOrNull = (raw: string) => (raw === '' ? null : Number(raw));
const toggle = <T,>(list: T[], item: T) => (list.includes(item) ? list.filter((x) => x !== item) : [...list, item]);
const slug = (s: string) => s.toLowerCase().replace(/\s+/g, '-');

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <fieldset className="space-y-3 border-t py-5 first:border-t-0 first:pt-0">
    <legend className="eyebrow float-left mb-3 w-full">{title}</legend>
    <div className="clear-both space-y-3">{children}</div>
  </fieldset>
);

const Check = ({ id, label, checked, onChange }: { id: string; label: string; checked: boolean; onChange: () => void }) => (
  <label htmlFor={id} className="flex cursor-pointer items-center gap-2.5 text-sm">
    <input id={id} type="checkbox" className="h-4 w-4 rounded border-input accent-primary" checked={checked} onChange={onChange} />
    {label}
  </label>
);

/** Every filter except sort and distance, which sit above the results. */
const ListingsFilters = ({ value, onChange }: ListingsFiltersProps) => {
  const set = (patch: Partial<ListingFilters>) => onChange({ ...value, ...patch });

  const countPicker = (label: string, current: number | null, key: 'minBedrooms' | 'minBathrooms') => (
    <Section title={label}>
      <div className="grid grid-cols-4 overflow-hidden rounded-md border" role="group" aria-label={label}>
        {COUNT_OPTIONS.map((option) => (
          <button
            key={option.label}
            type="button"
            aria-pressed={current === option.value}
            className={`border-l py-1.5 text-sm first:border-l-0 ${
              current === option.value ? 'bg-foreground font-medium text-background' : 'hover:bg-accent'
            }`}
            onClick={() => set({ [key]: option.value })}
          >
            {option.label}
          </button>
        ))}
      </div>
    </Section>
  );

  return (
    <div>
      <Section title="Monthly rent">
        <div className="grid grid-cols-2 gap-2">
          {(['minPrice', 'maxPrice'] as const).map((key) => (
            <div key={key} className="relative">
              <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm text-muted-foreground">$</span>
              <Input
                type="number"
                inputMode="numeric"
                min={0}
                placeholder={key === 'minPrice' ? 'Min' : 'Max'}
                aria-label={key === 'minPrice' ? 'Minimum rent' : 'Maximum rent'}
                className="pl-6 tabular-nums"
                value={value[key] ?? ''}
                onChange={(e) => set({ [key]: toNumberOrNull(e.target.value) })}
              />
            </div>
          ))}
        </div>
      </Section>

      {countPicker('Bedrooms', value.minBedrooms, 'minBedrooms')}
      {countPicker('Bathrooms', value.minBathrooms, 'minBathrooms')}

      <Section title="Type of place">
        {PROPERTY_TYPES.map((type) => (
          <Check
            key={type}
            id={`type-${type}`}
            label={PROPERTY_TYPE_LABELS[type]}
            checked={value.propertyTypes.includes(type)}
            onChange={() => set({ propertyTypes: toggle(value.propertyTypes, type) })}
          />
        ))}
      </Section>

      <Section title="Furnishing and pets">
        <Select
          value={value.furnished === null ? 'any' : value.furnished ? 'yes' : 'no'}
          onValueChange={(v) => set({ furnished: v === 'any' ? null : v === 'yes' })}
        >
          <SelectTrigger aria-label="Furnished">
            <SelectValue placeholder="Furnished or not" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="any">Furnished or not</SelectItem>
            <SelectItem value="yes">Furnished</SelectItem>
            <SelectItem value="no">Unfurnished</SelectItem>
          </SelectContent>
        </Select>
        <Check
          id="pets-allowed"
          label="Pets allowed"
          checked={value.petsAllowed === true}
          onChange={() => set({ petsAllowed: value.petsAllowed === true ? null : true })}
        />
      </Section>

      <Section title="Amenities">
        <div className="grid grid-cols-2 gap-x-3 gap-y-3">
          {AMENITIES.map((amenity) => (
            <Check
              key={amenity}
              id={`amenity-${slug(amenity)}`}
              label={amenity}
              checked={value.amenities.includes(amenity)}
              onChange={() => set({ amenities: toggle(value.amenities, amenity) })}
            />
          ))}
        </div>
      </Section>

      <button
        type="button"
        className="mt-1 text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
        onClick={() => onChange({ ...DEFAULT_LISTING_FILTERS, sortBy: value.sortBy })}
      >
        Reset filters
      </button>
    </div>
  );
};

export default ListingsFilters;
