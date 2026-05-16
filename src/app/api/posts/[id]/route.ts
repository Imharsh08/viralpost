import { createClient } from '@supabase/supabase-js';
import { NextRequest } from 'next/server';

export const runtime = 'edge';

export async function GET(_request: NextRequest, { params }: { params: { id: string } }) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey) {
    return Response.json({ error: 'Server configuration error' }, { status: 500 });
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey);

  const { data: post, error } = await supabase
    .from('posts')
    .select(`
      id, title, excerpt, content, tags, likes_count, comments_count,
      shares_count, views_count, points_earned, is_trending, is_ai_enhanced,
      published_at, created_at,
      users!inner(id, username, display_name, avatar_url, is_verified, bio, follower_count)
    `)
    .eq('id', params.id)
    .not('published_at', 'is', null)
    .maybeSingle();

  if (error) return Response.json({ error: error.message }, { status: 500 });
  if (!post) return Response.json({ error: 'Post not found' }, { status: 404 });

  return Response.json({ post });
}
