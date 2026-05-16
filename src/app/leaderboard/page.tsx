import React from 'react';
import AppLayout from '@/components/AppLayout';
import LeaderboardClient from './LeaderboardClient';

export const metadata = {
  title: 'Leaderboard — ViralPost',
  description: 'Top earning creators, most viral posts, and most engaging writers on ViralPost.',
};

export default function LeaderboardPage() {
  return (
    <AppLayout>
      <LeaderboardClient />
    </AppLayout>
  );
}
