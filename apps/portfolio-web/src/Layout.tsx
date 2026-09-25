import { Link, Outlet } from '@tanstack/react-router';
import styles from './app.module.css';

// Persistent site chrome. <Outlet /> renders the active route. The real nav
// (Home, Portfolio, Services, About) is Linear issue 4.1.
export function Layout() {
  return (
    <div className={styles.app}>
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <Link to="/" className={styles.brand} activeOptions={{ exact: true }}>
            <span className={styles.brandMark}>◆</span> Theory Network
          </Link>
          <nav className={styles.nav}>
            <Link
              to="/"
              className={styles.navLink}
              activeProps={{ className: styles.navLinkActive }}
              activeOptions={{ exact: true }}
            >
              Home
            </Link>
            <Link
              to="/portfolio/firefly"
              className={styles.navLink}
              activeProps={{ className: styles.navLinkActive }}
            >
              Firefly
            </Link>
          </nav>
        </div>
      </header>

      <main className={styles.main}>
        <Outlet />
      </main>
    </div>
  );
}

export default Layout;
