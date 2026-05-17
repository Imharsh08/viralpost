'use client';

import React, { useEffect, useRef, useState } from 'react';
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
const COMPRESS_MAX_EDGE = 1600; // 1600px max edge — feed never shows more
const COMPRESS_QUALITY = 0.85;

/**
 * Downscale + recompress an image to JPEG/WEBP so the network upload is
 * a fraction of the original. GIFs are passed through untouched to keep
 * animation. Returns the original file on any failure path.
 */
async function compressImage(file: File): Promise<File> {
  if (file.type === 'image/gif') return file;
  if (typeof createImageBitmap !== 'function') return file;

  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, COMPRESS_MAX_EDGE / Math.max(bitmap.width, bitmap.height));
    if (scale === 1 && file.size < 600_000) {
      // Already small enough — skip the recompression overhead
      bitmap.close?.();
      return file;
    }
    const w = Math.round(bitmap.width * scale);
    const h = Math.round(bitmap.height * scale);

    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0, w, h);
    bitmap.close?.();

    const blob: Blob | null = await new Promise((resolve) =>
      canvas.toBlob(resolve, 'image/webp', COMPRESS_QUALITY),
    );
    if (!blob || blob.size >= file.size) return file;

    return new File([blob], file.name.replace(/\.[a-z]+$/i, '.webp'), {
      type: 'image/webp',
      lastModified: Date.now(),
    });
  } catch {
    return file;
  }
}

export default function CoverImageUpload({ value, onChange }: CoverImageUploadProps) {
  const { user } = useAuth();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  // Local blob URL shown immediately while the real upload runs in the
  // background. Cleared once the public URL takes over.
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // Revoke blob URL on unmount / replacement to avoid memory leaks
  useEffect(() => () => { if (previewUrl) URL.revokeObjectURL(previewUrl); }, [previewUrl]);

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

    // OPTIMISTIC: show the picked image instantly. The slow network upload
    // and the compression both run in the background.
    const localPreview = URL.createObjectURL(file);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(localPreview);
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

      // Compress in parallel with the storage round-trip setup
      const compressed = await compressImage(file);

      const ext = compressed.type === 'image/webp' ? 'webp'
        : compressed.type === 'image/gif' ? 'gif'
        : (file.name.split('.').pop()?.toLowerCase() ?? 'jpg');
      // Path MUST start with the user's UUID — that's what the RLS policy
      // in migration 008 checks via storage.foldername(name)[1].
      const path = `${user.id}/${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from('post-images')
        .upload(path, compressed, {
          cacheControl: '31536000',  // 1 year — file paths are content-unique
          upsert: false,
          contentType: compressed.type,
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
      // Drop the blob preview now that the real URL is live
      setPreviewUrl(null);
      URL.revokeObjectURL(localPreview);
      toast.success('Cover image uploaded');
    } catch (err: any) {
      // Roll back the optimistic preview on failure
      setPreviewUrl(null);
      URL.revokeObjectURL(localPreview);
      console.error('[CoverImageUpload] upload failed:', err);
      toast.error(err?.message || 'Upload failed — see console for details');
    } finally {
      setUploading(false);
    }
  };

  // Display priority: the optimistic local preview (if we're mid-upload),
  // otherwise the persisted public URL from the parent form.
  const displaySrc = previewUrl ?? value;

  return (
    <div className="card p-4">
      <div className="flex items-center justify-between mb-2">
        <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider">
          Cover Image <span className="text-muted-foreground/60 font-normal normal-case">(optional, max 5MB)</span>
        </label>
        {displaySrc && !uploading && (
          <button
            onClick={() => {
              if (previewUrl) URL.revokeObjectURL(previewUrl);
              setPreviewUrl(null);
              onChange(null);
            }}
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

      {displaySrc ? (
        <button
          onClick={handlePick}
          disabled={uploading}
          className="relative w-full rounded-xl overflow-hidden border border-border group disabled:cursor-wait"
        >
          {/* Use a raw <img> for the blob: preview so we skip Next/Image's
              optimization for the local URL, and AppImage for the public URL
              once the upload finishes. */}
          {previewUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={previewUrl}
              alt="Cover preview"
              className="w-full h-48 object-cover"
            />
          ) : (
            <AppImage
              src={displaySrc}
              alt="Cover preview"
              width={800}
              height={420}
              className="w-full h-48 object-cover"
            />
          )}
          {/* Uploading overlay — shown only while the network request is in flight */}
          {uploading && (
            <div className="absolute inset-0 bg-foreground/40 flex items-center justify-center backdrop-blur-[1px]">
              <span className="flex items-center gap-1.5 text-white text-sm font-semibold">
                <Loader2 size={14} className="animate-spin" />
                Uploading…
              </span>
            </div>
          )}
          {/* Hover-replace hint (idle state only) */}
          {!uploading && (
            <div className="absolute inset-0 bg-foreground/0 group-hover:bg-foreground/40 transition-colors flex items-center justify-center">
              <span className="opacity-0 group-hover:opacity-100 text-white text-sm font-semibold transition-opacity flex items-center gap-1.5">
                <ImagePlus size={14} />
                Replace image
              </span>
            </div>
          )}
        </button>
      ) : (
        <button
          onClick={handlePick}
          disabled={uploading}
          className="w-full h-32 rounded-xl border-2 border-dashed border-border bg-muted/30 hover:border-primary hover:bg-secondary/30 transition-colors flex flex-col items-center justify-center gap-1.5 disabled:opacity-60 disabled:cursor-wait"
        >
          <ImagePlus size={22} className="text-muted-foreground" />
          <span className="text-sm font-semibold text-foreground">Add a cover image</span>
          <span className="text-xs text-muted-foreground">Boosts discoverability in the feed</span>
        </button>
      )}
    </div>
  );
}
