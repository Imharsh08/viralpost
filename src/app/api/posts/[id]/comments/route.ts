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
  if (!supabaseUrl || !supabaseAnonKey) return Response.json({ error: 'Server error' }, { status: 500 });

  const authHeader = request.headers.get('Authorization') ?? '';
  const viewerId = authHeader ? getUserId(authHeader) : null;

  // Comments are public (Instagram-style) — even logged-out viewers can
  // read the thread. The auth header is only forwarded when present, so
  // the own-rows RLS on `comment_likes` (migration 013) can resolve
  // auth.uid() correctly and populate `is_liked` per comment for the
  // signed-in viewer.
  const supabase = authHeader
    ? createClient(supabaseUrl, supabaseAnonKey, {
        global: { headers: { Authorization: authHeader } },
      })
    : createClient(supabaseUrl, supabaseAnonKey);

  // Fetch ALL comments for the post in one round-trip (top-level + replies),
  // then group on the server so the client can render the tree without
  // a second request. PRD §6.8 specifies 1-level nesting.
  // Use a SECURITY DEFINER RPC (migration 014) to read comments. This
  // bypasses RLS so the thread is always visible regardless of any future
  // policy change — comments are public-by-design (Instagram-style).
  const { data: flat, error } = await supabase.rpc('get_post_comments', {
    p_post_id: params.id,
  });

  if (error) {
    console.error('[comments GET] RPC error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }

  // Reshape the flat RPC output into the nested {users} shape the client
  // already consumes, so no client changes are needed.
  // NOTE: column names are c_* (comment) and author_* (user) per migration
  // 016, which renamed them to stop the RETURNS TABLE variables from
  // shadowing the underlying source columns (which produced NULL content).
  const all = (flat ?? []).map((r: any) => ({
    id: r.c_id,
    content: r.c_content,
    created_at: r.c_created_at,
    likes_count: r.c_likes_count,
    parent_comment_id: r.c_parent_comment_id,
    users: {
      id: r.author_id,
      username: r.author_username,
      display_name: r.author_display_name,
      avatar_url: r.author_avatar_url,
      is_verified: r.author_is_verified,
    },
  }));
  console.log(`[comments GET] post=${params.id} viewer=${viewerId ?? 'anon'} rows=${all.length}`);

  // If signed in, look up which comments the viewer has liked so the UI
  // can render the heart filled without a per-comment round-trip. RLS on
  // comment_likes (migration 013) only returns rows where
  // user_id = auth.uid(), so this query naturally returns only the
  // viewer's own likes.
  let likedIds = new Set<string>();
  if (viewerId && (all?.length ?? 0) > 0) {
    const { data: likes } = await supabase
      .from('comment_likes')
      .select('comment_id')
      .eq('user_id', viewerId)
      .in('comment_id', all!.map((c: any) => c.id));
    likedIds = new Set((likes ?? []).map((l: any) => l.comment_id));
  }

  // Group: top-level rows get a `replies` array; reply rows are nested under
  // their parent. Replies whose parent is missing (orphans) are skipped.
  const byParent = new Map<string, any[]>();
  const topLevel: any[] = [];
  for (const c of all ?? []) {
    const withLiked = { ...c, is_liked: likedIds.has(c.id) };
    if (c.parent_comment_id) {
      const list = byParent.get(c.parent_comment_id) ?? [];
      list.push(withLiked);
      byParent.set(c.parent_comment_id, list);
    } else {
      topLevel.push(withLiked);
    }
  }
  const tree = topLevel.map((c) => ({ ...c, replies: byParent.get(c.id) ?? [] }));

  // Debug headers help diagnose RLS / migration issues from the browser
  // network panel without server log access. Safe to leave on — they
  // contain no PII (just counts + auth presence).
  return Response.json(
    { comments: tree },
    {
      headers: {
        'X-Comments-Total': String(all?.length ?? 0),
        'X-Comments-TopLevel': String(topLevel.length),
        'X-Comments-Viewer': viewerId ? 'auth' : 'anon',
      },
    },
  );
}

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey) return Response.json({ error: 'Server error' }, { status: 500 });

  const authHeader = request.headers.get('Authorization') ?? '';
  const userId = getUserId(authHeader);
  if (!userId) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
  });

  const { content, parent_comment_id } = await request.json();
  if (!content?.trim()) return Response.json({ error: 'Comment cannot be empty' }, { status: 400 });

  // If parent_comment_id is provided, verify it belongs to this same post
  // and is itself top-level (PRD §6.8 caps nesting at 1 level).
  if (parent_comment_id) {
    const { data: parent } = await supabase
      .from('comments')
      .select('post_id, parent_comment_id')
      .eq('id', parent_comment_id)
      .maybeSingle();
    if (!parent || parent.post_id !== params.id) {
      return Response.json({ error: 'Invalid parent comment' }, { status: 400 });
    }
    if (parent.parent_comment_id) {
      return Response.json({ error: 'Replies cannot be nested further' }, { status: 400 });
    }
  }

  const { data: comment, error } = await supabase
    .from('comments')
    .insert({
      post_id: params.id,
      user_id: userId,
      content: content.trim(),
      parent_comment_id: parent_comment_id ?? null,
    })
    .select(`
      id, content, created_at, likes_count, parent_comment_id,
      users!inner(id, username, display_name, avatar_url, is_verified)
    `)
    .single();

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ comment });
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey) return Response.json({ error: 'Server error' }, { status: 500 });

  const authHeader = request.headers.get('Authorization') ?? '';
  const userId = getUserId(authHeader);
  if (!userId) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
  });

  const { commentId } = await request.json();
  const { error } = await supabase
    .from('comments')
    .delete()
    .eq('id', commentId)
    .eq('user_id', userId);

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ success: true });
}
