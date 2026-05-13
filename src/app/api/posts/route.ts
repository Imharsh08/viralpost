import { createClient } from '@supabase/supabase-js';
import { NextRequest } from 'next/server';

export const runtime = 'edge';

export async function POST(request: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      return Response.json({ error: 'Server configuration error' }, { status: 500 });
    }

    // Forward the user's auth token so RLS policies apply
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

    const body = await request.json();
    const { title, content, ai_enhanced_text, is_ai_enhanced, tags, status } = body;

    if (!content || content.trim().length < 10) {
      return Response.json({ error: 'Content is required' }, { status: 400 });
    }

    const excerpt = content.slice(0, 300);
    const finalContent = is_ai_enhanced && ai_enhanced_text ? ai_enhanced_text : content;

    const { data: post, error: insertError } = await supabase
      .from('posts')
      .insert({
        user_id: user.id,
        title: title?.trim() || '',
        content: finalContent,
        excerpt,
        tags: tags ?? [],
        is_ai_enhanced: !!is_ai_enhanced,
        published_at: status === 'published' ? new Date().toISOString() : null,
      })
      .select('id')
      .single();

    if (insertError) {
      console.error('Insert error:', insertError);
      return Response.json({ error: insertError.message }, { status: 500 });
    }

    return Response.json({ id: post.id, status });
  } catch (error) {
    console.error('POST /api/posts error:', error);
    return Response.json({ error: 'Failed to save post' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      return Response.json({ error: 'Server configuration error' }, { status: 500 });
    }

    const authHeader = request.headers.get('Authorization');
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: authHeader ? { headers: { Authorization: authHeader } } : {},
    });

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('user_id');

    let query = supabase
      .from('posts')
      .select(`
        id, title, excerpt, content, tags, likes_count, comments_count,
        shares_count, views_count, points_earned, is_trending, is_ai_enhanced,
        published_at, created_at,
        users!inner(id, username, display_name, avatar_url, is_verified)
      `)
      .order('published_at', { ascending: false });

    if (userId) {
      query = query.eq('user_id', userId);
    } else {
      query = query.not('published_at', 'is', null);
    }

    const { data: posts, error } = await query;

    if (error) {
      return Response.json({ error: error.message }, { status: 500 });
    }

    return Response.json({ posts });
  } catch (error) {
    console.error('GET /api/posts error:', error);
    return Response.json({ error: 'Failed to fetch posts' }, { status: 500 });
  }
}
