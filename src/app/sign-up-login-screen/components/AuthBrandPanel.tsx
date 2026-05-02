import React from 'react';
import { Zap, Sparkles, TrendingUp, Gift } from 'lucide-react';

const features = [
  {
    id: 'feat-ai',
    icon: Sparkles,
    title: 'AI-Powered Enhancement',
    desc: 'One click transforms your raw draft into a viral-optimized post using Gemini AI.',
    color: 'bg-violet-100 text-primary',
  },
  {
    id: 'feat-earn',
    icon: Zap,
    title: 'Earn While You Publish',
    desc: 'Every verified ad impression on your post earns you points — automatically.',
    color: 'bg-amber-100 text-amber-700',
  },
  {
    id: 'feat-trend',
    icon: TrendingUp,
    title: 'Algorithmic Feed Placement',
    desc: 'Your best posts surface to thousands of readers based on engagement quality.',
    color: 'bg-emerald-100 text-emerald-700',
  },
  {
    id: 'feat-rewards',
    icon: Gift,
    title: 'Redeem Real Rewards',
    desc: 'Cash out points for gadgets, hampers, and physical gifts shipped to your door.',
    color: 'bg-pink-100 text-pink-700',
  },
];

const socialProof = [
  { id: 'sp-creators', value: '24,891', label: 'Active Creators' },
  { id: 'sp-points', value: '₹4.2M', label: 'Points Redeemed' },
  { id: 'sp-posts', value: '138K+', label: 'Posts Published' },
];

export default function AuthBrandPanel() {
  return (
    <div className="hidden lg:flex lg:w-[520px] xl:w-[600px] shrink-0 bg-gradient-to-br from-primary via-violet-700 to-purple-900 p-12 flex-col justify-between relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/3 translate-x-1/3" />
      <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full translate-y-1/3 -translate-x-1/3" />
      <div className="absolute top-1/2 right-8 w-24 h-24 bg-accent/20 rounded-full -translate-y-1/2" />
      {/* Logo */}
      <div className="relative">
        <div className="flex items-center gap-3 mb-10">
          <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center border border-white/30">
            <span className="text-white font-black text-xl">V</span>
          </div>
          <span className="text-white font-extrabold text-2xl tracking-tight">ViralPost</span>
        </div>

        <h2 className="text-3xl font-extrabold text-white leading-tight mb-4 text-balance">
          Write once.<br />
          Go viral.<br />
          <span className="text-accent">Earn real rewards.</span>
        </h2>
        <p className="text-white/70 text-sm leading-relaxed">
          Join 24,000+ creators who use AI to write better, publish faster, and earn from every view.
        </p>
      </div>
      {/* Features */}
      <div className="relative flex flex-col gap-4 my-8">
        {features?.map((f) => (
          <div key={f?.id} className="flex items-start gap-3">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${f?.color} bg-opacity-20`}>
              <f.icon size={16} />
            </div>
            <div>
              <p className="text-white text-sm font-bold">{f?.title}</p>
              <p className="text-white/60 text-xs leading-relaxed mt-0.5">{f?.desc}</p>
            </div>
          </div>
        ))}
      </div>
      {/* Social proof */}
      <div className="relative grid grid-cols-3 gap-4 pt-6 border-t border-white/20">
        {socialProof?.map((sp) => (
          <div key={sp?.id}>
            <p className="text-white font-extrabold text-xl font-mono tabular-nums">{sp?.value}</p>
            <p className="text-white/60 text-xs mt-0.5">{sp?.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}