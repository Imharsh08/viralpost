import React from 'react';
import AppLayout from '@/components/AppLayout';
import PostDetailClient from './PostDetailClient';

export default function PostDetailPage({ params }: { params: { id: string } }) {
  return (
    <AppLayout>
      <PostDetailClient postId={params.id} />
    </AppLayout>
  );
}
