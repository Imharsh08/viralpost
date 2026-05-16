import { createClient } from '@supabase/supabase-js';
import { NextRequest } from 'next/server';

export const runtime = 'edge';

function getUserId(authHeader: string): string | null {
  try {
    const payload = JSON.parse(atob(authHeader.replace('Bearer ', '').split('.')[1]));
    return payload.sub ?? null;
  } catch { return null; }
}

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey) {
    return Response.json({ error: 'Server configuration error' }, { status: 500 });
  }

  const authHeader = request.headers.get('Authorization') ?? '';
  const viewerId = getUserId(authHeader);

  // Authenticated client (RLS allows draft access for owner; anon for published)
  const supabase = createClient(supabaseUrl, supabaseAnonKey, authHeader
    ? { global: { headers: { Authorization: authHeader } } }
    : {});

  const { data: post, error } = await supabase
    .from('posts')
    .select(`
      id, title, excerpt, content, tags, featured_image_url, likes_count, comments_count,
      shares_count, views_count, points_earned, is_trending, is_ai_enhanced,
      published_at, created_at, user_id,
      users!inner(id, username, display_name, avatar_url, is_verified, bio, follower_count)
    `)
    .eq('id', params.id)
    .maybeSingle();

  if (error) return Response.json({ error: error.message }, { status: 500 });
  if (!post) return Response.json({ error: 'Post not found' }, { status: 404 });

  // Drafts are only readable by the owner
  if (!post.published_at && post.user_id !== viewerId) {
    return Response.json({ error: 'Post not found' }, { status: 404 });
  }

  return Response.json({ post });
}
