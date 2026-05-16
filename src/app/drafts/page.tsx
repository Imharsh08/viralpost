import React from 'react';
import AppLayout from '@/components/AppLayout';
import DraftsClient from './DraftsClient';

export const metadata = {
  title: 'My Drafts — ViralPost',
};

export default function DraftsPage() {
  return (
    <AppLayout>
      <DraftsClient />
    </AppLayout>
  );
}
