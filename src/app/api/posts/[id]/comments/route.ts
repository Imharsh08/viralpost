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

  const supabase = createClient(supabaseUrl, supabaseAnonKey);

  // Fetch ALL comments for the post in one round-trip (top-level + replies),
  // then group on the server so the client can render the tree without
  // a second request. PRD §6.8 specifies 1-level nesting.
  const { data: all, error } = await supabase
    .from('comments')
    .select(`
      id, content, created_at, likes_count, parent_comment_id,
      users!inner(id, username, display_name, avatar_url, is_verified)
    `)
    .eq('post_id', params.id)
    .order('created_at', { ascending: true });

  if (error) return Response.json({ error: error.message }, { status: 500 });

  // If signed in, look up which comments the viewer has liked so the UI
  // can render the heart filled without a per-comment round-trip.
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

  return Response.json({ comments: tree });
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
