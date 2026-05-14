import { createClient } from '@supabase/supabase-js';
import { NextRequest } from 'next/server';

export const runtime = 'edge';

function getUserId(authHeader: string): string | null {
  try {
    const payload = JSON.parse(atob(authHeader.replace('Bearer ', '').split('.')[1]));
    return payload.sub ?? null;
  } catch { return null; }
}

function makeClient(url: string, key: string, authHeader?: string) {
  return createClient(url, key, authHeader ? { global: { headers: { Authorization: authHeader } } } : {});
}

async function getFollowerCount(supabase: any, userId: string): Promise<number> {
  const { data } = await supabase.from('users').select('follower_count').eq('id', userId).single();
  return data?.follower_count ?? 0;
}

export async function GET(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey) return Response.json({ error: 'Server error' }, { status: 500 });

  const { searchParams } = new URL(request.url);
  const followingId = searchParams.get('following_id');
  if (!followingId) return Response.json({ is_following: false });

  const authHeader = request.headers.get('Authorization') ?? '';
  const viewerId = getUserId(authHeader);
  if (!viewerId) return Response.json({ is_following: false });

  const supabase = makeClient(supabaseUrl, supabaseAnonKey);
  const { data } = await supabase
    .from('follows')
    .select('id')
    .eq('follower_id', viewerId)
    .eq('following_id', followingId)
    .maybeSingle();

  return Response.json({ is_following: !!data });
}

export async function POST(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey) return Response.json({ error: 'Server error' }, { status: 500 });

  const authHeader = request.headers.get('Authorization') ?? '';
  const userId = getUserId(authHeader);
  if (!userId) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { following_id } = await request.json();
  if (!following_id) return Response.json({ error: 'following_id required' }, { status: 400 });
  if (userId === following_id) return Response.json({ error: 'Cannot follow yourself' }, { status: 400 });

  const supabase = makeClient(supabaseUrl, supabaseAnonKey, authHeader);
  const { error } = await supabase
    .from('follows')
    .insert({ follower_id: userId, following_id });

  if (error) {
    if (error.code === '23505') {
      // Already following — return current count as if success
      const follower_count = await getFollowerCount(supabase, following_id);
      return Response.json({ ok: true, follower_count }, { status: 409 });
    }
    return Response.json({ error: error.message }, { status: 500 });
  }

  const follower_count = await getFollowerCount(supabase, following_id);
  return Response.json({ ok: true, follower_count });
}

export async function DELETE(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey) return Response.json({ error: 'Server error' }, { status: 500 });

  const authHeader = request.headers.get('Authorization') ?? '';
  const userId = getUserId(authHeader);
  if (!userId) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { following_id } = await request.json();
  if (!following_id) return Response.json({ error: 'following_id required' }, { status: 400 });

  const supabase = makeClient(supabaseUrl, supabaseAnonKey, authHeader);
  const { error } = await supabase
    .from('follows')
    .delete()
    .eq('follower_id', userId)
    .eq('following_id', following_id);

  if (error) return Response.json({ error: error.message }, { status: 500 });

  const follower_count = await getFollowerCount(supabase, following_id);
  return Response.json({ ok: true, follower_count });
}
