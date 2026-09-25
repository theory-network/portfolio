import { Component, type ReactNode, Suspense } from 'react';
import styles from './app.module.css';

// Catches the lazy() rejection that fires when a provider's remoteEntry.js can't
// be fetched (provider not running, network error, version skew). Without it a
// single missing provider unmounts the whole site. React has no functional
// error boundary, so this stays a class.
export class ProviderBoundary extends Component<
  { children: ReactNode; name: string },
  { error: Error | null }
> {
  state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  render() {
    if (this.state.error) {
      return (
        <div role="alert" className={styles.boundaryError}>
          <strong>Provider &quot;{this.props.name}&quot; unavailable.</strong>
          <p>{this.state.error.message}</p>
          <p className={styles.boundaryHint}>
            Start it with <code>nx dev {this.props.name}</code>.
          </p>
        </div>
      );
    }
    return (
      <Suspense
        fallback={
          <div className={styles.boundaryLoading}>
            Loading {this.props.name}…
          </div>
        }
      >
        {this.props.children}
      </Suspense>
    );
  }
}

export default ProviderBoundary;
