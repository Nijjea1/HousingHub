import { supabase } from './supabase';

export const LISTING_IMAGES_BUCKET = 'listing-images';
export const PROFILE_PICTURES_BUCKET = 'profile-pictures';

const MAX_BYTES: Record<string, number> = {
  [LISTING_IMAGES_BUCKET]: 5 * 1024 * 1024,
  [PROFILE_PICTURES_BUCKET]: 2 * 1024 * 1024,
};
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

/** Checks a file against the bucket limits so users get an error before uploading. */
export function validateImage(file: File, bucket: string): string | null {
  if (!ALLOWED_TYPES.includes(file.type)) return `${file.name}: only JPEG, PNG or WebP images are allowed`;
  const max = MAX_BYTES[bucket];
  if (max && file.size > max) return `${file.name}: must be under ${max / (1024 * 1024)} MB`;
  return null;
}

/**
 * Uploads into the user's own folder (required by the storage policies) and
 * returns the public URL.
 */
export async function uploadImage(file: File, bucket: string, userId: string): Promise<string> {
  const extension = file.name.split('.').pop()?.toLowerCase() || 'jpg';
  const path = `${userId}/${crypto.randomUUID()}.${extension}`;

  const { error } = await supabase.storage.from(bucket).upload(path, file, {
    cacheControl: '3600',
    contentType: file.type,
  });
  if (error) throw error;

  return supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl;
}

/** The file path inside `bucket` behind one of our public URLs, or null for any other URL. */
export function storagePath(url: string, bucket: string): string | null {
  const marker = `/storage/v1/object/public/${bucket}/`;
  const at = url.indexOf(marker);
  return at === -1 ? null : decodeURIComponent(url.slice(at + marker.length));
}

/**
 * Deletes the files behind these URLs once nothing points at them. Best effort: the storage
 * policies only let users delete their own files, and a leftover file costs storage, not data.
 */
export async function removeImages(urls: string[], bucket: string): Promise<void> {
  const paths = urls.map((url) => storagePath(url, bucket)).filter((p): p is string => p !== null);
  if (paths.length === 0) return;
  try {
    await supabase.storage.from(bucket).remove(paths);
  } catch {
    // Ignored on purpose, see above.
  }
}
