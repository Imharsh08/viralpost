import { createClient } from '@supabase/supabase-js';
import { NextRequest } from 'next/server';

export const runtime = 'edge';

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!supabaseUrl || !supabaseAnonKey) return Response.json({ ok: false });

    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    // Increment views count directly (no auth required — anonymous views count)
    await supabase.rpc('increment_views', { post_id: params.id });

    return Response.json({ ok: true });
  } catch {
    return Response.json({ ok: false });
  }
}
