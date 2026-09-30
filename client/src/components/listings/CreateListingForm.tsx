import { useState } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '@/contexts/AuthContext';
import { useListingMutations } from '@/hooks/use-listings';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import {
  AMENITIES,
  listingInputSchema,
  PROPERTY_TYPES,
  PROPERTY_TYPE_LABELS,
  PROVINCES,
  type Listing,
  type PropertyType,
  type Province,
} from '@shared/schema';
import { LISTING_IMAGES_BUCKET, uploadImage, validateImage } from '@/lib/storage';

type FormData = {
  title: string;
  description: string;
  price: string;
  type: PropertyType;
  bedrooms: string;
  bathrooms: string;
  squareFeet: string;
  address: string;
  neighborhood: string;
  city: string;
  province: Province;
  postalCode: string;
  amenities: string[];
  images: File[];
  availableFrom: string;
  leaseTerm: string;
  petsAllowed: boolean;
  furnished: boolean;
  utilitiesIncluded: string;
};

interface CreateListingFormProps {
  initialData?: Partial<Listing>;
  mode?: 'create' | 'edit';
}

const CreateListingForm = ({ initialData, mode = 'create' }: CreateListingFormProps) => {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const { createListing, updateListing } = useListingMutations();
  const [form, setForm] = useState<FormData>({
    title: initialData?.title || '',
    description: initialData?.description || '',
    price: initialData?.price?.toString() || '',
    type: initialData?.propertyType || 'apartment',
    bedrooms: initialData?.bedrooms?.toString() || '',
    bathrooms: initialData?.bathrooms?.toString() || '',
    squareFeet: initialData?.squareFeet?.toString() || '',
    address: initialData?.address || '',
    neighborhood: initialData?.neighborhood || '',
    city: initialData?.city || '',
    province: initialData?.province || 'ON',
    postalCode: initialData?.postalCode || '',
    amenities: initialData?.amenities || [],
    images: [],
    availableFrom: initialData?.availableFrom || '',
    leaseTerm: initialData?.leaseTerm || '',
    petsAllowed: initialData?.petsAllowed || false,
    furnished: initialData?.furnished || false,
    utilitiesIncluded: initialData?.utilitiesIncluded?.join(', ') || '',
  });
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;
    if (type === 'checkbox') {
      setForm(prev => ({ ...prev, [name]: (e.target as HTMLInputElement).checked }));
    } else {
      setForm(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleAmenityChange = (amenity: string) => {
    setForm(prev => ({
      ...prev,
      amenities: prev.amenities.includes(amenity)
        ? prev.amenities.filter(a => a !== amenity)
        : [...prev.amenities, amenity]
    }));
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      setForm(prev => ({ ...prev, images: files }));
      setImagePreviews(files.map(file => URL.createObjectURL(file)));
    }
  };

  const toNumberOrNull = (value: string) => (value.trim() === '' ? null : Number(value));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast.error('You must be logged in to create a listing');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      // Upload any newly selected images, keeping existing ones when editing
      let images = initialData?.images ?? [];
      if (form.images.length > 0) {
        images = [];
        for (const file of form.images) {
          const invalid = validateImage(file, LISTING_IMAGES_BUCKET);
          if (invalid) throw new Error(invalid);
          images.push(await uploadImage(file, LISTING_IMAGES_BUCKET, user.id));
        }
      }

      // Validate against the shared schema, the same rules the server uses
      const parsed = listingInputSchema.safeParse({
        title: form.title,
        description: form.description,
        detailedDescription: null,
        price: toNumberOrNull(form.price),
        propertyType: form.type,
        bedrooms: toNumberOrNull(form.bedrooms),
        bathrooms: toNumberOrNull(form.bathrooms),
        squareFeet: toNumberOrNull(form.squareFeet),
        address: form.address,
        neighborhood: form.neighborhood || null,
        city: form.city,
        province: form.province,
        postalCode: form.postalCode,
        universityId: initialData?.universityId ?? null,
        latitude: initialData?.latitude ?? null,
        longitude: initialData?.longitude ?? null,
        amenities: form.amenities,
        images,
        utilitiesIncluded: form.utilitiesIncluded
          ? form.utilitiesIncluded.split(',').map(s => s.trim()).filter(Boolean)
          : [],
        nearbyPlaces: initialData?.nearbyPlaces ?? [],
        isAvailable: initialData?.isAvailable ?? true,
        availableFrom: form.availableFrom || null,
        leaseTerm: form.leaseTerm || null,
        petsAllowed: form.petsAllowed,
        furnished: form.furnished,
        distanceFromCampus: initialData?.distanceFromCampus ?? null,
      });

      if (!parsed.success) {
        throw new Error(parsed.error.issues[0]?.message ?? 'Please check the form and try again');
      }

      if (mode === 'edit' && initialData?.id) {
        await updateListing.mutateAsync({ id: initialData.id, input: parsed.data });
        toast.success('Listing updated successfully');
      } else {
        await createListing.mutateAsync({ userId: user.id, input: parsed.data });
        toast.success('Listing created successfully');
      }
      setLocation('/profile/my-listings');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to save listing';
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <form className="space-y-6 bg-white p-8 rounded-xl shadow-lg max-w-2xl mx-auto mt-8" onSubmit={handleSubmit}>
        <h2 className="text-2xl font-bold mb-4">{mode === 'edit' ? 'Edit listing' : 'Create a new listing'}</h2>
        {error && <div className="text-red-600 text-sm">{error}</div>}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
            <Input name="title" value={form.title} onChange={handleChange} required />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Price per month</label>
            <Input name="price" type="number" value={form.price} onChange={handleChange} required min="0" step="0.01" placeholder="850" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Property type</label>
            <Select
              value={form.type}
              onValueChange={(value: PropertyType) => setForm(prev => ({ ...prev, type: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select property type" />
              </SelectTrigger>
              <SelectContent>
                {PROPERTY_TYPES.map(type => (
                  <SelectItem key={type} value={type}>{PROPERTY_TYPE_LABELS[type]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Bedrooms</label>
            <Input name="bedrooms" type="number" value={form.bedrooms} onChange={handleChange} required min="0" placeholder="2" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Bathrooms</label>
            <Input name="bathrooms" type="number" value={form.bathrooms} onChange={handleChange} required min="0" step="0.5" placeholder="1.5" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Square feet</label>
            <Input name="squareFeet" type="number" value={form.squareFeet} onChange={handleChange} min="0" placeholder="750" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
            <Input name="address" value={form.address} onChange={handleChange} required placeholder="123 University Ave" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Neighborhood</label>
            <Input name="neighborhood" value={form.neighborhood} onChange={handleChange} placeholder="Westdale" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
            <Input name="city" value={form.city} onChange={handleChange} required placeholder="Hamilton" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Province</label>
            <Select
              value={form.province}
              onValueChange={(value: Province) => setForm(prev => ({ ...prev, province: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select province" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(PROVINCES).map(([code, name]) => (
                  <SelectItem key={code} value={code}>{name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Postal code</label>
            <Input name="postalCode" value={form.postalCode} onChange={handleChange} required placeholder="L8S 1C7" />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
          <Textarea name="description" value={form.description} onChange={handleChange} required rows={4} placeholder="Describe your property..." />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Images</label>
          <input type="file" accept="image/*" multiple onChange={handleImageChange} />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-2">
            {imagePreviews.map((url, idx) => (
              <img key={idx} src={url} alt={`Preview ${idx + 1}`} className="rounded-lg object-cover w-full h-32" />
            ))}
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Amenities</label>
          <div className="flex flex-wrap gap-2">
            {AMENITIES.map(amenity => (
              <label key={amenity} className="flex items-center gap-1">
                <input
                  type="checkbox"
                  checked={form.amenities.includes(amenity)}
                  onChange={() => handleAmenityChange(amenity)}
                />
                {amenity}
              </label>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Available from</label>
            <Input name="availableFrom" type="date" value={form.availableFrom} onChange={handleChange} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Lease term</label>
            <Input name="leaseTerm" value={form.leaseTerm} onChange={handleChange} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Pets allowed</label>
            <Checkbox checked={form.petsAllowed} onCheckedChange={checked => setForm(prev => ({ ...prev, petsAllowed: !!checked }))} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Furnished</label>
            <Checkbox checked={form.furnished} onCheckedChange={checked => setForm(prev => ({ ...prev, furnished: !!checked }))} />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Utilities included (comma separated)</label>
          <Input name="utilitiesIncluded" value={form.utilitiesIncluded} onChange={handleChange} />
        </div>
        <Button type="submit" disabled={loading} className="w-full mt-4">
          {loading ? 'Saving...' : mode === 'edit' ? 'Save changes' : 'Create listing'}
        </Button>
      </form>
    </div>
  );
};

export default CreateListingForm;
