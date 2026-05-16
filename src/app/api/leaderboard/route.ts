import { createClient } from '@supabase/supabase-js';
import { NextRequest } from 'next/server';

export const runtime = 'edge';

export async function GET(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey) {
    return Response.json({ error: 'Server configuration error' }, { status: 500 });
  }

  const { searchParams } = new URL(request.url);
  const board = searchParams.get('board') ?? 'earners';
  const windowParam = searchParams.get('window') ?? 'week'; // 'week' | 'all'

  const supabase = createClient(supabaseUrl, supabaseAnonKey);
  const windowDays = windowParam === 'all' ? null : 7;

  if (board === 'viral') {
    const { data, error } = await supabase.rpc('get_most_viral_posts', {
      window_days: windowDays,
      result_limit: 20,
    });
    if (error) return Response.json({ error: error.message }, { status: 500 });
    return Response.json({ board: 'viral', window: windowParam, results: data ?? [] });
  }

  if (board === 'engaging') {
    const { data, error } = await supabase.rpc('get_most_engaging', { result_limit: 20 });
    if (error) return Response.json({ error: error.message }, { status: 500 });
    return Response.json({ board: 'engaging', window: 'all', results: data ?? [] });
  }

  // default: top earners
  const { data, error } = await supabase.rpc('get_top_earners', {
    window_days: windowDays,
    result_limit: 30,
  });
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ board: 'earners', window: windowParam, results: data ?? [] });
}
