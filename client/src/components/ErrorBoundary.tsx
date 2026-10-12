import React, { Component, type ReactNode } from 'react';
import WebGLCanvasFallback from './WebGLCanvasFallback';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  fallbackTitle?: string;
  fallbackDescription?: string;
  isWebGL?: boolean;
  onReset?: () => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

/**
 * Resilient React Error Boundary component.
 * 
 * SCOPE & BOUNDARY LIMITATIONS (Documented per Phase 7 requirements):
 * - Catches: Synchronous render errors, lifecycle method errors, and constructor errors
 *   within child component trees.
 * - Does NOT catch: Asynchronous operations (e.g., fetch, unhandled Promise rejections,
 *   setTimeout/setInterval callbacks outside render), event handlers (e.g. onClick),
 *   or background Web Worker execution errors (e.g. Transformers.js worker thread faults).
 */
export default class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    console.error('[ErrorBoundary caught component crash]:', error, errorInfo);
  }

  handleReset = (): void => {
    this.setState({ hasError: false, error: null });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      if (this.props.isWebGL) {
        return (
          <div className="relative w-full h-full min-h-[300px]">
            <WebGLCanvasFallback
              title={this.props.fallbackTitle || '3D Render Unavailable'}
              description={
                this.props.fallbackDescription ||
                'The 3D WebGL context encountered an execution error. Switched safely to 2D view.'
              }
              showBadge
            >
              <button
                type="button"
                onClick={this.handleReset}
                className="mt-4 px-3.5 py-1.5 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer shadow-md"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Retry 3D Render</span>
              </button>
            </WebGLCanvasFallback>
          </div>
        );
      }

      return (
        <div className="p-6 rounded-2xl bg-white/[0.03] border border-rose-500/30 text-neutral-200 text-center flex flex-col items-center justify-center space-y-3 m-4">
          <div className="w-10 h-10 rounded-full bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-400">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">
              {this.props.fallbackTitle || 'Component Error Occurred'}
            </h3>
            <p className="text-xs text-neutral-400 mt-1 max-w-md">
              {this.props.fallbackDescription ||
                'This section encountered an unexpected render issue. Other parts of the application remain fully operational.'}
            </p>
          </div>
          <button
            type="button"
            onClick={this.handleReset}
            className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer border border-white/10"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Reload Component</span>
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
