import { createClient } from '@supabase/supabase-js';
import { NextRequest } from 'next/server';

export const runtime = 'edge';

function getUserId(authHeader: string): string | null {
  try {
    const payload = JSON.parse(atob(authHeader.replace('Bearer ', '').split('.')[1]));
    return payload.sub ?? null;
  } catch { return null; }
}

export async function POST(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey) {
    return Response.json({ error: 'Server configuration error' }, { status: 500 });
  }

  const authHeader = request.headers.get('Authorization') ?? '';
  const userId = getUserId(authHeader);
  if (!userId) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { niche_tags, headline, bio, display_name } = await request.json();

  if (!Array.isArray(niche_tags) || niche_tags.length < 1 || niche_tags.length > 5) {
    return Response.json({ error: 'Pick 1–5 niche topics' }, { status: 400 });
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
  });

  const updates: Record<string, any> = {
    niche_tags,
    onboarded_at: new Date().toISOString(),
  };
  if (typeof headline === 'string') updates.headline = headline.slice(0, 160);
  if (typeof bio === 'string') updates.bio = bio.slice(0, 500);
  if (typeof display_name === 'string' && display_name.trim().length > 0) {
    updates.display_name = display_name.trim().slice(0, 80);
  }

  const { error } = await supabase.from('users').update(updates).eq('id', userId);
  if (error) return Response.json({ error: error.message }, { status: 500 });

  return Response.json({ ok: true });
}
