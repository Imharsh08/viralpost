import { createClient } from '@supabase/supabase-js'
import type { User } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase env vars: NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY must be set in .env')
}

export const supabase = createClient(supabaseUrl!, supabaseAnonKey!)

// User Types
export type AuthUser = User

export interface UserProfile {
  id: string
  auth_id: string
  username: string
  display_name: string
  avatar_url?: string
  bio?: string
  is_verified: boolean
  email: string
  created_at: string
  updated_at: string
  follower_count: number
  following_count: number
}

export interface Post {
  id: string
  user_id: string
  title: string
  excerpt?: string
  content: string
  tags: string[]
  likes_count: number
  comments_count: number
  shares_count: number
  views_count: number
  points_earned: number
  is_trending: boolean
  is_ai_enhanced: boolean
  featured_image_url?: string
  created_at: string
  updated_at: string
  published_at?: string
}

export interface PostWithAuthor extends Post {
  users: UserProfile
}

export interface Comment {
  id: string
  post_id: string
  user_id: string
  parent_comment_id?: string
  content: string
  likes_count: number
  created_at: string
  updated_at: string
}

export interface CommentWithAuthor extends Comment {
  users: UserProfile
}

export interface Upload {
  id: string
  user_id: string
  file_name: string
  file_size: number
  file_type: string
  file_url: string
  bucket_path: string
  metadata?: Record<string, any>
  created_at: string
}

export interface Notification {
  id: string
  user_id: string
  actor_id?: string
  type: 'like' | 'comment' | 'follow' | 'share'
  post_id?: string
  comment_id?: string
  message?: string
  is_read: boolean
  created_at: string
}

export interface Follow {
  id: string
  follower_id: string
  following_id: string
  created_at: string
}
