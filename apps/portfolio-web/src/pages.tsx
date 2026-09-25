import { Button } from '@theory/common-shadcn/components/ui/button';
import { Badge } from '@theory/ui';
import styles from './app.module.css';
import { ClientOnly } from './ClientOnly';
import { lazyProvider } from './mf';
import { ProviderBoundary } from './ProviderBoundary';
import { Seo } from './Seo';

// Placeholder home page. The real Home copy and graphic are Linear issues 4.2
// and 4.3.
export function HomePage() {
  return (
    <div className={styles.home}>
      <Seo
        title="Theory Network"
        description="Theory Network LLC: freelance code modernization and AI integration, and the products behind it."
      />
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
// through Module Federation. The host owns the title, meta tags and summary, so
// they are prerendered; the remote itself only mounts in the browser
// (ClientOnly). If it can't be fetched, the boundary shows a fallback and the
// rest of the site keeps working.
export function FireflyRoutePage() {
  return (
    <>
      <Seo
        title="Firefly | Theory Network"
        description="Firefly: a local events and activities discovery app, built over a decade of framework migrations."
      />
      <h1>Firefly</h1>
      <p>
        Firefly helps people discover local events and activities. It was built
        over more than a decade, through several framework migrations.
      </p>
      <ClientOnly
        fallback={<div className={styles.boundaryLoading}>Loading…</div>}
      >
        <ProviderBoundary name="portfolio-firefly">
          <RemoteFirefly />
        </ProviderBoundary>
      </ClientOnly>
    </>
  );
}
