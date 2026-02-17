import { Component, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * ErrorBoundary - Catches React component errors and displays fallback UI
 *
 * Features:
 * - Catches errors in child component tree
 * - Displays user-friendly error message
 * - Logs errors to console for debugging
 * - Optional reset functionality
 * - Custom fallback UI support
 *
 * Usage:
 * <ErrorBoundary>
 *   <YourComponent />
 * </ErrorBoundary>
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
    });
  };

  render() {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error UI
      return (
        <div className="min-h-[400px] flex items-center justify-center p-8">
          <div className="max-w-md w-full bg-white border border-red-200 rounded-lg shadow-lg p-6">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Something went wrong
                </h3>
                <p className="text-sm text-gray-600 mb-4">
                  An error occurred while rendering this component. Please try refreshing the page or contact support if the problem persists.
                </p>
                {this.state.error && (
                  <details className="mb-4">
                    <summary className="text-xs text-gray-500 cursor-pointer hover:text-gray-700">
                      Error details
                    </summary>
                    <pre className="mt-2 text-xs text-gray-600 bg-gray-50 p-3 rounded border border-gray-200 overflow-x-auto">
                      {this.state.error.message}
                    </pre>
                  </details>
                )}
                <button
                  onClick={this.handleReset}
                  className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-md transition-colors"
                >
                  <RefreshCw className="w-4 h-4" />
                  Try Again
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
