import { createClient } from '@supabase/supabase-js';
import { NextRequest } from 'next/server';

export const runtime = 'edge';

export async function GET(_request: NextRequest, { params }: { params: { username: string } }) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey) {
    return Response.json({ error: 'Server configuration error' }, { status: 500 });
  }

  const username = decodeURIComponent(params.username).replace(/^@/, '');
  const supabase = createClient(supabaseUrl, supabaseAnonKey);

  const { data: profile, error } = await supabase
    .from('users')
    .select('id, username, display_name, avatar_url, bio, headline, niche_tags, is_verified, follower_count, following_count, created_at')
    .eq('username', username)
    .maybeSingle();

  if (error) return Response.json({ error: error.message }, { status: 500 });
  if (!profile) return Response.json({ error: 'User not found' }, { status: 404 });

  // Their published posts
  const { data: posts } = await supabase
    .from('posts')
    .select(`
      id, title, excerpt, content, tags, likes_count, comments_count,
      views_count, points_earned, is_trending, is_ai_enhanced, published_at
    `)
    .eq('user_id', profile.id)
    .not('published_at', 'is', null)
    .order('published_at', { ascending: false })
    .limit(30);

  const totalPoints = (posts ?? []).reduce((sum, p) => sum + (p.points_earned ?? 0), 0);
  const totalViews = (posts ?? []).reduce((sum, p) => sum + (p.views_count ?? 0), 0);

  return Response.json({
    profile,
    posts: posts ?? [],
    stats: {
      post_count: posts?.length ?? 0,
      total_views: totalViews,
      total_points_earned: totalPoints,
    },
  });
}
