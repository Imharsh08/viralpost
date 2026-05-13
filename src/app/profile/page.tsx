import { Suspense } from 'react';
import AppLayout from '@/components/AppLayout';
import ProfileClient from './ProfileClient';

export default function ProfilePage() {
  return (
    <AppLayout>
      <Suspense fallback={<div className="max-w-3xl mx-auto animate-pulse"><div className="card p-6 h-64" /></div>}>
        <ProfileClient />
      </Suspense>
    </AppLayout>
  );
}
