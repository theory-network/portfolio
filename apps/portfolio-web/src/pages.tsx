import { Button } from '@theory/common-shadcn/components/ui/button';
import { Badge } from '@theory/ui';
import styles from './app.module.css';

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
