import React from 'react';
import AppLayout from '@/components/AppLayout';
import WriteEditorClient from './components/WriteEditorClient';

export const runtime = 'edge';
export const dynamic = 'force-dynamic';

export default function WriteEditorPage() {
  return (
    <AppLayout>
      <WriteEditorClient />
    </AppLayout>
  );
}