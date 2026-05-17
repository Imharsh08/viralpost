import React from 'react';
import AppLayout from '@/components/AppLayout';
import NotificationsClient from './NotificationsClient';

export const metadata = {
  title: 'Notifications — ViralPost',
};

export default function NotificationsPage() {
  return (
    <AppLayout>
      <NotificationsClient />
    </AppLayout>
  );
}
