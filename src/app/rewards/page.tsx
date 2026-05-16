import React from 'react';
import AppLayout from '@/components/AppLayout';
import RewardsClient from './RewardsClient';

export const metadata = {
  title: 'Rewards Catalog — ViralPost',
  description: 'Redeem your points for real rewards: gift cards, gadgets, vouchers, and more.',
};

export default function RewardsPage() {
  return (
    <AppLayout>
      <RewardsClient />
    </AppLayout>
  );
}
