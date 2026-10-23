import { Component, type ErrorInfo, type ReactNode } from 'react';
import { commonMessages } from '../../i18n/id';
import { captureAppError, recordImportantEvent } from '../../lib/observability';
import { ErrorState } from '../ui/ErrorState';

type AppErrorBoundaryProps = {
  children: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
};

type AppErrorBoundaryState = {
  error: Error | null;
  resetKey: number;
};

const messages = commonMessages;

export class AppErrorBoundary extends Component<AppErrorBoundaryProps, AppErrorBoundaryState> {
  state: AppErrorBoundaryState = { error: null, resetKey: 0 };

  static getDerivedStateFromError(error: Error): Partial<AppErrorBoundaryState> {
    return { error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    recordImportantEvent('app.error_boundary', 'failed');
    captureAppError(error);
    this.props.onError?.(error, errorInfo);
  }

  private retry = () => {
    this.setState((state) => ({ error: null, resetKey: state.resetKey + 1 }));
  };

  render() {
    if (this.state.error) {
      return (
        <main className="grid min-h-screen place-items-center bg-bg px-4 py-10 text-text">
          <ErrorState
            className="w-full max-w-lg"
            title={messages.unexpectedErrorTitle}
            description={messages.unexpectedErrorDescription}
            onRetry={this.retry}
            retryLabel={messages.retry}
          />
        </main>
      );
    }

    return <div key={this.state.resetKey} className="contents">{this.props.children}</div>;
  }
}
