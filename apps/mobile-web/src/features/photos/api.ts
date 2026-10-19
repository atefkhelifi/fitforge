import { prepareImage } from '@/features/nutrition/analyze';
import { localDateKey } from '@/lib/body';
import { Angle, base64ToBytes, Photo, photoPath } from '@/lib/photos';
import { supabase } from '@/lib/supabase';

const BUCKET = 'progress-photos';
const URL_LIFETIME_SECONDS = 3600;

async function requireUserId(): Promise<string> {
  if (!supabase) throw new Error('Photos need Supabase. Add your keys to .env first.');
  const { data } = await supabase.auth.getSession();
  if (!data.session) throw new Error('Sign in from the Profile tab to keep progress photos.');
  return data.session.user.id;
}

/** All of the user's photos, newest first, with short-lived signed URLs (the bucket is private). */
export async function listPhotos(): Promise<Photo[]> {
  await requireUserId();
  const client = supabase!;
  const { data: rows, error } = await client.from('progress_photos').select('*').order('date', { ascending: false }).order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  if (!rows || rows.length === 0) return [];

  const { data: signed, error: signError } = await client.storage.from(BUCKET).createSignedUrls(
    rows.map((r) => r.storage_path as string),
    URL_LIFETIME_SECONDS,
  );
  if (signError) throw new Error(signError.message);
  const urlByPath = new Map((signed ?? []).map((s) => [s.path, s.signedUrl]));

  return rows
    .filter((r) => urlByPath.get(r.storage_path))
    .map((r) => ({ id: r.id, date: r.date, angle: r.angle as Angle, path: r.storage_path, url: urlByPath.get(r.storage_path)! }));
}

export async function uploadPhoto(uri: string, angle: Angle): Promise<void> {
  const userId = await requireUserId();
  const client = supabase!;
  const bytes = base64ToBytes(await prepareImage(uri));
  const now = Date.now();
  const path = photoPath(userId, angle, now);

  const { error: uploadError } = await client.storage.from(BUCKET).upload(path, bytes, { contentType: 'image/jpeg' });
  if (uploadError) throw new Error(uploadError.message);

  const { error: insertError } = await client.from('progress_photos').insert({ date: localDateKey(now), angle, storage_path: path });
  if (insertError) {
    // Don't leave an orphaned file behind.
    await client.storage.from(BUCKET).remove([path]);
    throw new Error(insertError.message);
  }
}

export async function deletePhoto(photo: Photo): Promise<void> {
  await requireUserId();
  const client = supabase!;
  const { error } = await client.from('progress_photos').delete().eq('id', photo.id);
  if (error) throw new Error(error.message);
  await client.storage.from(BUCKET).remove([photo.path]);
}
