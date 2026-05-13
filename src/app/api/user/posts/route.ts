import { createClient } from '@supabase/supabase-js';
import { NextRequest } from 'next/server';

export const runtime = 'edge';

export async function GET(request: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      return Response.json({ error: 'Server configuration error' }, { status: 500 });
    }

    const authHeader = request.headers.get('Authorization');
    if (!authHeader) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const filter = searchParams.get('filter') ?? 'all'; // all | published | drafts

    let query = supabase
      .from('posts')
      .select('id, title, excerpt, content, tags, likes_count, comments_count, shares_count, views_count, points_earned, is_trending, is_ai_enhanced, published_at, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (filter === 'published') {
      query = query.not('published_at', 'is', null);
    } else if (filter === 'drafts') {
      query = query.is('published_at', null);
    }

    const { data: posts, error } = await query;
    if (error) return Response.json({ error: error.message }, { status: 500 });

    return Response.json({ posts });
  } catch (err) {
    console.error('GET /api/user/posts error:', err);
    return Response.json({ error: 'Failed to fetch posts' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      return Response.json({ error: 'Server configuration error' }, { status: 500 });
    }

    const authHeader = request.headers.get('Authorization');
    if (!authHeader) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await request.json();
    if (!id) return Response.json({ error: 'Post id required' }, { status: 400 });

    const { error } = await supabase.from('posts').delete().eq('id', id).eq('user_id', user.id);
    if (error) return Response.json({ error: error.message }, { status: 500 });

    return Response.json({ success: true });
  } catch (err) {
    return Response.json({ error: 'Failed to delete post' }, { status: 500 });
  }
}
