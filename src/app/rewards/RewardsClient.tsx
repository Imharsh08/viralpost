'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Zap, Gift, Coffee, Smartphone, Headphones, Package, Check, Lock, TrendingUp } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

type Category = 'digital' | 'lifestyle' | 'tech' | 'gadgets' | 'premium';

interface Reward {
  id: string;
  category: Category;
  name: string;
  description: string;
  cost: number;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  gradient: string;
}

const REWARDS: Reward[] = [
  // Digital
  { id: 'amazon-100', category: 'digital', name: 'Amazon Gift Card ₹100', description: 'Instant code via email', cost: 500, icon: Gift, gradient: 'from-orange-400 to-amber-500' },
  { id: 'recharge-50', category: 'digital', name: 'Mobile Recharge ₹50', description: 'Any operator, any plan', cost: 600, icon: Smartphone, gradient: 'from-blue-400 to-cyan-500' },
  { id: 'amazon-500', category: 'digital', name: 'Amazon Gift Card ₹500', description: 'Instant code via email', cost: 1000, icon: Gift, gradient: 'from-orange-500 to-amber-600' },
  // Lifestyle
  { id: 'coffee', category: 'lifestyle', name: 'Coffee Voucher', description: '₹150 at Starbucks / CCD', cost: 1000, icon: Coffee, gradient: 'from-amber-600 to-rose-500' },
  { id: 'movie-ticket', category: 'lifestyle', name: 'Movie Ticket', description: 'PVR / INOX, any city', cost: 1800, icon: Package, gradient: 'from-purple-400 to-pink-500' },
  { id: 'food-voucher', category: 'lifestyle', name: 'Swiggy Voucher ₹300', description: 'Order anything you like', cost: 2500, icon: Package, gradient: 'from-orange-400 to-red-500' },
  // Tech
  { id: 'phone-stand', category: 'tech', name: 'Aluminium Phone Stand', description: 'Premium desk accessory', cost: 2500, icon: Smartphone, gradient: 'from-slate-500 to-zinc-700' },
  { id: 'earbuds-case', category: 'tech', name: 'Leather Earbuds Case', description: 'Protect your AirPods', cost: 3500, icon: Headphones, gradient: 'from-stone-500 to-amber-800' },
  { id: 'usb-hub', category: 'tech', name: '7-in-1 USB-C Hub', description: 'HDMI + USB-A + SD card', cost: 5000, icon: Package, gradient: 'from-indigo-500 to-violet-600' },
  // Gadgets
  { id: 'bt-speaker', category: 'gadgets', name: 'Bluetooth Speaker', description: 'JBL Go 3 portable speaker', cost: 7500, icon: Headphones, gradient: 'from-rose-500 to-pink-600' },
  { id: 'wireless-charger', category: 'gadgets', name: 'Wireless Charging Pad', description: '15W fast charging, Qi certified', cost: 9000, icon: Smartphone, gradient: 'from-emerald-500 to-teal-600' },
  { id: 'tws-buds', category: 'gadgets', name: 'TWS Earbuds', description: 'boAt Airdopes 141 — bestseller', cost: 12000, icon: Headphones, gradient: 'from-blue-500 to-indigo-600' },
  // Premium
  { id: 'creator-hamper', category: 'premium', name: 'Creator Hamper Box', description: 'Curated stationery + tech + snacks', cost: 15000, icon: Gift, gradient: 'from-violet-500 to-fuchsia-600' },
  { id: 'macbook-stand', category: 'premium', name: 'Aluminium Laptop Stand', description: 'Ergonomic adjustable stand', cost: 18000, icon: Package, gradient: 'from-zinc-600 to-slate-800' },
  { id: 'echo-dot', category: 'premium', name: 'Amazon Echo Dot', description: 'Smart speaker with Alexa', cost: 25000, icon: Headphones, gradient: 'from-cyan-500 to-blue-600' },
];

const CATEGORIES: { id: Category | 'all'; label: string; emoji: string }[] = [
  { id: 'all', label: 'All Rewards', emoji: '✨' },
  { id: 'digital', label: 'Digital', emoji: '💳' },
  { id: 'lifestyle', label: 'Lifestyle', emoji: '☕' },
  { id: 'tech', label: 'Tech', emoji: '🎧' },
  { id: 'gadgets', label: 'Gadgets', emoji: '📱' },
  { id: 'premium', label: 'Premium', emoji: '🎁' },
];

export default function RewardsClient() {
  const { user, session, getUserProfile } = useAuth();
  const [pointsBalance, setPointsBalance] = useState(0);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<Category | 'all'>('all');
  const [redeeming, setRedeeming] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }
    getUserProfile()
      .then((p: any) => setPointsBalance(p?.points_balance ?? 0))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user]);

  const filtered = activeCategory === 'all' ? REWARDS : REWARDS.filter((r) => r.category === activeCategory);

  const handleRedeem = async (reward: Reward) => {
    if (!session) {
      toast.error('Sign in to redeem rewards');
      return;
    }
    if (pointsBalance < reward.cost) {
      toast.error(`You need ${(reward.cost - pointsBalance).toLocaleString()} more points`);
      return;
    }
    setRedeeming(reward.id);
    try {
      const res = await fetch('/api/rewards/redeem', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ reward_id: reward.id, reward_name: reward.name, cost: reward.cost }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Redemption failed');
      setPointsBalance(data.new_balance);
      toast.success(`${reward.name} redeemed! Check your email for delivery details.`);
    } catch (err: any) {
      toast.error(err.message || 'Redemption failed');
    } finally {
      setRedeeming(null);
    }
  };

  return (
    <div className="max-w-screen-xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-foreground">Rewards Catalog</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Spend your points on real rewards. Earn more by writing posts that go viral.
        </p>
      </div>

      {/* Balance card */}
      <div className="card p-5 mb-6 bg-gradient-to-r from-violet-50 via-purple-50 to-amber-50 border-purple-200">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-md">
              <Zap size={22} className="text-white fill-white" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Available Balance</p>
              <p className="text-3xl font-bold text-foreground font-mono tabular-nums">
                {loading ? '—' : pointsBalance.toLocaleString()}{' '}
                <span className="text-base text-muted-foreground font-normal">pts</span>
              </p>
            </div>
          </div>
          {user ? (
            <Link href="/write-editor-page" className="btn-primary">
              <TrendingUp size={15} />
              Earn More Points
            </Link>
          ) : (
            <Link href="/sign-up-login-screen" className="btn-primary">
              Sign in to redeem
            </Link>
          )}
        </div>
      </div>

      {/* How it works */}
      <div className="card p-4 mb-6 bg-amber-50/50 border-amber-100">
        <h3 className="text-xs font-bold text-amber-800 uppercase tracking-wider mb-2">How redemption works</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-muted-foreground">
          <div className="flex gap-2">
            <span className="w-5 h-5 rounded-full bg-amber-200 text-amber-800 font-bold flex items-center justify-center shrink-0">1</span>
            <span>Click <strong className="text-foreground">Redeem</strong> on any reward. We deduct points from your balance.</span>
          </div>
          <div className="flex gap-2">
            <span className="w-5 h-5 rounded-full bg-amber-200 text-amber-800 font-bold flex items-center justify-center shrink-0">2</span>
            <span>Digital rewards arrive by email instantly. Physical rewards ship to your address.</span>
          </div>
          <div className="flex gap-2">
            <span className="w-5 h-5 rounded-full bg-amber-200 text-amber-800 font-bold flex items-center justify-center shrink-0">3</span>
            <span>Minimum 500 pts to redeem. Points expire after 12 months of inactivity.</span>
          </div>
        </div>
      </div>

      {/* Category tabs */}
      <div className="flex gap-1.5 mb-5 overflow-x-auto scrollbar-hide pb-1">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setActiveCategory(cat.id)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold whitespace-nowrap transition-all duration-200 shrink-0 ${
              activeCategory === cat.id
                ? 'bg-foreground text-background shadow-sm'
                : 'bg-muted text-muted-foreground hover:text-foreground'
            }`}
          >
            <span>{cat.emoji}</span>
            {cat.label}
          </button>
        ))}
      </div>

      {/* Rewards grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((reward) => {
          const affordable = pointsBalance >= reward.cost;
          const Icon = reward.icon;
          return (
            <div
              key={reward.id}
              className={`card overflow-hidden flex flex-col transition-all duration-200 hover:shadow-md ${
                affordable ? 'border-border' : 'opacity-75'
              }`}
            >
              <div className={`bg-gradient-to-br ${reward.gradient} h-28 flex items-center justify-center relative`}>
                <Icon size={44} className="text-white drop-shadow-md" />
                {!affordable && (
                  <div className="absolute top-2 right-2 bg-background/90 backdrop-blur-sm rounded-full px-2 py-1 flex items-center gap-1">
                    <Lock size={10} className="text-muted-foreground" />
                    <span className="text-xs font-bold text-muted-foreground">Locked</span>
                  </div>
                )}
              </div>
              <div className="p-4 flex flex-col flex-1">
                <h3 className="text-sm font-bold text-foreground mb-1">{reward.name}</h3>
                <p className="text-xs text-muted-foreground mb-3 flex-1">{reward.description}</p>
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <Zap size={13} className="fill-amber-500 text-amber-500" />
                    <span className="text-sm font-bold text-foreground font-mono tabular-nums">
                      {reward.cost.toLocaleString()}
                    </span>
                  </div>
                  <button
                    onClick={() => handleRedeem(reward)}
                    disabled={!affordable || redeeming === reward.id}
                    className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-all duration-150 active:scale-95 disabled:cursor-not-allowed ${
                      affordable
                        ? 'bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm'
                        : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    {redeeming === reward.id ? (
                      'Processing…'
                    ) : affordable ? (
                      <span className="flex items-center gap-1">
                        <Check size={11} />
                        Redeem
                      </span>
                    ) : (
                      `+${(reward.cost - pointsBalance).toLocaleString()} pts`
                    )}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
