'use client';

import React from 'react';

interface State {
  error: Error | null;
}

interface Props {
  /** What to show in place of the crashing subtree. */
  fallback?: React.ReactNode;
  children: React.ReactNode;
}

/**
 * Wraps a subtree so a thrown render-time error renders a fallback
 * instead of crashing the whole page. React only catches errors thrown
 * during render or in lifecycle methods — async errors still need their
 * own .catch handlers.
 *
 * Use this around components that depend on browser-only APIs, realtime
 * channels, or third-party scripts (AdSense, etc.) so a single mishap
 * doesn't tear down the whole shell.
 */
export default class ClientErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    if (typeof window !== 'undefined') {
      // Surface to the dev console so we can debug, but keep the page alive.
      console.error('[ClientErrorBoundary]', error, info.componentStack);
    }
  }

  render() {
    if (this.state.error) {
      return this.props.fallback ?? null;
    }
    return this.props.children;
  }
}
