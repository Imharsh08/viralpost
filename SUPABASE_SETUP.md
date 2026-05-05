# Supabase Setup Guide

This guide will help you set up Supabase for the ViralPost application.

## 📋 Prerequisites

1. A Supabase account at [supabase.com](https://supabase.com)
2. Node.js 18+ installed
3. Git for version control

## 🚀 Setup Steps

### 1. Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign in
2. Click **"New project"**
3. Fill in the project details:
   - **Name**: ViralPost
   - **Database Password**: Create a strong password
   - **Region**: Choose closest to your users
4. Click **"Create new project"** and wait for initialization

### 2. Get API Keys

1. Go to **Settings → API** in your Supabase project
2. Copy the following values:
   - **Project URL** (under `Project Settings`)
   - **Anon Key** (under `Project API keys`)

### 3. Set Environment Variables

Create a `.env.local` file in your project root:

```env
NEXT_PUBLIC_SUPABASE_URL=your_project_url_here
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
```

### 4. Execute Database Migration

1. Go to **SQL Editor** in your Supabase project
2. Click **"New query"**
3. Copy the entire contents of `supabase/migrations/001_initial_schema.sql`
4. Paste it into the SQL editor
5. Click **"Run"** and verify all tables are created

**Verify:** Check **Database → Tables** to confirm all tables are created:
- ✅ users
- ✅ posts
- ✅ post_likes
- ✅ comments
- ✅ post_shares
- ✅ follows
- ✅ uploads
- ✅ trending_tags
- ✅ user_stats
- ✅ post_views
- ✅ notifications

### 5. Create Storage Buckets

1. Go to **Storage** in your Supabase project
2. Click **"Create a new bucket"**

Create two buckets:

#### Bucket 1: `posts`
- **Name**: posts
- **Public**: Yes (so images are publicly accessible)
- Click **"Create bucket"**

#### Bucket 2: `avatars`
- **Name**: avatars
- **Public**: Yes
- Click **"Create bucket"**

### 6. Set Storage Policies

For the `posts` bucket:

1. Click the **three dots** next to `posts` → **Policies**
2. Click **"Create policy"** → **For queries with select**
3. Enter policy name: `Allow public read`
4. Template: `Allow`
5. Click **"Review"** → **Save policy**

Repeat for `avatars` bucket

To allow uploads:

1. Click **"Create policy"** → **For queries with insert**
2. Enter policy name: `Allow authenticated users to upload`
3. Template: Custom
4. Paste this:
   ```sql
   (auth.uid() = owner)
   ```
5. Modify to `(auth.uid()::text = (storage.foldername(name))[1])`
6. Click **"Save policy"**

### 7. Set Authentication Settings

1. Go to **Authentication → Providers**
2. Make sure **Email** is enabled (default)
3. Go to **Authentication → URL Configuration**
4. Set **Site URL** to: `http://localhost:4028` (for development)
5. Add **Redirect URLs**:
   - `http://localhost:4028/auth/callback`
   - `https://yourdomain.com/auth/callback` (for production)

## 🔧 Using the Services

### Authentication Service

```typescript
import { authService } from '@/lib/supabase/services/auth.service';

// Sign up
const { user, authUser } = await authService.signUp(
  'user@example.com',
  'password123',
  'John Doe'
);

// Sign in
const { user, session } = await authService.signIn(
  'user@example.com',
  'password123'
);

// Get current user
const currentUser = await authService.getCurrentUser();

// Update profile
await authService.updateProfile(userId, {
  display_name: 'New Name',
  bio: 'My bio'
});
```

### Post Service

```typescript
import { postService } from '@/lib/supabase/services/post.service';

// Create a post
const post = await postService.createPost(
  userId,
  'My First Post',
  'This is my post content',
  'Short excerpt',
  ['CreatorEconomy', 'Writing'],
  true
);

// Get trending posts
const trendingPosts = await postService.getTrendingPosts(10);

// Like a post
await postService.likePost(postId, userId);

// Search posts
const results = await postService.searchPosts('creator economy');
```

### Upload Service

```typescript
import { uploadService } from '@/lib/supabase/services/upload.service';

// Upload a file
const file = new File(['content'], 'image.jpg', { type: 'image/jpeg' });
const upload = await uploadService.uploadFile(userId, file, 'posts');

// Upload profile avatar
const avatarUrl = await uploadService.uploadAvatar(userId, file);

// Delete a file
await uploadService.deleteUpload(uploadId, bucketPath, 'posts');
```

### Interaction Service

```typescript
import { interactionService } from '@/lib/supabase/services/interaction.service';

// Create a comment
const comment = await interactionService.createComment(
  postId,
  userId,
  'Great post!'
);

// Follow a user
await interactionService.followUser(followerId, followingId);

// Get notifications
const notifications = await interactionService.getNotifications(userId);

// Share a post
await interactionService.sharePost(postId, userId, 'twitter');
```

## 📚 API Reference

### Database Tables

#### Users
```typescript
{
  id: UUID,
  auth_id: UUID,
  username: string,
  display_name: string,
  avatar_url?: string,
  bio?: string,
  is_verified: boolean,
  email: string,
  created_at: timestamp,
  updated_at: timestamp,
  follower_count: integer,
  following_count: integer
}
```

#### Posts
```typescript
{
  id: UUID,
  user_id: UUID,
  title: string,
  excerpt?: string,
  content: string,
  tags: string[],
  likes_count: integer,
  comments_count: integer,
  shares_count: integer,
  views_count: integer,
  points_earned: integer,
  is_trending: boolean,
  is_ai_enhanced: boolean,
  featured_image_url?: string,
  created_at: timestamp,
  updated_at: timestamp,
  published_at?: timestamp
}
```

#### Comments
```typescript
{
  id: UUID,
  post_id: UUID,
  user_id: UUID,
  parent_comment_id?: UUID,
  content: string,
  likes_count: integer,
  created_at: timestamp,
  updated_at: timestamp
}
```

#### Uploads
```typescript
{
  id: UUID,
  user_id: UUID,
  file_name: string,
  file_size: integer,
  file_type: string,
  file_url: string,
  bucket_path: string,
  metadata?: JSONB,
  created_at: timestamp
}
```

## 🔐 Row Level Security (RLS)

All tables have RLS enabled with the following policies:

- **Users**: Public read, own profile update
- **Posts**: Public read published posts, own post CRUD
- **Comments**: Public read, authenticated comment creation
- **Uploads**: Only user can see own uploads
- **Notifications**: Only user can see own notifications

## 🛠️ Troubleshooting

### Issue: 401 Unauthorized

**Solution**: Check your `.env.local` file has correct credentials:
```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
```

### Issue: Storage bucket not found

**Solution**: Ensure buckets are created and marked as public:
1. Go to **Storage** → Check `posts` and `avatars` exist
2. Click on each bucket → **Settings** → Ensure "Make it private" is OFF

### Issue: RLS policy denies access

**Solution**: Check Row Level Security policies:
1. Go to **Authentication → Policies**
2. Verify policies match the migration script
3. Make sure you're authenticated with `auth.uid()`

### Issue: Files not uploading

**Solution**: Check storage policies and file size:
1. Verify storage bucket policies are created
2. Check file size limits (default 50MB)
3. Check browser console for errors

## 📖 Additional Resources

- [Supabase Documentation](https://supabase.com/docs)
- [Supabase JavaScript Client](https://supabase.com/docs/reference/javascript)
- [Next.js Integration](https://supabase.com/docs/guides/getting-started/quickstarts/nextjs)
- [Authentication Guide](https://supabase.com/docs/guides/auth)
- [Storage Guide](https://supabase.com/docs/guides/storage)

## ✅ Next Steps

1. ✅ Set up Supabase project
2. ✅ Create API keys and add to `.env.local`
3. ✅ Execute database migration
4. ✅ Create storage buckets
5. ✅ Configure authentication
6. ✅ Test the services in your components

Start building! 🚀
