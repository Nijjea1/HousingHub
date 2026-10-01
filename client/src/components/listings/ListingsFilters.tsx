import { motion } from 'framer-motion';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  AMENITIES,
  DEFAULT_LISTING_FILTERS,
  PROPERTY_TYPES,
  PROPERTY_TYPE_LABELS,
  type ListingFilters,
  type SortOption,
} from '@shared/schema';

interface ListingsFiltersProps {
  value: ListingFilters;
  onChange: (filters: ListingFilters) => void;
}

const SORT_LABELS: Record<SortOption, string> = {
  newest: 'Newest first',
  'price-low': 'Price: low to high',
  'price-high': 'Price: high to low',
};

const COUNT_OPTIONS: Array<{ label: string; value: number | null }> = [
  { label: 'Any', value: null },
  { label: '1+', value: 1 },
  { label: '2+', value: 2 },
  { label: '3+', value: 3 },
];

const toNumberOrNull = (raw: string) => (raw === '' ? null : Number(raw));

const toggle = <T,>(list: T[], item: T) =>
  list.includes(item) ? list.filter((x) => x !== item) : [...list, item];

const pillClass = (active: boolean) =>
  `border rounded-full px-3 py-2 text-sm ${
    active
      ? 'bg-primary-600 text-white border-primary-600'
      : 'text-gray-700 hover:bg-primary-50 hover:border-primary-500'
  } transition-colors`;

const checkboxClass = 'h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded';
const sectionLabelClass = 'block text-sm font-semibold text-primary-700 mb-3 flex items-center';
const priceInputClass =
  'pl-8 block w-full rounded-full border-gray-200 shadow-sm focus:border-primary-500 focus:ring focus:ring-primary-500 focus:ring-opacity-30 text-sm py-2.5 border';

const ListingsFilters = ({ value, onChange }: ListingsFiltersProps) => {
  const set = (patch: Partial<ListingFilters>) => onChange({ ...value, ...patch });

  const countPicker = (label: string, icon: string, current: number | null, key: 'minBedrooms' | 'minBathrooms') => (
    <div>
      <label className={sectionLabelClass}>
        <i className={`fas ${icon} mr-2 text-primary-600`}></i>
        {label}
      </label>
      <div className="grid grid-cols-4 gap-2">
        {COUNT_OPTIONS.map((option) => (
          <motion.button
            key={option.label}
            type="button"
            className={pillClass(current === option.value)}
            whileTap={{ scale: 0.95 }}
            onClick={() => set({ [key]: option.value })}
          >
            {option.label}
          </motion.button>
        ))}
      </div>
    </div>
  );

  return (
    <div className="bg-white rounded-2xl shadow-lg p-6 sticky top-24 border border-blue-100">
      <div className="flex items-center justify-between gap-3 mb-6">
        <div className="flex items-center">
          <div className="w-10 h-10 bg-primary-50 rounded-full flex items-center justify-center mr-2">
            <i className="fas fa-filter text-primary-700"></i>
          </div>
          <h3 className="text-xl font-semibold text-primary-800">Refine results</h3>
        </div>

        <Select value={value.sortBy} onValueChange={(sortBy) => set({ sortBy: sortBy as SortOption })}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(SORT_LABELS).map(([option, label]) => (
              <SelectItem key={option} value={option}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-6">
        <div className="bg-gray-50 rounded-xl p-4">
          <label className={sectionLabelClass}>
            <i className="fas fa-dollar-sign mr-2 text-primary-600"></i>
            Monthly rent
          </label>
          <div className="grid grid-cols-2 gap-3">
            {(['minPrice', 'maxPrice'] as const).map((key) => (
              <div key={key} className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-500 text-sm">$</span>
                <input
                  type="number"
                  min={0}
                  placeholder={key === 'minPrice' ? 'Min' : 'Max'}
                  aria-label={key === 'minPrice' ? 'Minimum rent' : 'Maximum rent'}
                  className={priceInputClass}
                  value={value[key] ?? ''}
                  onChange={(e) => set({ [key]: toNumberOrNull(e.target.value) })}
                />
              </div>
            ))}
          </div>
        </div>

        {countPicker('Bedrooms', 'fa-bed', value.minBedrooms, 'minBedrooms')}
        {countPicker('Bathrooms', 'fa-bath', value.minBathrooms, 'minBathrooms')}

        <div>
          <label className={sectionLabelClass}>
            <i className="fas fa-couch mr-2 text-primary-600"></i>
            Furnished
          </label>
          <Select
            value={value.furnished === null ? 'any' : value.furnished ? 'yes' : 'no'}
            onValueChange={(v) => set({ furnished: v === 'any' ? null : v === 'yes' })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Any" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="any">Any</SelectItem>
              <SelectItem value="yes">Furnished</SelectItem>
              <SelectItem value="no">Unfurnished</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center">
          <input
            type="checkbox"
            id="pets-allowed"
            className={checkboxClass}
            checked={value.petsAllowed === true}
            onChange={(e) => set({ petsAllowed: e.target.checked ? true : null })}
          />
          <label htmlFor="pets-allowed" className="ml-2 text-sm text-gray-700">Pets allowed</label>
        </div>

        <Accordion type="single" collapsible className="bg-gray-50 rounded-xl p-4">
          <AccordionItem value="amenities" className="border-none">
            <AccordionTrigger className="py-0">
              <div className="flex items-center text-sm font-semibold text-primary-700">
                <i className="fas fa-check-circle mr-2 text-primary-600"></i>
                Amenities
              </div>
            </AccordionTrigger>
            <AccordionContent className="pt-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {AMENITIES.map((amenity) => {
                  const id = `amenity-${amenity.toLowerCase().replace(/\s+/g, '-')}`;
                  return (
                    <div key={amenity} className="flex items-center bg-white p-2 rounded-lg">
                      <input
                        type="checkbox"
                        id={id}
                        className={checkboxClass}
                        checked={value.amenities.includes(amenity)}
                        onChange={() => set({ amenities: toggle(value.amenities, amenity) })}
                      />
                      <label htmlFor={id} className="ml-2 text-sm text-gray-700">{amenity}</label>
                    </div>
                  );
                })}
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>

        <div>
          <label className={sectionLabelClass}>
            <i className="fas fa-home mr-2 text-primary-600"></i>
            Housing type
          </label>
          <div className="grid grid-cols-2 gap-2">
            {PROPERTY_TYPES.map((type) => (
              <div key={type} className="flex items-center">
                <input
                  type="checkbox"
                  id={`type-${type}`}
                  className={checkboxClass}
                  checked={value.propertyTypes.includes(type)}
                  onChange={() => set({ propertyTypes: toggle(value.propertyTypes, type) })}
                />
                <label htmlFor={`type-${type}`} className="ml-2 text-sm text-gray-700">
                  {PROPERTY_TYPE_LABELS[type]}
                </label>
              </div>
            ))}
          </div>
        </div>

        <button
          type="button"
          className="w-full text-gray-600 hover:text-primary-700 transition-colors text-sm py-2"
          onClick={() => onChange(DEFAULT_LISTING_FILTERS)}
        >
          Reset all
        </button>
      </div>
    </div>
  );
};

export default ListingsFilters;
