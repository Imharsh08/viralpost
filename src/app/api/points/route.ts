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
  if (!userId) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
  });

  // Summary via RPC
  const { data: summary } = await supabase.rpc('get_points_summary', { p_user_id: userId });

  // Current balance
  const { data: profile } = await supabase
    .from('users')
    .select('points_balance')
    .eq('id', userId)
    .single();

  // Recent 20 ledger entries
  const { data: recent } = await supabase
    .from('points_ledger')
    .select('id, event_type, points, post_id, metadata, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(20);

  return Response.json({
    balance: profile?.points_balance ?? 0,
    summary: summary?.[0] ?? {
      total_lifetime: 0, total_this_week: 0,
      pts_from_likes: 0, pts_from_follows: 0,
      pts_from_milestones: 0, pts_from_bonus: 0,
    },
    recent: recent ?? [],
  });
}
