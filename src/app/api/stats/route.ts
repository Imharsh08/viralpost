export const runtime = 'edge';

import { createClient } from '@supabase/supabase-js';

export async function GET() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      return Response.json({ error: 'Server configuration error' }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    const [creatorsResult, postsWeekResult, trendingResult] = await Promise.all([
      // Count distinct users who have published at least one post
      supabase
        .from('users')
        .select('id', { count: 'exact', head: true }),
      // Count posts published in the last 7 days
      supabase
        .from('posts')
        .select('id', { count: 'exact', head: true })
        .not('published_at', 'is', null)
        .gte('published_at', weekAgo),
      // Count trending posts
      supabase
        .from('posts')
        .select('id', { count: 'exact', head: true })
        .eq('is_trending', true)
        .not('published_at', 'is', null),
    ]);

    return Response.json({
      activeCreators: creatorsResult.count ?? 0,
      postsThisWeek: postsWeekResult.count ?? 0,
      trendingNow: trendingResult.count ?? 0,
    });
  } catch (error) {
    console.error('GET /api/stats error:', error);
    return Response.json({ error: 'Failed to fetch stats' }, { status: 500 });
  }
}
