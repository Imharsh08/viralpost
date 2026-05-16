import { createClient } from '@supabase/supabase-js';
import { NextRequest } from 'next/server';

export const runtime = 'edge';

function getUserIdFromToken(authHeader: string): string | null {
  try {
    const token = authHeader.replace('Bearer ', '');
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.sub ?? null;
  } catch {
    return null;
  }
}

export async function POST(request: NextRequest) {
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

    const userId = getUserIdFromToken(authHeader);
    if (!userId) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const body = await request.json();
    const { id, title, content, ai_enhanced_text, is_ai_enhanced, tags, status, featured_image_url } = body;

    // Drafts allow shorter content; published posts must have ≥10 chars
    const minLen = status === 'published' ? 10 : 1;
    if (!content || content.trim().length < minLen) {
      return Response.json({ error: 'Content is required' }, { status: 400 });
    }

    const excerpt = content.slice(0, 300);
    const finalContent = is_ai_enhanced && ai_enhanced_text ? ai_enhanced_text : content;

    const payload: Record<string, any> = {
      user_id: userId,
      title: title?.trim() || '',
      content: finalContent,
      excerpt,
      tags: tags ?? [],
      is_ai_enhanced: !!is_ai_enhanced,
    };
    if (typeof featured_image_url === 'string') payload.featured_image_url = featured_image_url;

    if (id) {
      // Update path: read existing row first so we can preserve published_at
      // when re-saving a live post (don't change publish date on edits, and
      // don't accidentally unpublish on autosave).
      const { data: existing, error: readErr } = await supabase
        .from('posts')
        .select('published_at, user_id')
        .eq('id', id)
        .eq('user_id', userId)
        .maybeSingle();
      if (readErr) {
        console.error('Read existing error:', readErr);
        return Response.json({ error: readErr.message }, { status: 500 });
      }
      if (!existing) {
        return Response.json({ error: 'Post not found' }, { status: 404 });
      }

      if (status === 'published') {
        // Keep original publish timestamp on edits; first-time publish stamps now.
        payload.published_at = existing.published_at ?? new Date().toISOString();
      } else if (existing.published_at) {
        // Editing a published post and client sent status='draft' (autosave on
        // a live post). Keep it published — never silently unpublish.
        payload.published_at = existing.published_at;
      } else {
        // Draft autosave on a draft.
        payload.published_at = null;
      }

      const { data: post, error: updateError } = await supabase
        .from('posts')
        .update(payload)
        .eq('id', id)
        .eq('user_id', userId)
        .select('id')
        .single();

      if (updateError) {
        console.error('Update error:', updateError);
        return Response.json({ error: updateError.message }, { status: 500 });
      }
      return Response.json({ id: post.id, status });
    }

    // Insert path: brand-new post
    payload.published_at = status === 'published' ? new Date().toISOString() : null;

    const { data: post, error: insertError } = await supabase
      .from('posts')
      .insert(payload)
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
        id, title, excerpt, content, tags, featured_image_url, likes_count, comments_count,
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
