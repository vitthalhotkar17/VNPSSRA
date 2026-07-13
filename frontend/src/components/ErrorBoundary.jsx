import React from "react";

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null, info: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    this.setState({ error, info });
    // Log full error and stack to console for debugging
    try {
      console.error("ErrorBoundary captured error:", error);
      console.error("Component stack:", info?.componentStack);
    } catch (e) {
      // ignore
    }
  }

  render() {
    if (this.state.error) {
      return (
        <div className="p-6">
          <div className="card p-6 bg-rose-50 border-rose-100">
            <h3 className="font-display font-bold text-lg text-rose-700">Something went wrong</h3>
            <p className="text-sm text-rose-600 mt-2">{this.state.error?.message || "An unexpected error occurred."}</p>
            <div className="mt-4 flex gap-2">
              <button className="btn" onClick={() => window.location.reload()}>Reload</button>
            </div>
            <details className="mt-4 text-xs text-slate-500">
              <summary>Show error details</summary>
              <pre className="whitespace-pre-wrap">{this.state.info?.componentStack}</pre>
            </details>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
