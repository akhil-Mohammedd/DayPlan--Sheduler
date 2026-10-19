import { Component, type ErrorInfo, type ReactNode } from 'react';
import { WarningOctagon } from '@phosphor-icons/react';
import { Button } from './ui';
import { StatusPage } from './system/StatusPage';

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('Render error:', error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <StatusPage
          code="500"
          icon={<WarningOctagon size={20} weight="bold" />}
          title="Something went wrong"
          description="This page hit an unexpected error. Your tasks, habits and notes stay in IndexedDB and were not changed. Reload to continue."
          detail={this.state.error.message}
          actions={
            <>
              <Button onClick={() => window.location.reload()}>Reload app</Button>
              <Button
                variant="outline"
                onClick={() => this.setState({ error: null })}
              >
                Try again
              </Button>
            </>
          }
        />
      );
    }
    return this.props.children;
  }
}
