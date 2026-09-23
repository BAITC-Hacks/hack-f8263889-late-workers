import { pageTitle } from "@/common/styles";
import { Component, type ErrorInfo, type ReactNode } from "react";

type Props = { children: ReactNode };

type State = { error: Error | null };

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[ErrorBoundary]", error, info.componentStack);
  }

  reset = () => {
    this.setState({ error: null });
  };

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    return (
      <div className="bg-background text-foreground flex min-h-screen items-center">
        <div className="mx-auto w-full max-w-xl px-4 py-16">
          <h1 className={pageTitle}>Something broke.</h1>
          <p className="text-muted-foreground mt-4 text-sm">
            The app hit an unexpected error. Try reloading the page — if it
            happens again, the details below might help you track it down.
          </p>

          <pre className="bg-muted text-muted-foreground mt-6 overflow-auto rounded-md border p-3 font-mono text-xs">
            {error.message}
          </pre>

          {import.meta.env.DEV && error.stack && (
            <details className="mt-3">
              <summary className="text-muted-foreground hover:text-foreground cursor-pointer text-xs font-medium">
                Stack trace
              </summary>
              <pre className="bg-muted text-muted-foreground mt-2 overflow-auto rounded-md border p-3 font-mono text-[11px] leading-relaxed">
                {error.stack}
              </pre>
            </details>
          )}

          <div className="mt-8 flex items-center gap-3">
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex h-10 items-center rounded-md px-4 text-sm font-medium"
            >
              Reload
            </button>
            <button
              type="button"
              onClick={this.reset}
              className="text-muted-foreground hover:text-foreground inline-flex h-10 items-center rounded-md border px-4 text-sm font-medium"
            >
              Try again
            </button>
          </div>
        </div>
      </div>
    );
  }
}
