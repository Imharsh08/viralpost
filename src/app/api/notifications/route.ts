import { createClient } from '@supabase/supabase-js';
import { NextRequest } from 'next/server';

export const runtime = 'edge';

function getUserId(authHeader: string): string | null {
  try {
    const payload = JSON.parse(atob(authHeader.replace('Bearer ', '').split('.')[1]));
    return payload.sub ?? null;
  } catch { return null; }
}

export async function GET(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey) {
    return Response.json({ error: 'Server configuration error' }, { status: 500 });
  }

  const authHeader = request.headers.get('Authorization') ?? '';
  const userId = getUserId(authHeader);
  if (!userId) return Response.json({ notifications: [], unread_count: 0 });

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
  });

  const { data: notifications, error } = await supabase
    .from('notifications')
    .select(`
      id, type, message, post_id, comment_id, is_read, created_at,
      actor:actor_id (id, username, display_name, avatar_url, is_verified)
    `)
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(30);

  if (error) return Response.json({ error: error.message }, { status: 500 });

  const { count: unreadCount } = await supabase
    .from('notifications')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('is_read', false);

  return Response.json({
    notifications: notifications ?? [],
    unread_count: unreadCount ?? 0,
  });
}

export async function POST(request: NextRequest) {
  // Mark notifications as read
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey) {
    return Response.json({ error: 'Server configuration error' }, { status: 500 });
  }

  const authHeader = request.headers.get('Authorization') ?? '';
  const userId = getUserId(authHeader);
  if (!userId) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
  });

  const body = await request.json().catch(() => ({}));
  const { notification_id } = body;

  let query = supabase.from('notifications').update({ is_read: true }).eq('user_id', userId);
  if (notification_id) {
    query = query.eq('id', notification_id);
  } else {
    query = query.eq('is_read', false);
  }

  const { error } = await query;
  if (error) return Response.json({ error: error.message }, { status: 500 });

  return Response.json({ ok: true });
}
