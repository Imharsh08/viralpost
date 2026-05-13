'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Eye, EyeOff, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';

interface SignupFormData {
  displayName: string;
  username: string;
  email: string;
  password: string;
  agreeToTerms: boolean;
}

interface SignupFormProps {
  onSwitchToLogin: () => void;
}

export default function SignupForm({ onSwitchToLogin }: SignupFormProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const { signUp, signInWithGoogle } = useAuth();
  const router = useRouter();

  const handleGoogleSignUp = async () => {
    setGoogleLoading(true);
    try {
      await signInWithGoogle();
    } catch (error: any) {
      toast.error(error.message || 'Failed to sign up with Google.');
      setGoogleLoading(false);
    }
  };

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<SignupFormData>();

  const password = watch('password', '');
  const passwordStrength = getPasswordStrength(password);

  const onSubmit = async (data: SignupFormData) => {
    setIsLoading(true);
    try {
      await signUp(data.email, data.password, {
        fullName: data.displayName,
        username: data.username,
      });
      setSuccess(true);
      toast.success('Account created! Check your email to verify your account.');
    } catch (error: any) {
      console.error('Signup error:', error);
      toast.error(error.message || 'Failed to create account. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <div className="flex flex-col items-center text-center py-8 animate-scale-in">
        <div className="w-16 h-16 rounded-2xl bg-positive-bg flex items-center justify-center mb-4">
          <CheckCircle2 size={32} className="text-positive" />
        </div>
        <h2 className="text-xl font-bold text-foreground mb-2">Check your email! 📧</h2>
        <p className="text-sm text-muted-foreground mb-2">
          We&apos;ve sent you a verification link. Click it to activate your account.
        </p>
        <p className="text-xs text-muted-foreground mb-6">Didn&apos;t receive the email? Check your spam folder.</p>
        <button onClick={onSwitchToLogin} className="btn-primary w-full justify-center py-3">
          Back to Sign In →
        </button>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Create your account</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Start writing and earning points from day one
        </p>
      </div>

      {/* Google OAuth */}
      <button
        type="button"
        onClick={handleGoogleSignUp}
        disabled={googleLoading}
        className="w-full flex items-center justify-center gap-3 px-4 py-2.5 rounded-xl border border-border bg-card hover:bg-muted text-sm font-semibold text-foreground transition-all duration-150 active:scale-95 mb-5 disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {googleLoading ? <Loader2 size={18} className="animate-spin" /> : (
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M17.64 9.205c0-.639-.057-1.252-.164-1.841H9v3.481h4.844a4.14 4.14 0 01-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
          <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853"/>
          <path d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
          <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
        </svg>
        )}
        Sign up with Google
      </button>

      <div className="flex items-center gap-3 mb-5">
        <hr className="flex-1 border-border" />
        <span className="text-xs text-muted-foreground font-medium">or with email</span>
        <hr className="flex-1 border-border" />
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        {/* Display name */}
        <div>
          <label className="block text-sm font-semibold text-foreground mb-1.5">
            Display Name
          </label>
          <p className="text-xs text-muted-foreground mb-1.5">This appears on your posts and profile</p>
          <input
            type="text"
            placeholder="Maya Chen"
            className={`input-field ${errors.displayName ? 'border-negative' : ''}`}
            {...register('displayName', {
              required: 'Display name is required',
              minLength: { value: 2, message: 'Must be at least 2 characters' },
              maxLength: { value: 50, message: 'Must be 50 characters or fewer' },
            })}
          />
          {errors.displayName && (
            <p className="flex items-center gap-1 mt-1.5 text-xs text-negative">
              <AlertCircle size={12} />
              {errors.displayName.message}
            </p>
          )}
        </div>

        {/* Username */}
        <div>
          <label className="block text-sm font-semibold text-foreground mb-1.5">
            Username
          </label>
          <p className="text-xs text-muted-foreground mb-1.5">Your public URL: viralpost.app/u/username</p>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground font-medium">@</span>
            <input
              type="text"
              placeholder="mayachen"
              className={`input-field pl-7 ${errors.username ? 'border-negative' : ''}`}
              {...register('username', {
                required: 'Username is required',
                pattern: {
                  value: /^[a-z0-9_]{3,20}$/,
                  message: 'Only lowercase letters, numbers, underscores (3–20 chars)',
                },
              })}
            />
          </div>
          {errors.username && (
            <p className="flex items-center gap-1 mt-1.5 text-xs text-negative">
              <AlertCircle size={12} />
              {errors.username.message}
            </p>
          )}
        </div>

        {/* Email */}
        <div>
          <label className="block text-sm font-semibold text-foreground mb-1.5">
            Email address
          </label>
          <input
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            className={`input-field ${errors.email ? 'border-negative' : ''}`}
            {...register('email', {
              required: 'Email is required',
              pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: 'Enter a valid email address' },
            })}
          />
          {errors.email && (
            <p className="flex items-center gap-1 mt-1.5 text-xs text-negative">
              <AlertCircle size={12} />
              {errors.email.message}
            </p>
          )}
        </div>

        {/* Password */}
        <div>
          <label className="block text-sm font-semibold text-foreground mb-1.5">
            Password
          </label>
          <p className="text-xs text-muted-foreground mb-1.5">Minimum 8 characters with a number</p>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              placeholder="Create a strong password"
              className={`input-field pr-10 ${errors.password ? 'border-negative' : ''}`}
              {...register('password', {
                required: 'Password is required',
                minLength: { value: 8, message: 'Must be at least 8 characters' },
                pattern: {
                  value: /^(?=.*[0-9])/,
                  message: 'Must include at least one number',
                },
              })}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          {errors.password && (
            <p className="flex items-center gap-1 mt-1.5 text-xs text-negative">
              <AlertCircle size={12} />
              {errors.password.message}
            </p>
          )}
          {/* Password strength bar */}
          {password.length > 0 && (
            <div className="mt-2">
              <div className="flex gap-1 mb-1">
                {[1, 2, 3, 4].map((level) => (
                  <div
                    key={`strength-bar-${level}`}
                    className={`h-1 flex-1 rounded-full transition-all duration-300 ${
                      passwordStrength.score >= level
                        ? passwordStrength.score <= 2
                          ? 'bg-negative'
                          : passwordStrength.score === 3
                          ? 'bg-warning' :'bg-positive' :'bg-border'
                    }`}
                  />
                ))}
              </div>
              <p className={`text-xs font-medium ${
                passwordStrength.score <= 2 ? 'text-negative' : passwordStrength.score === 3 ? 'text-warning' : 'text-positive'
              }`}>
                {passwordStrength.label}
              </p>
            </div>
          )}
        </div>

        {/* Terms */}
        <div>
          <label className="flex items-start gap-2.5 cursor-pointer">
            <input
              type="checkbox"
              className="w-4 h-4 rounded border-border text-primary accent-primary cursor-pointer mt-0.5 shrink-0"
              {...register('agreeToTerms', {
                required: 'You must agree to the terms to continue',
              })}
            />
            <span className="text-sm text-muted-foreground leading-relaxed">
              I agree to the{' '}
              <a href="#" className="text-primary font-semibold hover:underline">Terms of Service</a>
              {' '}and{' '}
              <a href="#" className="text-primary font-semibold hover:underline">Privacy Policy</a>
            </span>
          </label>
          {errors.agreeToTerms && (
            <p className="flex items-center gap-1 mt-1.5 text-xs text-negative">
              <AlertCircle size={12} />
              {errors.agreeToTerms.message}
            </p>
          )}
        </div>

        {/* Bonus callout */}
        <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-amber-50 border border-amber-200">
          <span className="text-base">🎁</span>
          <p className="text-xs text-amber-700 font-medium">
            <strong>50 bonus points</strong> credited on your first published post — worth real rewards.
          </p>
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={isLoading}
          className="btn-primary w-full py-3 text-sm justify-center mt-1"
        >
          {isLoading ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              Creating your account...
            </>
          ) : (
            'Create Free Account →'
          )}
        </button>
      </form>

      <p className="text-center text-sm text-muted-foreground mt-5">
        Already have an account?{' '}
        <button
          onClick={onSwitchToLogin}
          className="text-primary font-semibold hover:underline"
        >
          Sign in →
        </button>
      </p>
    </div>
  );
}

function getPasswordStrength(password: string): { score: number; label: string } {
  if (!password) return { score: 0, label: '' };
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^a-zA-Z0-9]/.test(password)) score++;
  const labels = ['', 'Weak', 'Fair', 'Good', 'Strong'];
  return { score: Math.max(1, score), label: labels[Math.max(1, score)] };
}