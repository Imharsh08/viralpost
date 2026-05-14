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
  const { searchParams } = new URL(request.url);
  const filter = searchParams.get('filter') ?? 'all';

  let query = supabase
    .from('posts')
    .select('id, title, excerpt, content, tags, likes_count, comments_count, shares_count, views_count, points_earned, is_trending, is_ai_enhanced, published_at, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (filter === 'published') query = query.not('published_at', 'is', null);
  else if (filter === 'drafts') query = query.is('published_at', null);

  const { data: posts, error } = await query;
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ posts });
}

export async function DELETE(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey) return Response.json({ error: 'Server error' }, { status: 500 });

  const authHeader = request.headers.get('Authorization') ?? '';
  const userId = getUserId(authHeader);
  if (!userId) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = makeClient(supabaseUrl, supabaseAnonKey, authHeader);
  const { id } = await request.json();
  if (!id) return Response.json({ error: 'Post id required' }, { status: 400 });

  const { error } = await supabase.from('posts').delete().eq('id', id).eq('user_id', userId);
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ success: true });
}
