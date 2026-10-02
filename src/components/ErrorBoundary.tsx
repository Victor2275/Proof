import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Button } from './ui';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="m-4 overflow-auto rounded-panel border border-fault bg-panel p-8 text-ink" role="alert">
          <h2 className="font-faceplate mb-4 text-xl">Something went wrong.</h2>
          <pre className="whitespace-pre-wrap font-mono text-xs text-ink-muted">
            {this.state.error?.toString()}
            {'\n'}
            {this.state.error?.stack}
          </pre>
          <Button variant="secondary" className="mt-6" onClick={() => { window.location.href = '/'; }}>
            Go Home
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}
