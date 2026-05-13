import { createClient } from '@supabase/supabase-js';
import { NextRequest } from 'next/server';

export const runtime = 'edge';

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  return toggleLike(request, params.id, true);
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  return toggleLike(request, params.id, false);
}

async function toggleLike(request: NextRequest, postId: string, add: boolean) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!supabaseUrl || !supabaseAnonKey) return Response.json({ error: 'Server error' }, { status: 500 });

    const authHeader = request.headers.get('Authorization');
    if (!authHeader) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    if (add) {
      await supabase.from('post_likes').upsert({ post_id: postId, user_id: user.id }, { onConflict: 'post_id,user_id' });
    } else {
      await supabase.from('post_likes').delete().eq('post_id', postId).eq('user_id', user.id);
    }

    const { data: post } = await supabase.from('posts').select('likes_count').eq('id', postId).single();
    return Response.json({ likes_count: post?.likes_count ?? 0 });
  } catch (err) {
    return Response.json({ error: 'Failed' }, { status: 500 });
  }
}
