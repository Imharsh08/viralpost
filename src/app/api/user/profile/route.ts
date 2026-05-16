import { createClient } from '@supabase/supabase-js';
import { NextRequest } from 'next/server';

export const runtime = 'edge';

function getUserId(authHeader: string): string | null {
  try {
    const payload = JSON.parse(atob(authHeader.replace('Bearer ', '').split('.')[1]));
    return payload.sub ?? null;
  } catch { return null; }
}

function makeClient(url: string, key: string, authHeader: string) {
  return createClient(url, key, { global: { headers: { Authorization: authHeader } } });
}

export async function GET(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey) return Response.json({ error: 'Server error' }, { status: 500 });

  const authHeader = request.headers.get('Authorization') ?? '';
  const userId = getUserId(authHeader);
  if (!userId) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = makeClient(supabaseUrl, supabaseAnonKey, authHeader);

  // Run profile + stats queries in parallel
  const [profileRes, statsRes] = await Promise.all([
    supabase
      .from('users')
      .select('id, username, display_name, avatar_url, bio, headline, niche_tags, is_verified, email, follower_count, following_count, points_balance, created_at')
      .eq('id', userId)
      .single(),
    supabase
      .from('posts')
      .select('views_count, likes_count, points_earned, published_at')
      .eq('user_id', userId),
  ]);

  if (profileRes.error) return Response.json({ error: profileRes.error.message }, { status: 500 });

  const stats = statsRes.data ?? [];
  return Response.json({
    profile: profileRes.data,
    stats: {
      totalViews: stats.reduce((s, p) => s + (p.views_count ?? 0), 0),
      totalLikes: stats.reduce((s, p) => s + (p.likes_count ?? 0), 0),
      totalPoints: stats.reduce((s, p) => s + (p.points_earned ?? 0), 0),
      totalPublished: stats.filter((p) => p.published_at).length,
      totalDrafts: stats.filter((p) => !p.published_at).length,
    },
  });
}

export async function PATCH(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey) return Response.json({ error: 'Server error' }, { status: 500 });

  const authHeader = request.headers.get('Authorization') ?? '';
  const userId = getUserId(authHeader);
  if (!userId) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = makeClient(supabaseUrl, supabaseAnonKey, authHeader);
  const body = await request.json();

  const updates: Record<string, any> = {};

  if (typeof body.display_name === 'string') {
    const v = body.display_name.trim();
    if (v.length < 1 || v.length > 80) {
      return Response.json({ error: 'Display name must be 1–80 characters' }, { status: 400 });
    }
    updates.display_name = v;
  }
  if (typeof body.username === 'string') {
    const v = body.username.trim().toLowerCase();
    if (!/^[a-z0-9_]{3,30}$/.test(v)) {
      return Response.json({ error: 'Username: 3–30 chars, letters/numbers/underscore only' }, { status: 400 });
    }
    updates.username = v;
  }
  if (typeof body.bio === 'string') updates.bio = body.bio.slice(0, 500);
  if (typeof body.headline === 'string') updates.headline = body.headline.slice(0, 160);
  if (typeof body.avatar_url === 'string') updates.avatar_url = body.avatar_url;
  if (Array.isArray(body.niche_tags)) {
    const clean = body.niche_tags
      .filter((t: any) => typeof t === 'string' && t.trim())
      .slice(0, 5);
    updates.niche_tags = clean;
  }

  const { data, error } = await supabase.from('users').update(updates).eq('id', userId).select().single();
  if (error) {
    if (error.code === '23505') {
      return Response.json({ error: 'That username is taken' }, { status: 409 });
    }
    return Response.json({ error: error.message }, { status: 500 });
  }
  return Response.json({ profile: data });
}
