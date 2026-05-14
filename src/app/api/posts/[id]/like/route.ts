import { createClient } from '@supabase/supabase-js';
import { NextRequest } from 'next/server';

export const runtime = 'edge';

function getUserId(authHeader: string): string | null {
  try {
    const payload = JSON.parse(atob(authHeader.replace('Bearer ', '').split('.')[1]));
    return payload.sub ?? null;
  } catch { return null; }
}

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  return toggleLike(request, params.id, true);
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  return toggleLike(request, params.id, false);
}

async function toggleLike(request: NextRequest, postId: string, add: boolean) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey) return Response.json({ error: 'Server error' }, { status: 500 });

  const authHeader = request.headers.get('Authorization') ?? '';
  const userId = getUserId(authHeader);
  if (!userId) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
  });

  if (add) {
    await supabase.from('post_likes').upsert({ post_id: postId, user_id: userId }, { onConflict: 'post_id,user_id' });
  } else {
    await supabase.from('post_likes').delete().eq('post_id', postId).eq('user_id', userId);
  }

  const { data: post } = await supabase.from('posts').select('likes_count').eq('id', postId).single();
  return Response.json({ likes_count: post?.likes_count ?? 0 });
}
