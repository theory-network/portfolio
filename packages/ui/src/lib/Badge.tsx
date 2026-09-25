import styles from './Badge.module.css';

export interface BadgeProps {
  label: string;
  count?: number;
}

export function Badge({ label, count }: BadgeProps) {
  return (
    <span className={styles.badge}>
      {label}
      {count !== undefined && <span className={styles.count}>{count}</span>}
    </span>
  );
}

export default Badge;
