import React from 'react';
import AppLayout from '@/components/AppLayout';
import SearchClient from './SearchClient';

export const runtime = 'edge';

export default function SearchPage() {
  return (
    <AppLayout>
      <SearchClient />
    </AppLayout>
  );
}
