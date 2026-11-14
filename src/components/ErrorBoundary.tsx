import React, { Component, type ErrorInfo, type ReactNode } from 'react';
import { clearCorruptAppStorage } from '../lib/safeStorage';

interface SectionErrorBoundaryProps {
  children: ReactNode;
  sectionName?: string;
  mode?: 'silent' | 'card';
  onReset?: () => void;
}

interface SectionErrorBoundaryState {
  hasError: boolean;
}

/**
 * Isolates rendering failures inside individual sections or lazy views so one
 * component error cannot take down the entire website.
 */
export class SectionErrorBoundary extends Component<
  SectionErrorBoundaryProps,
  SectionErrorBoundaryState
> {
  state: SectionErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): SectionErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(`Section render failure (${this.props.sectionName || 'section'}):`, error, info.componentStack);
  }

  private handleRetry = () => {
    clearCorruptAppStorage();
    this.setState({ hasError: false });
    this.props.onReset?.();
  };

  private handleReload = () => {
    clearCorruptAppStorage();
    try {
      const url = new URL(window.location.href);
      url.searchParams.set('rd27_reload', String(Date.now()));
      window.location.replace(url.toString());
    } catch {
      window.location.reload();
    }
  };

  render() {
    if (this.state.hasError) {
      if (this.props.mode === 'silent') {
        return null;
      }

      return (
        <section
          role="alert"
          className="mx-auto my-8 w-full max-w-lg rounded-3xl border border-slate-200 bg-white/90 p-6 text-center shadow-lg backdrop-blur-xl"
        >
          <h2 className="text-lg font-extrabold text-slate-900">
            {this.props.sectionName ? `${this.props.sectionName} could not be loaded` : 'This section could not be loaded'}
          </h2>
          <p className="mt-2 text-xs sm:text-sm leading-relaxed text-slate-600">
            A temporary browser or network issue interrupted this view. You can retry without losing the rest of the portal.
          </p>
          <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={this.handleRetry}
              className="rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-indigo-700 cursor-pointer"
            >
              Try Again
            </button>
            <button
              type="button"
              onClick={this.handleReload}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer"
            >
              Reload Page
            </button>
          </div>
        </section>
      );
    }

    return this.props.children;
  }
}
