import React from 'react';

export default function FeedSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      {[1, 2, 3, 4]?.map((i) => (
        <div key={`skeleton-post-${i}`} className="card p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full animate-shimmer" />
            <div className="flex-1">
              <div className="h-3.5 w-32 rounded-md animate-shimmer mb-2" />
              <div className="h-3 w-24 rounded-md animate-shimmer" />
            </div>
          </div>
          <div className="h-4 w-3/4 rounded-md animate-shimmer mb-2" />
          <div className="h-3.5 w-full rounded-md animate-shimmer mb-2" />
          <div className="h-3.5 w-5/6 rounded-md animate-shimmer mb-4" />
          <div className="flex gap-2 mb-4">
            <div className="h-5 w-16 rounded-full animate-shimmer" />
            <div className="h-5 w-20 rounded-full animate-shimmer" />
            <div className="h-5 w-14 rounded-full animate-shimmer" />
          </div>
          <div className="flex gap-4 pt-3 border-t border-border">
            <div className="h-7 w-16 rounded-lg animate-shimmer" />
            <div className="h-7 w-16 rounded-lg animate-shimmer" />
            <div className="h-7 w-16 rounded-lg animate-shimmer" />
          </div>
        </div>
      ))}
    </div>
  );
}