'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { Loader2 } from 'lucide-react';

export default function AuthCallback() {
  const router = useRouter();

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        // Exchange the OAuth code for a session (Google OAuth uses PKCE flow)
        const code = new URLSearchParams(window.location.search).get('code');
        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) {
            console.error('Code exchange error:', error);
            router.push('/sign-up-login-screen');
            return;
          }
        }

        const { data, error } = await supabase.auth.getSession();
        if (error || !data.session) {
          router.push('/sign-up-login-screen');
          return;
        }

        // Send new users to onboarding; existing users to feed
        const { data: profile } = await supabase
          .from('users')
          .select('onboarded_at')
          .eq('id', data.session.user.id)
          .maybeSingle();

        if (!profile || !profile.onboarded_at) {
          router.push('/onboarding');
        } else {
          router.push('/');
        }
      } catch (error) {
        console.error('Auth callback error:', error);
        router.push('/sign-up-login-screen');
      }
    };

    handleAuthCallback();
  }, [router]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center">
        <Loader2 size={48} className="animate-spin text-primary mx-auto mb-4" />
        <h1 className="text-xl font-semibold text-foreground mb-2">Completing sign in...</h1>
        <p className="text-muted-foreground">Please wait while we verify your account.</p>
      </div>
    </div>
  );
}