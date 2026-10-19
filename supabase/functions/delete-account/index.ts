// Supabase Edge Function (Deno): permanently deletes the calling user's account and all their data.
// Table rows go with the auth user (every user table has ON DELETE CASCADE); this function also removes
// the user's files from the private progress-photos bucket, which would otherwise be left behind.
import { createClient } from 'npm:@supabase/supabase-js@2';

const BUCKET = 'progress-photos';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  // Identify the caller from their JWT. The user id is never taken from the request body.
  const userClient = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } },
  });
  const { data: userData, error: userError } = await userClient.auth.getUser();
  if (userError || !userData.user) return json({ error: 'Sign in to delete your account.' }, 401);
  const userId = userData.user.id;

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

  try {
    // 1. Remove the user's photo files (everything under "<user id>/").
    for (;;) {
      const { data: files, error } = await admin.storage.from(BUCKET).list(userId, { limit: 100 });
      if (error) throw new Error(error.message);
      if (!files || files.length === 0) break;
      const { error: removeError } = await admin.storage.from(BUCKET).remove(files.map((f) => `${userId}/${f.name}`));
      if (removeError) throw new Error(removeError.message);
      if (files.length < 100) break;
    }

    // 2. Delete the auth user; foreign keys cascade to every table.
    const { error: deleteError } = await admin.auth.admin.deleteUser(userId);
    if (deleteError) throw new Error(deleteError.message);

    return json({ ok: true });
  } catch (error) {
    console.error('delete-account failed', error instanceof Error ? error.message : error);
    return json({ error: 'Could not finish deleting the account. Try again; deletion is safe to repeat.' }, 500);
  }
});
