import React, { Component, StrictMode, type ErrorInfo, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { clearCorruptAppStorage } from './lib/safeStorage';

// Recover cleanly once when a browser serves stale HTML referencing a deleted Vite chunk after deploy.
if (typeof window !== 'undefined') {
  window.addEventListener('vite:preloadError', (event) => {
    event.preventDefault();
    let alreadyRetried = false;
    try {
      alreadyRetried = window.sessionStorage?.getItem('rd27_preload_reloaded') === '1';
      if (!alreadyRetried) {
        window.sessionStorage?.setItem('rd27_preload_reloaded', '1');
      }
    } catch {
      alreadyRetried = window.location.search.includes('rd27_reload=');
    }

    if (!alreadyRetried) {
      try {
        const url = new URL(window.location.href);
        url.searchParams.set('rd27_reload', String(Date.now()));
        window.location.replace(url.toString());
      } catch {
        window.location.reload();
      }
    }
  });
}

type Props = { children: ReactNode };
type State = { hasError: boolean };

class ApplicationErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Application render failure:', error, info.componentStack);
    try {
      clearCorruptAppStorage();
      if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function' && typeof CustomEvent !== 'undefined') {
        window.dispatchEvent(new CustomEvent('rd27:runtime-error', {
          detail: { message: error?.message || 'Unknown rendering error', componentStack: info.componentStack },
        }));
      }
    } catch {
      // Error reporting must never cause another application failure.
    }
  }

  private handleTryAgain = () => {
    clearCorruptAppStorage();
    this.setState({ hasError: false });
  };

  private handleReload = () => {
    clearCorruptAppStorage();
    try {
      window.sessionStorage?.removeItem('rd27_chunk_reloaded');
      window.sessionStorage?.removeItem('rd27_preload_reloaded');
    } catch {
      // Ignore storage access failures.
    }
    try {
      const url = new URL(window.location.href);
      url.searchParams.delete('rd27_chunk_retry');
      url.searchParams.set('rd27_reload', String(Date.now()));
      window.location.replace(url.toString());
    } catch {
      window.location.reload();
    }
  };

  render() {
    if (this.state.hasError) {
      return (
        <main role="alert" className="min-h-screen grid place-items-center bg-[#F8F9FC] px-5 py-12 text-slate-900">
          <section className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-7 text-center shadow-xl">
            <h1 className="text-xl font-extrabold">Page could not be displayed</h1>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              Something interrupted this page. You can retry now or reload for a fresh page response.
            </p>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              <button
                type="button"
                onClick={this.handleTryAgain}
                className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                Try Again
              </button>
              <button
                type="button"
                onClick={this.handleReload}
                className="rounded-xl bg-indigo-600 px-5 py-3 text-sm font-bold text-white hover:bg-indigo-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 cursor-pointer"
              >
                Reload website
              </button>
            </div>
          </section>
        </main>
      );
    }
    return this.props.children;
  }
}

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('Required application root element #root was not found.');

createRoot(rootElement).render(
  <StrictMode>
    <ApplicationErrorBoundary>
      <App />
    </ApplicationErrorBoundary>
  </StrictMode>,
);
