import React from 'react';

export class AppErrorBoundary extends React.Component {
  state = { error: null };

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('Unexpected application error:', error, info);
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <div className="min-h-screen bg-neo-bg flex items-center justify-center p-6">
        <div className="brutal-card bg-white max-w-lg w-full p-8">
          <p className="text-xs font-mono font-black uppercase mb-2">Application error</p>
          <h1 className="text-2xl font-black uppercase mb-3">The screen crashed</h1>
          <p className="text-sm mb-5">
            Your saved data is still on the server. Reload the dashboard and try again.
          </p>
          <button
            type="button"
            onClick={this.handleReload}
            className="brutal-btn bg-neo-yellow px-4 py-2 font-black uppercase"
          >
            Reload dashboard
          </button>
        </div>
      </div>
    );
  }
}
