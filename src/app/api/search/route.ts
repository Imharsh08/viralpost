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
  const qRaw = (searchParams.get('q') ?? '').trim();
  if (qRaw.length < 2) {
    return Response.json({ posts: [], creators: [], tags: [] });
  }

  // ilike escape: %, _, and \ are special — sanitize so user input is literal
  const q = qRaw.replace(/[\\%_]/g, (c) => `\\${c}`);
  const like = `%${q}%`;

  const supabase = createClient(supabaseUrl, supabaseAnonKey);

  const [postsRes, creatorsRes] = await Promise.all([
    supabase
      .from('posts')
      .select(`
        id, title, excerpt, tags, likes_count, comments_count, views_count,
        published_at,
        users!inner(id, username, display_name, avatar_url, is_verified)
      `)
      .not('published_at', 'is', null)
      .or(`title.ilike.${like},excerpt.ilike.${like}`)
      .order('likes_count', { ascending: false })
      .limit(15),
    supabase
      .from('users')
      .select('id, username, display_name, avatar_url, bio, is_verified, follower_count')
      .or(`display_name.ilike.${like},username.ilike.${like}`)
      .order('follower_count', { ascending: false })
      .limit(10),
  ]);

  // Tag suggestions: query tag arrays via overlaps if user typed `#x`
  let tags: string[] = [];
  const tagQuery = qRaw.replace(/^#/, '');
  if (tagQuery.length >= 2) {
    const { data: taggedPosts } = await supabase
      .from('posts')
      .select('tags')
      .not('published_at', 'is', null)
      .overlaps('tags', [tagQuery, `#${tagQuery}`])
      .limit(20);
    const seen = new Set<string>();
    (taggedPosts ?? []).forEach((p: any) => {
      (p.tags ?? []).forEach((t: string) => {
        const clean = t.replace(/^#+/, '');
        if (clean.toLowerCase().includes(tagQuery.toLowerCase())) seen.add(clean);
      });
    });
    tags = [...seen].slice(0, 8);
  }

  return Response.json({
    posts: postsRes.data ?? [],
    creators: creatorsRes.data ?? [],
    tags,
  });
}
