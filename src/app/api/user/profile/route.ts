import { createClient } from '@supabase/supabase-js';
import { NextRequest } from 'next/server';

export const runtime = 'edge';

export async function GET(request: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!supabaseUrl || !supabaseAnonKey) return Response.json({ error: 'Server error' }, { status: 500 });

    const authHeader = request.headers.get('Authorization');
    if (!authHeader) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: profile, error } = await supabase
      .from('users')
      .select('id, username, display_name, avatar_url, bio, is_verified, email, follower_count, following_count, points_balance, created_at')
      .eq('id', user.id)
      .single();

    if (error) return Response.json({ error: error.message }, { status: 500 });

    // Aggregate post stats
    const { data: stats } = await supabase
      .from('posts')
      .select('views_count, likes_count, points_earned, published_at')
      .eq('user_id', user.id);

    const totalViews = stats?.reduce((s, p) => s + (p.views_count ?? 0), 0) ?? 0;
    const totalLikes = stats?.reduce((s, p) => s + (p.likes_count ?? 0), 0) ?? 0;
    const totalPoints = stats?.reduce((s, p) => s + (p.points_earned ?? 0), 0) ?? 0;
    const totalPublished = stats?.filter((p) => p.published_at).length ?? 0;
    const totalDrafts = stats?.filter((p) => !p.published_at).length ?? 0;

    return Response.json({
      profile,
      stats: { totalViews, totalLikes, totalPoints, totalPublished, totalDrafts },
    });
  } catch (err) {
    return Response.json({ error: 'Failed to fetch profile' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!supabaseUrl || !supabaseAnonKey) return Response.json({ error: 'Server error' }, { status: 500 });

    const authHeader = request.headers.get('Authorization');
    if (!authHeader) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const allowed = ['display_name', 'username', 'bio', 'avatar_url'];
    const updates: Record<string, any> = {};
    for (const key of allowed) {
      if (body[key] !== undefined) updates[key] = body[key];
    }

    const { data, error } = await supabase.from('users').update(updates).eq('id', user.id).select().single();
    if (error) return Response.json({ error: error.message }, { status: 500 });

    return Response.json({ profile: data });
  } catch (err) {
    return Response.json({ error: 'Failed to update profile' }, { status: 500 });
  }
}
