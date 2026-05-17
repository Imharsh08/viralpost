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

  // Auth is optional — anonymous viewers get the popularity fallback
  const authHeader = request.headers.get('Authorization') ?? '';
  const viewerId = authHeader ? getUserId(authHeader) : null;

  const { searchParams } = new URL(request.url);
  const limit = Math.min(20, Math.max(1, Number(searchParams.get('limit')) || 5));

  const supabase = createClient(supabaseUrl, supabaseAnonKey);
  const { data, error } = await supabase.rpc('get_suggested_creators', {
    viewer_id: viewerId,
    result_limit: limit,
  });

  if (error) {
    console.error('[suggested-creators] RPC error:', error);
    return Response.json({ creators: [] }, { status: 200 });
  }

  return Response.json({ creators: data ?? [] });
}
