import React from 'react';

interface SkeletonProps {
  /** Tailwind classes for size + shape (e.g. "w-24 h-24 rounded-full") */
  className?: string;
}

/**
 * Layout-preserving placeholder block. Uses the global `animate-shimmer`
 * utility (in tailwind.css) so the gradient cycles automatically.
 *
 * Prefer this over spinners during initial load — it keeps the same
 * footprint as the eventual content, which eliminates the jump (CLS)
 * when data arrives.
 *
 * Usage:
 *   <Skeleton className="w-24 h-24 rounded-full" />        // avatar
 *   <Skeleton className="h-4 w-2/3 rounded" />             // text line
 *   <Skeleton className="aspect-square rounded-xl" />      // grid cell
 */
export default function Skeleton({ className = '' }: SkeletonProps) {
  return (
    <div
      aria-hidden
      className={`animate-shimmer ${className}`}
    />
  );
}
