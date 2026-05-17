import { createClient } from '@supabase/supabase-js';
import { NextRequest } from 'next/server';

export const runtime = 'edge';

function getUserId(authHeader: string): string | null {
  try {
    const payload = JSON.parse(atob(authHeader.replace('Bearer ', '').split('.')[1]));
    return payload.sub ?? null;
  } catch { return null; }
}

/**
 * POST /api/posts/[id]/reshare
 *
 * Body: { thought?: string }   — optional commentary; empty = quick reshare
 *
 * Creates a new row in `posts` whose parent_post_id points at the
 * original. If the [id] is itself a reshare, we walk one hop up so the
 * new reshare references the ROOT — keeps the embed flat (PRD design
 * decision: no reshare-chains).
 *
 * Returns the new reshare row { id, parent_post_id, status: 'published' }.
 */
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey) {
    return Response.json({ error: 'Server configuration error' }, { status: 500 });
  }

  const authHeader = request.headers.get('Authorization') ?? '';
  const userId = getUserId(authHeader);
  if (!userId) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const thoughtRaw = typeof body?.thought === 'string' ? body.thought.trim() : '';
  const thought = thoughtRaw.slice(0, 500); // hard cap per PRD §6.8 length

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
  });

  // Resolve the ROOT post id. If the user is resharing a reshare, point
  // the new row at the original instead. Also fetches the original author
  // (used below for the self-reshare check + author tag in the new row).
  const { data: target, error: targetErr } = await supabase
    .from('posts')
    .select('id, user_id, parent_post_id, published_at')
    .eq('id', params.id)
    .maybeSingle();

  if (targetErr || !target) {
    return Response.json({ error: 'Post not found' }, { status: 404 });
  }
  if (!target.published_at) {
    return Response.json({ error: 'Cannot reshare an unpublished post' }, { status: 400 });
  }

  let rootId = target.parent_post_id ?? target.id;
  let rootAuthor = target.user_id;

  if (target.parent_post_id) {
    // We're resharing a reshare — fetch the root to get its real author
    const { data: root } = await supabase
      .from('posts')
      .select('user_id, published_at')
      .eq('id', target.parent_post_id)
      .maybeSingle();
    if (!root || !root.published_at) {
      // Original got unpublished/deleted — block the reshare so we don't
      // create dangling embeds.
      return Response.json({ error: 'Original post is no longer available' }, { status: 400 });
    }
    rootAuthor = root.user_id;
  }

  if (rootAuthor === userId) {
    return Response.json({ error: "You can't reshare your own post" }, { status: 400 });
  }

  // Idempotency: if this user has already reshared this root post, return
  // the existing row instead of creating a duplicate.
  const { data: existing } = await supabase
    .from('posts')
    .select('id')
    .eq('user_id', userId)
    .eq('parent_post_id', rootId)
    .maybeSingle();
  if (existing) {
    return Response.json({ id: existing.id, parent_post_id: rootId, status: 'already-reshared' });
  }

  // Build the reshare row. Content is the user's thought (or empty for a
  // quick reshare); the original post's body is embedded at render time
  // by reading parent_post_id.
  const excerpt = thought.slice(0, 300);
  const payload: Record<string, any> = {
    user_id: userId,
    parent_post_id: rootId,
    title: '',
    content: thought, // empty string is fine — DB column is NOT NULL but accepts empty
    excerpt,
    tags: [],
    is_ai_enhanced: false,
    published_at: new Date().toISOString(),
  };

  const { data: created, error: insertErr } = await supabase
    .from('posts')
    .insert(payload)
    .select('id')
    .single();

  if (insertErr) {
    console.error('[reshare POST] insert error:', insertErr);
    return Response.json({ error: insertErr.message }, { status: 500 });
  }

  return Response.json({
    id: created.id,
    parent_post_id: rootId,
    status: 'published',
  });
}
