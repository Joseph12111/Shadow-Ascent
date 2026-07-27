import React from 'react';
import Button from './Button.jsx';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      errorId: '',
    };
    this.handleReload = this.handleReload.bind(this);
    this.handleReset = this.handleReset.bind(this);
  }

  static getDerivedStateFromError() {
    return {
      hasError: true,
      errorId: `err-${Date.now()}`,
    };
  }

  componentDidCatch() {
    return;
  }

  handleReload() {
    try {
      globalThis?.location?.reload?.();
    } catch {
      return;
    }
  }

  handleReset() {
    this.setState({
      hasError: false,
      errorId: '',
    });
  }

  render() {
    if (!this.state?.hasError) {
      return this.props?.children;
    }

    return (
      <main className="relative flex min-h-screen items-center justify-center px-5 py-10">
        <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_top_left,rgba(139,92,246,0.24),transparent_34%),radial-gradient(circle_at_78%_8%,rgba(240,192,64,0.16),transparent_30%),linear-gradient(180deg,rgba(10,10,15,0),#0a0a0f_72%)]" />
        <section className="glass-card relative z-10 w-full max-w-2xl p-7 sm:p-9">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-shadow-purpleLight">Error Boundary</p>
          <h1 className="mt-3 font-heading text-3xl font-bold text-shadow-gold sm:text-4xl">Shadow Veil Triggered</h1>
          <p className="mt-4 text-sm leading-7 text-shadow-textSecondary">
            The interface hit an unexpected issue. Your local progress remains stored. Reload to restore the active ascent.
          </p>
          <p className="mt-4 text-xs uppercase tracking-[0.18em] text-shadow-textMuted">Reference: {this.state?.errorId || 'unknown'}</p>
          <div className="mt-7 grid gap-3 sm:grid-cols-2">
            <Button onClick={this.handleReload}>Reload App</Button>
            <Button onClick={this.handleReset} variant="secondary">
              Retry View
            </Button>
          </div>
        </section>
      </main>
    );
  }
}
