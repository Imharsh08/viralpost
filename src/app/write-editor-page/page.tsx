import React from 'react';
import AppLayout from '@/components/AppLayout';
import WriteEditorClient from './components/WriteEditorClient';

export default function WriteEditorPage() {
  return (
    <AppLayout>
      <WriteEditorClient />
    </AppLayout>
  );
}