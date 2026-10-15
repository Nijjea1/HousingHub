import { ImagePlus, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'wouter';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { useListingMutations } from '@/hooks/use-listings';
import { useUniversities } from '@/hooks/use-universities';
import { useProfile } from '@/hooks/use-user-profile';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { ApiError } from '@/lib/api';
import { LISTING_IMAGES_BUCKET, removeImages, uploadImage, validateImage } from '@/lib/storage';
import {
  AMENITIES,
  MAX_LISTING_IMAGES,
  PROPERTY_TYPES,
  PROPERTY_TYPE_LABELS,
  PROVINCES,
  listingInputSchema,
  type Listing,
  type ListingInput,
  type PropertyType,
  type Province,
} from '@shared/schema';

type TextField =
  | 'title'
  | 'description'
  | 'price'
  | 'bedrooms'
  | 'bathrooms'
  | 'squareFeet'
  | 'address'
  | 'neighborhood'
  | 'city'
  | 'postalCode'
  | 'availableFrom'
  | 'leaseTerm'
  | 'utilitiesIncluded';

interface FormState extends Record<TextField, string> {
  propertyType: PropertyType;
  province: Province;
  universityId: string | null;
  amenities: string[];
  petsAllowed: boolean;
  furnished: boolean;
  isAvailable: boolean;
  /** Photos already saved on the listing (edit mode). */
  keptImages: string[];
  newImages: File[];
}

type FieldErrors = Partial<Record<keyof ListingInput, string>>;

interface CreateListingFormProps {
  initialData?: Listing;
  mode?: 'create' | 'edit';
}

const initialState = (l?: Listing): FormState => ({
  title: l?.title ?? '',
  description: l?.description ?? '',
  price: l?.price?.toString() ?? '',
  bedrooms: l?.bedrooms?.toString() ?? '',
  bathrooms: l?.bathrooms?.toString() ?? '',
  squareFeet: l?.squareFeet?.toString() ?? '',
  address: l?.address ?? '',
  neighborhood: l?.neighborhood ?? '',
  city: l?.city ?? '',
  postalCode: l?.postalCode ?? '',
  availableFrom: l?.availableFrom ?? '',
  leaseTerm: l?.leaseTerm ?? '',
  utilitiesIncluded: l?.utilitiesIncluded.join(', ') ?? '',
  propertyType: l?.propertyType ?? 'apartment',
  province: l?.province ?? 'ON',
  universityId: l?.universityId ?? null,
  amenities: l?.amenities ?? [],
  petsAllowed: l?.petsAllowed ?? false,
  furnished: l?.furnished ?? false,
  isAvailable: l?.isAvailable ?? true,
  keptImages: l?.images ?? [],
  newImages: [],
});

const toNumberOrNull = (value: string) => (value.trim() === '' ? null : Number(value));

const removeButton =
  'absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-background/90 shadow-sm hover:bg-background';

const FormSection = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <section className="space-y-5">
    <h2 className="border-b pb-2 font-sans text-base font-semibold">{title}</h2>
    {children}
  </section>
);

const CreateListingForm = ({ initialData, mode = 'create' }: CreateListingFormProps) => {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const { createListing, updateListing } = useListingMutations();
  const { data: universities = [] } = useUniversities();
  const { data: profile } = useProfile(user?.id);
  const [form, setForm] = useState<FormState>(() => initialState(initialData));
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // New listings default to the landlord's own university once their profile loads.
  useEffect(() => {
    if (mode === 'create' && profile?.universityId) {
      setForm((f) => (f.universityId === null ? { ...f, universityId: profile.universityId } : f));
    }
  }, [mode, profile?.universityId]);

  const previews = useMemo(() => form.newImages.map((file) => URL.createObjectURL(file)), [form.newImages]);
  useEffect(() => () => previews.forEach((url) => URL.revokeObjectURL(url)), [previews]);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => setForm((f) => ({ ...f, [key]: value }));
  const text = (key: TextField) => ({
    id: `listing-${key}`,
    name: key,
    value: form[key],
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => set(key, e.target.value),
  });

  const imageCount = form.keptImages.length + form.newImages.length;

  const addImages = (files: FileList | null) => {
    if (!files) return;
    const chosen = Array.from(files);
    const invalid = chosen.map((f) => validateImage(f, LISTING_IMAGES_BUCKET)).find(Boolean);
    if (invalid) {
      setErrors((e) => ({ ...e, images: invalid }));
      return;
    }
    if (imageCount + chosen.length > MAX_LISTING_IMAGES) {
      setErrors((e) => ({ ...e, images: `Up to ${MAX_LISTING_IMAGES} photos per listing` }));
      return;
    }
    setErrors((e) => ({ ...e, images: undefined }));
    set('newImages', [...form.newImages, ...chosen]);
  };

  /** The listing as the API expects it, with the given photo URLs. */
  const toInput = (images: string[]) => ({
    title: form.title,
    description: form.description,
    detailedDescription: initialData?.detailedDescription ?? null,
    price: toNumberOrNull(form.price),
    propertyType: form.propertyType,
    bedrooms: toNumberOrNull(form.bedrooms),
    bathrooms: toNumberOrNull(form.bathrooms),
    squareFeet: toNumberOrNull(form.squareFeet),
    address: form.address,
    neighborhood: form.neighborhood || null,
    city: form.city,
    province: form.province,
    postalCode: form.postalCode,
    universityId: form.universityId,
    // The API fills in coordinates from the address.
    latitude: null,
    longitude: null,
    amenities: form.amenities,
    images,
    utilitiesIncluded: form.utilitiesIncluded.split(',').map((s) => s.trim()).filter(Boolean),
    nearbyPlaces: initialData?.nearbyPlaces ?? [],
    isAvailable: form.isAvailable,
    availableFrom: form.availableFrom || null,
    leaseTerm: form.leaseTerm || null,
    petsAllowed: form.petsAllowed,
    furnished: form.furnished,
    distanceFromCampus: initialData?.distanceFromCampus ?? null,
  });

  const showErrors = (fields: Record<string, string[] | undefined>, fallback: string) => {
    const next: FieldErrors = {};
    for (const [key, messages] of Object.entries(fields)) if (messages?.[0]) next[key as keyof ListingInput] = messages[0];
    setErrors(next);
    setFormError(Object.keys(next).length > 0 ? 'Please fix the highlighted fields.' : fallback);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setFormError(null);

    // Validate before uploading, so a mistake in the form never leaves orphaned photos in storage.
    // Placeholder URLs stand in for the photos that haven't been uploaded yet.
    const placeholders = form.newImages.map((_, i) => `https://upload.invalid/${i}`);
    const check = listingInputSchema.safeParse(toInput([...form.keptImages, ...placeholders]));
    if (!check.success) {
      showErrors(check.error.flatten().fieldErrors, 'Please check the form and try again.');
      return;
    }

    setSaving(true);
    setErrors({});
    const uploaded: string[] = [];
    try {
      for (const file of form.newImages) uploaded.push(await uploadImage(file, LISTING_IMAGES_BUCKET, user.id));
      const input = listingInputSchema.parse(toInput([...form.keptImages, ...uploaded]));
      if (mode === 'edit' && initialData) {
        await updateListing.mutateAsync({ id: initialData.id, input });
        // Only now that the listing no longer points at them can removed photos go.
        void removeImages(initialData.images.filter((url) => !form.keptImages.includes(url)), LISTING_IMAGES_BUCKET);
        toast.success('Listing updated');
      } else {
        await createListing.mutateAsync(input);
        toast.success('Listing created');
      }
      navigate('/profile/my-listings');
    } catch (err) {
      void removeImages(uploaded, LISTING_IMAGES_BUCKET);
      if (err instanceof ApiError && err.fields) showErrors(err.fields, err.message);
      else setFormError(err instanceof Error ? err.message : 'Could not save the listing.');
    } finally {
      setSaving(false);
    }
  };

  const fieldError = (key: keyof ListingInput) =>
    errors[key] ? (
      <p id={`listing-${key}-error`} className="mt-1 text-sm text-destructive">
        {errors[key]}
      </p>
    ) : null;
  const described = (key: keyof ListingInput) =>
    errors[key] ? { 'aria-invalid': true, 'aria-describedby': `listing-${key}-error` } : {};
  const label = (key: string, textLabel: string) => (
    <label htmlFor={`listing-${key}`} className="block text-sm font-medium text-foreground mb-1">
      {textLabel}
    </label>
  );

  return (
    <form className="mx-auto max-w-2xl space-y-10" onSubmit={submit} noValidate>
      <header>
        <p className="eyebrow mb-2">{mode === 'edit' ? 'Your listing' : 'New listing'}</p>
        <h1 className="text-3xl font-semibold">{mode === 'edit' ? 'Edit listing' : 'Post a place'}</h1>
        <p className="mt-2 text-muted-foreground">
          {mode === 'edit'
            ? 'Changes show up in search as soon as you save.'
            : 'Students see the address on a map with its distance from campus, so check it is right.'}
        </p>
      </header>
      {formError && (
        <p className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive" role="alert">
          {formError}
        </p>
      )}

      <FormSection title="The basics">
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <div className="md:col-span-2">
          {label('title', 'Title')}
          <Input {...text('title')} {...described('title')} placeholder="Bright room near campus" />
          {fieldError('title')}
        </div>
        <div>
          {label('price', 'Rent per month ($)')}
          <Input {...text('price')} {...described('price')} type="number" min="0" step="1" placeholder="850" />
          {fieldError('price')}
        </div>
        <div>
          <span className="block text-sm font-medium text-foreground mb-1" id="listing-type-label">
            Property type
          </span>
          <Select value={form.propertyType} onValueChange={(v: PropertyType) => set('propertyType', v)}>
            <SelectTrigger aria-labelledby="listing-type-label">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PROPERTY_TYPES.map((t) => (
                <SelectItem key={t} value={t}>
                  {PROPERTY_TYPE_LABELS[t]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          {label('bedrooms', 'Bedrooms')}
          <Input {...text('bedrooms')} {...described('bedrooms')} type="number" min="0" placeholder="2" />
          {fieldError('bedrooms')}
        </div>
        <div>
          {label('bathrooms', 'Bathrooms')}
          <Input {...text('bathrooms')} {...described('bathrooms')} type="number" min="0" step="0.5" placeholder="1.5" />
          {fieldError('bathrooms')}
        </div>
        <div>
          {label('squareFeet', 'Square feet (optional)')}
          <Input {...text('squareFeet')} {...described('squareFeet')} type="number" min="0" placeholder="750" />
          {fieldError('squareFeet')}
        </div>
        <div>
          <span className="block text-sm font-medium text-foreground mb-1" id="listing-university-label">
            Nearest university
          </span>
          <Select value={form.universityId ?? 'none'} onValueChange={(v) => set('universityId', v === 'none' ? null : v)}>
            <SelectTrigger aria-labelledby="listing-university-label">
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
          {fieldError('universityId')}
        </div>
      </div>
      <div>
        {label('description', 'Description')}
        <Textarea {...text('description')} {...described('description')} rows={5} placeholder="What makes this place good for students?" />
        {fieldError('description')}
      </div>
      </FormSection>

      <FormSection title="Where it is">
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <div className="md:col-span-2">
          {label('address', 'Street address')}
          <Input {...text('address')} {...described('address')} placeholder="123 Main St W" />
          {fieldError('address')}
        </div>
        <div>
          {label('neighborhood', 'Neighbourhood (optional)')}
          <Input {...text('neighborhood')} {...described('neighborhood')} placeholder="Westdale" />
          {fieldError('neighborhood')}
        </div>
        <div>
          {label('city', 'City')}
          <Input {...text('city')} {...described('city')} placeholder="Hamilton" />
          {fieldError('city')}
        </div>
        <div>
          <span className="block text-sm font-medium text-foreground mb-1" id="listing-province-label">
            Province
          </span>
          <Select value={form.province} onValueChange={(v: Province) => set('province', v)}>
            <SelectTrigger aria-labelledby="listing-province-label">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(PROVINCES).map(([code, name]) => (
                <SelectItem key={code} value={code}>
                  {name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          {label('postalCode', 'Postal code')}
          <Input {...text('postalCode')} {...described('postalCode')} placeholder="L8S 1C7" />
          {fieldError('postalCode')}
        </div>
      </div>
      </FormSection>

      <FormSection title={`Photos (${imageCount} of ${MAX_LISTING_IMAGES})`}>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {form.keptImages.map((url) => (
            <div key={url} className="relative">
              <img src={url} alt="" className="h-28 w-full rounded-md object-cover" />
              <button
                type="button"
                className={removeButton}
                onClick={() => set('keptImages', form.keptImages.filter((u) => u !== url))}
                aria-label="Remove photo"
              >
                <X className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            </div>
          ))}
          {previews.map((url, i) => (
            <div key={url} className="relative">
              <img src={url} alt="" className="h-28 w-full rounded-md object-cover" />
              <button
                type="button"
                className={removeButton}
                onClick={() => set('newImages', form.newImages.filter((_, j) => j !== i))}
                aria-label="Remove new photo"
              >
                <X className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            </div>
          ))}
        </div>
        {imageCount < MAX_LISTING_IMAGES && (
          <label
            htmlFor="listing-images"
            className="flex cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border border-dashed px-4 py-8 text-center focus-within:ring-2 focus-within:ring-ring hover:border-foreground/30 hover:bg-accent/50"
          >
            <ImagePlus className="h-6 w-6 text-muted-foreground" aria-hidden="true" />
            <span className="text-sm font-medium">Add photos</span>
            <span className="text-xs text-muted-foreground">JPEG, PNG or WebP, up to 5 MB each. The first photo is the cover.</span>
            <input
              id="listing-images"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              className="sr-only"
              onChange={(e) => {
                addImages(e.target.files);
                e.target.value = '';
              }}
              {...described('images')}
            />
          </label>
        )}
        {fieldError('images')}
      </FormSection>

      <FormSection title="Details">
      <fieldset>
        <legend className="mb-2 block text-sm font-medium">Amenities</legend>
        <div className="grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-3">
          {AMENITIES.map((amenity) => (
            <label key={amenity} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                className="h-4 w-4 accent-primary"
                checked={form.amenities.includes(amenity)}
                onChange={() =>
                  set(
                    'amenities',
                    form.amenities.includes(amenity) ? form.amenities.filter((a) => a !== amenity) : [...form.amenities, amenity],
                  )
                }
              />
              {amenity}
            </label>
          ))}
        </div>
      </fieldset>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          {label('availableFrom', 'Available from (optional)')}
          <Input {...text('availableFrom')} {...described('availableFrom')} type="date" />
          {fieldError('availableFrom')}
        </div>
        <div>
          {label('leaseTerm', 'Lease term (optional)')}
          <Input {...text('leaseTerm')} {...described('leaseTerm')} placeholder="12 months" />
          {fieldError('leaseTerm')}
        </div>
      </div>

      <div>
        {label('utilitiesIncluded', 'Utilities included (comma separated, optional)')}
        <Input {...text('utilitiesIncluded')} {...described('utilitiesIncluded')} placeholder="Water, heat" />
        {fieldError('utilitiesIncluded')}
      </div>

      <div className="flex flex-wrap gap-6">
        {(
          [
            ['petsAllowed', 'Pets allowed'],
            ['furnished', 'Furnished'],
            ['isAvailable', 'Available to rent (shown in search)'],
          ] as const
        ).map(([key, text]) => (
          <div key={key} className="flex items-center gap-2">
            <Checkbox id={`listing-${key}`} checked={form[key]} onCheckedChange={(checked) => set(key, checked === true)} />
            <label htmlFor={`listing-${key}`} className="text-sm font-medium text-foreground">
              {text}
            </label>
          </div>
        ))}
      </div>

      </FormSection>

      <div className="flex flex-col-reverse gap-3 border-t pt-6 sm:flex-row sm:justify-end">
        <Button type="button" variant="outline" onClick={() => history.back()} disabled={saving}>
          Cancel
        </Button>
        <Button type="submit" disabled={saving} className="sm:min-w-40">
          {saving ? 'Saving' : mode === 'edit' ? 'Save changes' : 'Post listing'}
        </Button>
      </div>
    </form>
  );
};

export default CreateListingForm;
