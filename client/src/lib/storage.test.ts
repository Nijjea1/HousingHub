import { beforeEach, describe, expect, it, vi } from 'vitest';

const remove = vi.fn();
vi.mock('./supabase', () => ({ supabase: { storage: { from: () => ({ remove }) } } }));

const { LISTING_IMAGES_BUCKET, PROFILE_PICTURES_BUCKET, removeImages, storagePath } = await import('./storage');

const ours = (path: string) => `https://abc.supabase.co/storage/v1/object/public/${LISTING_IMAGES_BUCKET}/${path}`;

describe('storagePath', () => {
  it('finds the file path behind our public URL', () => {
    expect(storagePath(ours('user-1/photo.jpg'), LISTING_IMAGES_BUCKET)).toBe('user-1/photo.jpg');
    expect(storagePath(ours('user-1/a%20b.jpg'), LISTING_IMAGES_BUCKET)).toBe('user-1/a b.jpg');
  });

  it('ignores other sites and other buckets', () => {
    expect(storagePath('https://images.unsplash.com/photo-1', LISTING_IMAGES_BUCKET)).toBeNull();
    expect(storagePath(ours('user-1/photo.jpg'), PROFILE_PICTURES_BUCKET)).toBeNull();
  });
});

describe('removeImages', () => {
  beforeEach(() => {
    remove.mockReset();
  });

  it('removes only our files, in one call', async () => {
    await removeImages([ours('u/1.jpg'), 'https://example.com/x.jpg', ours('u/2.jpg')], LISTING_IMAGES_BUCKET);
    expect(remove).toHaveBeenCalledTimes(1);
    expect(remove).toHaveBeenCalledWith(['u/1.jpg', 'u/2.jpg']);
  });

  it('makes no call when nothing is ours', async () => {
    await removeImages(['https://example.com/x.jpg'], LISTING_IMAGES_BUCKET);
    expect(remove).not.toHaveBeenCalled();
  });

  it('never throws, so a failed cleanup cannot fail a save', async () => {
    remove.mockRejectedValue(new Error('offline'));
    await expect(removeImages([ours('u/1.jpg')], LISTING_IMAGES_BUCKET)).resolves.toBeUndefined();
  });
});
