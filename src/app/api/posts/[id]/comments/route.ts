import { createClient } from '@supabase/supabase-js';
import { NextRequest } from 'next/server';

export const runtime = 'edge';

function getUserId(authHeader: string): string | null {
  try {
    const payload = JSON.parse(atob(authHeader.replace('Bearer ', '').split('.')[1]));
    return payload.sub ?? null;
  } catch { return null; }
}

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey) return Response.json({ error: 'Server error' }, { status: 500 });

  const supabase = createClient(supabaseUrl, supabaseAnonKey);

  const { data: comments, error } = await supabase
    .from('comments')
    .select(`
      id, content, created_at, likes_count,
      users!inner(id, username, display_name, avatar_url, is_verified)
    `)
    .eq('post_id', params.id)
    .is('parent_comment_id', null)
    .order('created_at', { ascending: true });

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ comments });
}

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey) return Response.json({ error: 'Server error' }, { status: 500 });

  const authHeader = request.headers.get('Authorization') ?? '';
  const userId = getUserId(authHeader);
  if (!userId) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
  });

  const { content } = await request.json();
  if (!content?.trim()) return Response.json({ error: 'Comment cannot be empty' }, { status: 400 });

  const { data: comment, error } = await supabase
    .from('comments')
    .insert({ post_id: params.id, user_id: userId, content: content.trim() })
    .select(`
      id, content, created_at, likes_count,
      users!inner(id, username, display_name, avatar_url, is_verified)
    `)
    .single();

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ comment });
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey) return Response.json({ error: 'Server error' }, { status: 500 });

  const authHeader = request.headers.get('Authorization') ?? '';
  const userId = getUserId(authHeader);
  if (!userId) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
  });

  const { commentId } = await request.json();
  const { error } = await supabase
    .from('comments')
    .delete()
    .eq('id', commentId)
    .eq('user_id', userId);

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ success: true });
}
