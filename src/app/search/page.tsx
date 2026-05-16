import React from 'react';
import AppLayout from '@/components/AppLayout';
import SearchClient from './SearchClient';

export const runtime = 'edge';
export const dynamic = 'force-dynamic';

export default function SearchPage() {
  return (
    <AppLayout>
      <SearchClient />
    </AppLayout>
  );
}
