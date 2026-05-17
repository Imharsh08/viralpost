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

async function toggleLike(request: NextRequest, commentId: string, add: boolean) {
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
    // upsert so a double-click doesn't 409
    await supabase
      .from('comment_likes')
      .upsert({ comment_id: commentId, user_id: userId }, { onConflict: 'comment_id,user_id' });
  } else {
    await supabase
      .from('comment_likes')
      .delete()
      .eq('comment_id', commentId)
      .eq('user_id', userId);
  }

  const { data: comment } = await supabase
    .from('comments')
    .select('likes_count')
    .eq('id', commentId)
    .single();

  return Response.json({ likes_count: comment?.likes_count ?? 0 });
}
