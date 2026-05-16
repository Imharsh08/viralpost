'use client';

import React, { useRef, useState } from 'react';
import { ImagePlus, Loader2, X } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase/client';
import AppImage from '@/components/ui/AppImage';

interface CoverImageUploadProps {
  value: string | null;
  onChange: (url: string | null) => void;
}

const MAX_BYTES = 5 * 1024 * 1024; // 5 MB per PRD §6.3
const ALLOWED = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

export default function CoverImageUpload({ value, onChange }: CoverImageUploadProps) {
  const { user } = useAuth();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handlePick = () => fileRef.current?.click();

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // reset so re-picking same file works
    if (!file) return;
    if (!user) {
      toast.error('Sign in to upload images');
      return;
    }
    if (!ALLOWED.includes(file.type)) {
      toast.error('Only JPG, PNG, WEBP, or GIF allowed');
      return;
    }
    if (file.size > MAX_BYTES) {
      toast.error('Image must be under 5 MB');
      return;
    }

    setUploading(true);
    try {
      // Sanity check: confirm we have a live session. The session is read
      // from localStorage by the singleton client; if it's stale or missing,
      // the upload will 401 with a confusing "new row violates row-level
      // security policy" error.
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        toast.error('Your session expired. Please sign in again.');
        return;
      }

      const ext = file.name.split('.').pop()?.toLowerCase() ?? 'jpg';
      // Path MUST start with the user's UUID — that's what the RLS policy
      // in migration 008 checks via storage.foldername(name)[1].
      const path = `${user.id}/${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from('post-images')
        .upload(path, file, {
          cacheControl: '3600',
          upsert: false,
          contentType: file.type,
        });

      if (uploadError) {
        // Translate common Supabase storage failures into actionable copy
        const msg = uploadError.message.toLowerCase();
        if (msg.includes('bucket') && msg.includes('not found')) {
          throw new Error('Storage not configured yet. Ask the admin to run migration 008 in Supabase.');
        }
        if (msg.includes('row-level security') || msg.includes('not authorized') || msg.includes('unauthorized')) {
          throw new Error('Upload blocked by permissions. Make sure you are signed in.');
        }
        if (msg.includes('payload too large') || msg.includes('exceeded')) {
          throw new Error('That image is too large. Pick one under 5 MB.');
        }
        throw uploadError;
      }

      const { data } = supabase.storage.from('post-images').getPublicUrl(path);
      if (!data?.publicUrl) {
        throw new Error('Upload succeeded but the public URL is missing. Check bucket visibility.');
      }
      onChange(data.publicUrl);
      toast.success('Cover image uploaded');
    } catch (err: any) {
      // Surface real error to the dev console as well as a toast
      console.error('[CoverImageUpload] upload failed:', err);
      toast.error(err?.message || 'Upload failed — see console for details');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="card p-4">
      <div className="flex items-center justify-between mb-2">
        <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider">
          Cover Image <span className="text-muted-foreground/60 font-normal normal-case">(optional, max 5MB)</span>
        </label>
        {value && (
          <button
            onClick={() => onChange(null)}
            className="flex items-center gap-1 text-xs font-semibold text-muted-foreground hover:text-negative transition-colors"
          >
            <X size={12} />
            Remove
          </button>
        )}
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        onChange={handleFile}
        className="hidden"
      />

      {value ? (
        <button
          onClick={handlePick}
          disabled={uploading}
          className="relative w-full rounded-xl overflow-hidden border border-border group"
        >
          <AppImage
            src={value}
            alt="Cover preview"
            width={800}
            height={420}
            className="w-full h-48 object-cover"
          />
          <div className="absolute inset-0 bg-foreground/0 group-hover:bg-foreground/40 transition-colors flex items-center justify-center">
            <span className="opacity-0 group-hover:opacity-100 text-white text-sm font-semibold transition-opacity flex items-center gap-1.5">
              <ImagePlus size={14} />
              Replace image
            </span>
          </div>
        </button>
      ) : (
        <button
          onClick={handlePick}
          disabled={uploading}
          className="w-full h-32 rounded-xl border-2 border-dashed border-border bg-muted/30 hover:border-primary hover:bg-secondary/30 transition-colors flex flex-col items-center justify-center gap-1.5 disabled:opacity-60 disabled:cursor-wait"
        >
          {uploading ? (
            <>
              <Loader2 size={20} className="animate-spin text-primary" />
              <span className="text-sm font-semibold text-muted-foreground">Uploading…</span>
            </>
          ) : (
            <>
              <ImagePlus size={22} className="text-muted-foreground" />
              <span className="text-sm font-semibold text-foreground">Add a cover image</span>
              <span className="text-xs text-muted-foreground">Boosts discoverability in the feed</span>
            </>
          )}
        </button>
      )}
    </div>
  );
}
