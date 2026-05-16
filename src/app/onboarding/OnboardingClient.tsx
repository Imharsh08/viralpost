'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Sparkles, Check, ArrowRight, Loader2, Zap, PenSquare, Briefcase,
  TrendingUp, Brain, Heart, Code, DollarSign, Megaphone, Palette, Lightbulb, BookOpen,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

const NICHE_OPTIONS = [
  { id: 'Tech', label: 'Tech', icon: Code, gradient: 'from-blue-500 to-cyan-500' },
  { id: 'Startup', label: 'Startup', icon: TrendingUp, gradient: 'from-violet-500 to-fuchsia-500' },
  { id: 'Business', label: 'Business', icon: Briefcase, gradient: 'from-slate-600 to-zinc-700' },
  { id: 'Career', label: 'Career', icon: Briefcase, gradient: 'from-emerald-500 to-teal-500' },
  { id: 'Finance', label: 'Finance', icon: DollarSign, gradient: 'from-green-500 to-emerald-600' },
  { id: 'Marketing', label: 'Marketing', icon: Megaphone, gradient: 'from-orange-500 to-rose-500' },
  { id: 'Design', label: 'Design', icon: Palette, gradient: 'from-pink-500 to-rose-500' },
  { id: 'AI', label: 'AI', icon: Brain, gradient: 'from-indigo-500 to-purple-600' },
  { id: 'Productivity', label: 'Productivity', icon: Lightbulb, gradient: 'from-amber-500 to-orange-500' },
  { id: 'Lifestyle', label: 'Lifestyle', icon: Heart, gradient: 'from-rose-500 to-pink-500' },
  { id: 'Writing', label: 'Writing', icon: BookOpen, gradient: 'from-stone-500 to-amber-700' },
  { id: 'CreatorEconomy', label: 'Creator Economy', icon: Sparkles, gradient: 'from-fuchsia-500 to-purple-600' },
];

type Step = 'niches' | 'profile' | 'welcome';

export default function OnboardingClient() {
  const router = useRouter();
  const { user, session, getUserProfile } = useAuth();
  const [step, setStep] = useState<Step>('niches');
  const [niches, setNiches] = useState<string[]>([]);
  const [displayName, setDisplayName] = useState('');
  const [headline, setHeadline] = useState('');
  const [bio, setBio] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [checking, setChecking] = useState(true);

  // Pre-fill from existing profile; redirect away if already onboarded
  useEffect(() => {
    if (!user) {
      router.push('/sign-up-login-screen');
      return;
    }
    getUserProfile()
      .then((p: any) => {
        if (p?.onboarded_at) {
          router.replace('/');
          return;
        }
        if (p?.display_name) setDisplayName(p.display_name);
        if (p?.bio) setBio(p.bio);
      })
      .catch(() => {})
      .finally(() => setChecking(false));
  }, [user]);

  const toggleNiche = (id: string) => {
    setNiches((prev) => {
      if (prev.includes(id)) return prev.filter((n) => n !== id);
      if (prev.length >= 5) {
        toast.error('Pick up to 5 niches');
        return prev;
      }
      return [...prev, id];
    });
  };

  const canContinueNiches = niches.length >= 3;
  const canFinish = displayName.trim().length > 0;

  const handleFinish = async () => {
    if (!session) return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/onboarding', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          niche_tags: niches,
          headline,
          bio,
          display_name: displayName,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Onboarding failed');
      }
      setStep('welcome');
    } catch (err: any) {
      toast.error(err.message || 'Could not complete onboarding');
    } finally {
      setSubmitting(false);
    }
  };

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 size={28} className="animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 via-background to-amber-50 px-4 py-8">
      <div className="max-w-2xl mx-auto">
        {/* Progress */}
        <div className="flex items-center gap-2 mb-6">
          <StepDot active={step === 'niches'} done={step !== 'niches'} label="Niches" />
          <div className="flex-1 h-0.5 bg-muted" />
          <StepDot active={step === 'profile'} done={step === 'welcome'} label="Profile" />
          <div className="flex-1 h-0.5 bg-muted" />
          <StepDot active={step === 'welcome'} done={false} label="Done" />
        </div>

        {step === 'niches' && (
          <div className="card p-6 sm:p-8 animate-fade-in">
            <div className="flex items-center gap-2 mb-1">
              <Sparkles size={20} className="text-primary" />
              <span className="text-xs font-bold text-primary uppercase tracking-wider">Step 1 of 3</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-1">
              What do you write about?
            </h1>
            <p className="text-sm text-muted-foreground mb-6">
              Pick <strong className="text-foreground">3 to 5 topics</strong>. We'll show you posts and creators in these niches.
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 mb-6">
              {NICHE_OPTIONS.map((niche) => {
                const selected = niches.includes(niche.id);
                const Icon = niche.icon;
                return (
                  <button
                    key={niche.id}
                    onClick={() => toggleNiche(niche.id)}
                    className={`relative p-4 rounded-2xl border-2 transition-all duration-150 active:scale-95 text-left ${
                      selected
                        ? 'border-primary bg-secondary/50 shadow-sm'
                        : 'border-border bg-card hover:border-primary/40'
                    }`}
                  >
                    <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${niche.gradient} flex items-center justify-center mb-2 shadow-sm`}>
                      <Icon size={18} className="text-white" />
                    </div>
                    <p className="text-sm font-bold text-foreground">{niche.label}</p>
                    {selected && (
                      <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                        <Check size={12} className="text-primary-foreground" strokeWidth={3} />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>

            <div className="flex items-center justify-between gap-3">
              <p className="text-xs text-muted-foreground">
                {niches.length < 3 ? `Pick ${3 - niches.length} more` : `${niches.length} of 5 selected`}
              </p>
              <button
                onClick={() => setStep('profile')}
                disabled={!canContinueNiches}
                className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Continue
                <ArrowRight size={15} />
              </button>
            </div>
          </div>
        )}

        {step === 'profile' && (
          <div className="card p-6 sm:p-8 animate-fade-in">
            <div className="flex items-center gap-2 mb-1">
              <Sparkles size={20} className="text-primary" />
              <span className="text-xs font-bold text-primary uppercase tracking-wider">Step 2 of 3</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-1">
              Set up your profile
            </h1>
            <p className="text-sm text-muted-foreground mb-6">
              Help readers find and follow you. You can change these later.
            </p>

            <div className="flex flex-col gap-4 mb-6">
              <div>
                <label className="block text-xs font-bold text-foreground uppercase tracking-wider mb-1.5">
                  Display name <span className="text-negative">*</span>
                </label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="e.g. Aisha Obi"
                  maxLength={80}
                  className="input-field w-full"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-foreground uppercase tracking-wider mb-1.5">
                  Headline <span className="text-muted-foreground font-normal normal-case">(optional)</span>
                </label>
                <input
                  type="text"
                  value={headline}
                  onChange={(e) => setHeadline(e.target.value)}
                  placeholder="e.g. Startup operator writing about growth"
                  maxLength={160}
                  className="input-field w-full"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  {headline.length}/160
                </p>
              </div>
              <div>
                <label className="block text-xs font-bold text-foreground uppercase tracking-wider mb-1.5">
                  Bio <span className="text-muted-foreground font-normal normal-case">(optional)</span>
                </label>
                <textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Tell readers a bit about you..."
                  maxLength={500}
                  rows={3}
                  className="input-field w-full resize-none"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  {bio.length}/500
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between gap-3">
              <button onClick={() => setStep('niches')} className="btn-ghost text-sm font-semibold">
                Back
              </button>
              <button
                onClick={handleFinish}
                disabled={!canFinish || submitting}
                className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? (
                  <>
                    <Loader2 size={15} className="animate-spin" />
                    Saving…
                  </>
                ) : (
                  <>
                    Finish setup
                    <ArrowRight size={15} />
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {step === 'welcome' && (
          <div className="card p-8 text-center animate-fade-in bg-gradient-to-br from-violet-50/50 via-card to-amber-50/50">
            <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center mx-auto mb-5 shadow-lg">
              <Zap size={36} className="text-white fill-white" />
            </div>
            <h1 className="text-3xl font-bold text-foreground mb-2">
              You earned <span className="text-amber-600">+25 points</span>!
            </h1>
            <p className="text-base text-muted-foreground mb-1">
              Welcome to ViralPost, {displayName.split(' ')[0]}.
            </p>
            <p className="text-sm text-muted-foreground mb-6 max-w-md mx-auto">
              Write your first post to earn another <strong className="text-foreground">+50 bonus points</strong>.
              Every ad view, like, and follower then earns you more.
            </p>

            <div className="card p-4 bg-amber-50/70 border-amber-200 mb-6 max-w-md mx-auto text-left">
              <h3 className="text-xs font-bold text-amber-800 uppercase tracking-wider mb-2">Your starter rewards</h3>
              <ul className="flex flex-col gap-1.5 text-sm">
                <li className="flex items-center gap-2 text-foreground">
                  <Check size={14} className="text-emerald-500 shrink-0" />
                  <span><strong>+25 pts</strong> — Profile complete (just earned!)</span>
                </li>
                <li className="flex items-center gap-2 text-foreground">
                  <Check size={14} className="text-amber-500 shrink-0" />
                  <span><strong>+50 pts</strong> — Publish your first post</span>
                </li>
                <li className="flex items-center gap-2 text-muted-foreground">
                  <Check size={14} className="text-muted-foreground/40 shrink-0" />
                  <span><strong>+100 pts</strong> — When your post hits 1,000 views</span>
                </li>
              </ul>
            </div>

            <div className="flex items-center gap-2 justify-center flex-wrap">
              <button
                onClick={() => router.push('/write-editor-page')}
                className="btn-primary"
              >
                <PenSquare size={15} />
                Write your first post
              </button>
              <button
                onClick={() => router.push('/')}
                className="btn-secondary"
              >
                Explore the feed
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function StepDot({ active, done, label }: { active: boolean; done: boolean; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <div
        className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all ${
          done
            ? 'bg-emerald-500 border-emerald-500 text-white'
            : active
            ? 'bg-primary border-primary text-primary-foreground'
            : 'bg-card border-border text-muted-foreground'
        }`}
      >
        {done ? <Check size={13} strokeWidth={3} /> : label[0]}
      </div>
      <span className={`text-xs font-semibold hidden sm:inline ${active ? 'text-foreground' : 'text-muted-foreground'}`}>
        {label}
      </span>
    </div>
  );
}
