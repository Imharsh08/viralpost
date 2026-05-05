export type Post = {
  id: string
  user_id: string
  title: string
  excerpt: string
  content: string
  tags: string[]
  likes_count: number
  comments_count: number
  shares_count: number
  views_count: number
  points_earned: number
  is_trending: boolean
  is_ai_enhanced: boolean
  featured_image_url: string | null
  created_at: string
  updated_at: string
  published_at: string | null
}

export type PostWithAuthor = Post & {
  users: {
    id: string
    username: string
    display_name: string
    avatar_url: string
    is_verified: boolean
  }
}

export type Comment = {
  id: string
  post_id: string
  user_id: string
  parent_comment_id: string | null
  content: string
  likes_count: number
  created_at: string
  updated_at: string
}

export type CommentWithAuthor = Comment & {
  users: {
    id: string
    username: string
    display_name: string
    avatar_url: string
    is_verified: boolean
  }
}

export type PostLike = {
  id: string
  post_id: string
  user_id: string
  created_at: string
}

export type PostShare = {
  id: string
  post_id: string
  user_id: string
  platform: string
  created_at: string
}
