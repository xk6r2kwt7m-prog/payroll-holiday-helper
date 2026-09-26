import { Component, type ReactNode } from 'react';

/** Last-resort recovery for render errors. Never display exception details or
 * automatically reload: they can contain private data or discard an edit. */
export class AppErrorBoundary extends Component<{children: ReactNode}, {failed: boolean}> {
  state = {failed: false};
  static getDerivedStateFromError() { return {failed: true}; }
  render() {
    if (!this.state.failed) return this.props.children;
    return <main className="min-h-screen flex items-center justify-center p-6">
      <section role="alert" className="max-w-md space-y-4">
        <h1 className="text-xl font-semibold">We couldn’t display the app</h1>
        <p>Your last action may not have finished. Check the saved record before repeating a payment or sending a message.</p>
        <p className="text-sm text-muted-foreground">Reloading may discard unsaved changes. If this happens again, tell your administrator which screen you were using.</p>
        <button className="rounded-md bg-primary text-primary-foreground px-4 py-2" onClick={() => window.location.reload()}>Reload app</button>
      </section>
    </main>;
  }
}
