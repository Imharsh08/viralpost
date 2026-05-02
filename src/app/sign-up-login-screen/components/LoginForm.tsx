'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Eye, EyeOff, Loader2, Copy, Check, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

interface LoginFormData {
  email: string;
  password: string;
  rememberMe: boolean;
}

interface LoginFormProps {
  onSwitchToSignup: () => void;
}

const demoCredentials = {
  email: 'maya.chen@viralpost.app',
  password: 'Creator2026!',
};

export default function LoginForm({ onSwitchToSignup }: LoginFormProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<LoginFormData>({
    defaultValues: { rememberMe: false },
  });

  const handleCopy = async (field: 'email' | 'password') => {
    await navigator.clipboard.writeText(demoCredentials[field]);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const autofillDemo = () => {
    setValue('email', demoCredentials.email);
    setValue('password', demoCredentials.password);
    toast.success('Demo credentials filled in');
  };

  const onSubmit = async (data: LoginFormData) => {
    setIsLoading(true);
    // Backend: POST /api/auth/login with { email, password }
    await new Promise((r) => setTimeout(r, 1500));

    if (data.email !== demoCredentials.email || data.password !== demoCredentials.password) {
      setIsLoading(false);
      toast.error('Invalid credentials — use the demo account below to sign in');
      return;
    }

    toast.success('Welcome back, Maya! 🎉');
    setIsLoading(false);
  };

  return (
    <div className="animate-fade-in">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Welcome back</h1>
        <p className="text-sm text-muted-foreground mt-1">Sign in to your ViralPost account</p>
      </div>

      {/* Google OAuth */}
      <button
        type="button"
        className="w-full flex items-center justify-center gap-3 px-4 py-2.5 rounded-xl border border-border bg-card hover:bg-muted text-sm font-semibold text-foreground transition-all duration-150 active:scale-95 mb-5"
      >
        {/* Google SVG icon */}
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M17.64 9.205c0-.639-.057-1.252-.164-1.841H9v3.481h4.844a4.14 4.14 0 01-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
          <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853"/>
          <path d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
          <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
        </svg>
        Continue with Google
      </button>

      <div className="flex items-center gap-3 mb-5">
        <hr className="flex-1 border-border" />
        <span className="text-xs text-muted-foreground font-medium">or sign in with email</span>
        <hr className="flex-1 border-border" />
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        {/* Email */}
        <div>
          <label className="block text-sm font-semibold text-foreground mb-1.5">
            Email address
          </label>
          <input
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            className={`input-field ${errors.email ? 'border-negative focus:border-negative' : ''}`}
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
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-sm font-semibold text-foreground">Password</label>
            <button
              type="button"
              className="text-xs text-primary font-semibold hover:underline"
            >
              Forgot password?
            </button>
          </div>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              placeholder="••••••••"
              className={`input-field pr-10 ${errors.password ? 'border-negative focus:border-negative' : ''}`}
              {...register('password', {
                required: 'Password is required',
                minLength: { value: 6, message: 'Password must be at least 6 characters' },
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
        </div>

        {/* Remember me */}
        <label className="flex items-center gap-2.5 cursor-pointer group">
          <input
            type="checkbox"
            className="w-4 h-4 rounded border-border text-primary accent-primary cursor-pointer"
            {...register('rememberMe')}
          />
          <span className="text-sm text-muted-foreground group-hover:text-foreground transition-colors">
            Remember me for 30 days
          </span>
        </label>

        {/* Submit */}
        <button
          type="submit"
          disabled={isLoading}
          className="btn-primary w-full py-3 text-sm justify-center mt-1"
          style={{ minWidth: '100%' }}
        >
          {isLoading ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              Signing in...
            </>
          ) : (
            'Sign In to ViralPost'
          )}
        </button>
      </form>

      {/* Switch to signup */}
      <p className="text-center text-sm text-muted-foreground mt-5">
        Don&apos;t have an account?{' '}
        <button
          onClick={onSwitchToSignup}
          className="text-primary font-semibold hover:underline"
        >
          Create one free →
        </button>
      </p>

      {/* Demo credentials */}
      <div className="mt-6 p-4 rounded-xl bg-violet-50 border border-violet-200">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-bold text-primary uppercase tracking-wider">Demo Account</p>
          <button
            onClick={autofillDemo}
            className="text-xs font-semibold text-primary bg-primary/10 px-2.5 py-1 rounded-lg hover:bg-primary/20 transition-colors active:scale-95"
          >
            Autofill →
          </button>
        </div>
        <div className="flex flex-col gap-2">
          {[
            { id: 'demo-email', label: 'Email', value: demoCredentials.email, field: 'email' as const },
            { id: 'demo-pass', label: 'Password', value: demoCredentials.password, field: 'password' as const },
          ].map((item) => (
            <div key={item.id} className="flex items-center justify-between gap-2">
              <div>
                <span className="text-xs text-muted-foreground">{item.label}: </span>
                <span className="text-xs font-mono font-medium text-foreground">{item.value}</span>
              </div>
              <button
                onClick={() => handleCopy(item.field)}
                className="text-muted-foreground hover:text-primary transition-colors shrink-0"
                aria-label={`Copy ${item.label}`}
              >
                {copiedField === item.field ? (
                  <Check size={13} className="text-positive" />
                ) : (
                  <Copy size={13} />
                )}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}