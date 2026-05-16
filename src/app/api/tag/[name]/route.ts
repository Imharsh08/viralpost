import { createClient } from '@supabase/supabase-js';
import { NextRequest } from 'next/server';

export const runtime = 'edge';

export async function GET(request: NextRequest, { params }: { params: { name: string } }) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey) {
    return Response.json({ error: 'Server configuration error' }, { status: 500 });
  }

  const tag = decodeURIComponent(params.name);
  const { searchParams } = new URL(request.url);
  const sort = searchParams.get('sort') ?? 'trending'; // 'trending' | 'recent'

  const supabase = createClient(supabaseUrl, supabaseAnonKey);

  // Posts tagged with #tag or just 'tag' (we store both forms)
  const variants = [tag, `#${tag}`];

  let query = supabase
    .from('posts')
    .select(`
      id, title, excerpt, content, tags, likes_count, comments_count,
      shares_count, views_count, points_earned, is_trending, is_ai_enhanced,
      published_at, created_at,
      users!inner(id, username, display_name, avatar_url, is_verified)
    `)
    .not('published_at', 'is', null)
    .overlaps('tags', variants);

  if (sort === 'recent') {
    query = query.order('published_at', { ascending: false });
  } else {
    query = query.order('likes_count', { ascending: false }).order('views_count', { ascending: false });
  }

  const { data: posts, error } = await query.limit(50);
  if (error) return Response.json({ error: error.message }, { status: 500 });

  return Response.json({
    tag,
    post_count: posts?.length ?? 0,
    posts: posts ?? [],
  });
}
