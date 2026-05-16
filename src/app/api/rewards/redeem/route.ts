import { createClient } from '@supabase/supabase-js';
import { NextRequest } from 'next/server';

export const runtime = 'edge';

function getUserId(authHeader: string): string | null {
  try {
    const payload = JSON.parse(atob(authHeader.replace('Bearer ', '').split('.')[1]));
    return payload.sub ?? null;
  } catch { return null; }
}

export async function POST(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey) {
    return Response.json({ error: 'Server configuration error' }, { status: 500 });
  }

  const authHeader = request.headers.get('Authorization') ?? '';
  const userId = getUserId(authHeader);
  if (!userId) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { reward_id, reward_name, cost } = await request.json();
  if (!reward_id || !reward_name || typeof cost !== 'number' || cost < 500) {
    return Response.json({ error: 'Invalid reward' }, { status: 400 });
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
  });

  // Re-read balance server-side (never trust client)
  const { data: profile, error: readErr } = await supabase
    .from('users')
    .select('points_balance')
    .eq('id', userId)
    .single();

  if (readErr || !profile) {
    return Response.json({ error: 'Could not load balance' }, { status: 500 });
  }

  const currentBalance = profile.points_balance ?? 0;
  if (currentBalance < cost) {
    return Response.json({
      error: `Insufficient points. You need ${(cost - currentBalance).toLocaleString()} more.`,
    }, { status: 400 });
  }

  const newBalance = currentBalance - cost;
  const { error: updateErr } = await supabase
    .from('users')
    .update({ points_balance: newBalance })
    .eq('id', userId);

  if (updateErr) {
    return Response.json({ error: 'Failed to deduct points' }, { status: 500 });
  }

  return Response.json({
    ok: true,
    new_balance: newBalance,
    reward_id,
    reward_name,
    redeemed_at: new Date().toISOString(),
  });
}
