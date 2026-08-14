import { Component, type ErrorInfo, type ReactNode } from 'react';

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
        <div className="p-8 m-4 bg-red-50 border border-red-200 rounded-xl text-red-900 overflow-auto">
          <h2 className="text-xl font-bold mb-4">Something went wrong.</h2>
          <pre className="text-xs whitespace-pre-wrap font-mono">
            {this.state.error?.toString()}
            {'\n'}
            {this.state.error?.stack}
          </pre>
          <button 
            onClick={() => window.location.href = '/'}
            className="mt-6 bg-red-600 text-white px-4 py-2 rounded font-bold hover:bg-red-700"
          >
            Go Home
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
