import React from 'react';
import AppLayout from '@/components/AppLayout';
import TagClient from './TagClient';

export const runtime = 'edge';

export default function TagPage({ params }: { params: { name: string } }) {
  return (
    <AppLayout>
      <TagClient tagName={decodeURIComponent(params.name)} />
    </AppLayout>
  );
}
