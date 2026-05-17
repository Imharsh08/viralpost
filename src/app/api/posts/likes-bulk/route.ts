import { createClient } from '@supabase/supabase-js';
import { NextRequest } from 'next/server';

export const runtime = 'edge';

function getUserId(authHeader: string): string | null {
  try {
    const payload = JSON.parse(atob(authHeader.replace('Bearer ', '').split('.')[1]));
    return payload.sub ?? null;
  } catch { return null; }
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * GET /api/posts/likes-bulk?ids=uuid,uuid,uuid
 *
 * Returns { liked: string[] } — the subset of supplied post IDs that the
 * viewer has liked. Used by the feed to paint the heart filled for posts
 * the viewer has already liked, instead of hitting GET /like once per card.
 *
 * Anonymous callers get { liked: [] }. RLS on post_likes (migration 013)
 * already restricts SELECT to own rows, so even if someone forged this
 * call they only see their own likes.
 */
export async function GET(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey) return Response.json({ liked: [] });

  const authHeader = request.headers.get('Authorization') ?? '';
  const userId = getUserId(authHeader);
  if (!userId) return Response.json({ liked: [] });

  const { searchParams } = new URL(request.url);
  const raw = searchParams.get('ids') ?? '';
  // Defensive: trim, dedupe, and drop anything that isn't a plausible UUID.
  // Caps at 200 ids to keep the IN clause small.
  const ids = [...new Set(raw.split(',').map((s) => s.trim()).filter((s) => UUID_RE.test(s)))].slice(0, 200);
  if (ids.length === 0) return Response.json({ liked: [] });

  // Forward auth so the own-rows RLS resolves auth.uid() correctly.
  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
  });

  const { data, error } = await supabase
    .from('post_likes')
    .select('post_id')
    .eq('user_id', userId)
    .in('post_id', ids);

  if (error) {
    console.error('[likes-bulk] error:', error);
    return Response.json({ liked: [] });
  }

  return Response.json({ liked: (data ?? []).map((r: any) => r.post_id) });
}
