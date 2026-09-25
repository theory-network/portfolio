import { Button } from '@theory/common-shadcn/components/ui/button';
import { Badge } from '@theory/ui';
import styles from './app.module.css';
import { lazyProvider } from './mf';
import { ProviderBoundary } from './ProviderBoundary';

// Placeholder home page. The real Home copy and graphic are Linear issues 4.2
// and 4.3.
export function HomePage() {
  return (
    <div className={styles.home}>
      <section className={styles.intro}>
        <Badge label="Theory Network" />
        <h1>Theory Network</h1>
        <p>Site under construction.</p>
        <Button>shadcn Button</Button>
      </section>
    </div>
  );
}

const RemoteFirefly = lazyProvider('portfolio-firefly', 'FireflyPage');

// The Firefly page is a separate app (portfolio-firefly) loaded at runtime
// through Module Federation. If it can't be fetched, the boundary shows a
// fallback and the rest of the site keeps working.
export function FireflyRoutePage() {
  return (
    <ProviderBoundary name="portfolio-firefly">
      <RemoteFirefly />
    </ProviderBoundary>
  );
}
