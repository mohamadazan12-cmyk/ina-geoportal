import { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
  fallbackMessage?: string;
  fallback?: ReactNode;
  silent?: boolean;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  private handleGoHome = () => {
    this.setState({ hasError: false, error: null });
    window.location.href = '/';
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.silent) {
        return this.props.fallback ?? null;
      }
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="w-full min-h-[320px] flex-1 flex flex-col items-center justify-center p-6 text-center select-none">
          <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mb-4 shadow-sm border border-amber-200">
            <AlertTriangle className="w-7 h-7" />
          </div>
          <h2 className="text-lg font-bold text-slate-900 mb-1">
            {this.props.fallbackTitle || 'Terjadi Kendala Tampilan'}
          </h2>
          <p className="text-xs text-slate-500 max-w-sm mb-6 leading-relaxed">
            {this.props.fallbackMessage ||
              'Komponen ini mengalami kendala sementara saat memproses data. Anda dapat mencoba memuat ulang tampilan.'}
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={this.handleReset}
              className="px-4 py-2 bg-[#1A3BAF] hover:bg-[#153096] text-white text-xs font-semibold rounded-lg shadow-sm flex items-center gap-1.5 transition-colors active:scale-95"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Muat Ulang Halaman</span>
            </button>
            <button
              onClick={this.handleGoHome}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg shadow-sm flex items-center gap-1.5 transition-colors active:scale-95 border border-slate-200"
            >
              <Home className="w-3.5 h-3.5" />
              <span>Ke Beranda</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
