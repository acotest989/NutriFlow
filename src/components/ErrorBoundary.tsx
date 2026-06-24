import React from "react";
import { AlertTriangle, RotateCcw } from "lucide-react";

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  message: string;
}

// Catches render-time errors anywhere below it so the app degrades gracefully
// instead of white-screening.
export default class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, message: "" };
  }

  static getDerivedStateFromError(error: unknown): State {
    return { hasError: true, message: error instanceof Error ? error.message : "Unexpected error" };
  }

  componentDidCatch(error: unknown, info: unknown) {
    console.error("Uncaught render error:", error, info);
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="min-h-screen bg-[#0B0E14] flex items-center justify-center p-6 antialiased">
        <div className="w-full max-w-sm bg-[#141923] border border-white/5 rounded-[24px] p-6 text-center shadow-xl">
          <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 mx-auto mb-4">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <h2 className="font-sans font-bold text-white text-lg">Something went wrong</h2>
          <p className="text-xs text-[#94A3B8] font-sans mt-2 leading-relaxed">
            The app hit an unexpected error. Reloading usually fixes it.
          </p>
          {this.state.message && (
            <p className="text-[10px] font-mono text-[#64748B] mt-3 bg-[#0B0E14] border border-white/5 rounded-xl p-2 break-words">
              {this.state.message}
            </p>
          )}
          <button
            onClick={() => window.location.reload()}
            className="mt-5 w-full bg-[#6366F1] hover:bg-[#818CF8] text-white rounded-xl py-2.5 text-sm font-bold transition-colors flex items-center justify-center gap-2"
          >
            <RotateCcw className="w-4 h-4" /> Reload App
          </button>
        </div>
      </div>
    );
  }
}
