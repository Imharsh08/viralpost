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
      const ext = file.name.split('.').pop()?.toLowerCase() ?? 'jpg';
      const path = `${user.id}/${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from('post-images').upload(path, file, {
        cacheControl: '3600',
        upsert: false,
      });
      if (error) throw error;
      const { data } = supabase.storage.from('post-images').getPublicUrl(path);
      onChange(data.publicUrl);
      toast.success('Cover image uploaded');
    } catch (err: any) {
      toast.error(err.message || 'Upload failed');
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
