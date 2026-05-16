import React from 'react';
import AppLayout from '@/components/AppLayout';
import UserProfileClient from './UserProfileClient';

export const runtime = 'edge';

export default function UserProfilePage({ params }: { params: { username: string } }) {
  return (
    <AppLayout>
      <UserProfileClient username={decodeURIComponent(params.username)} />
    </AppLayout>
  );
}
