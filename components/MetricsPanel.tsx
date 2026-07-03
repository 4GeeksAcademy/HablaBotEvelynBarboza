import styles from "@/app/page.module.css";
import Button from "@/components/Button";

export type MetricItem = {
  label: string;
  value: string;
};

type MetricsPanelProps = {
  title: string;
  items: MetricItem[];
  clearLabel: string;
  onClearHistory: () => void;
  disabled?: boolean;
};

export default function MetricsPanel({
  title,
  items,
  clearLabel,
  onClearHistory,
  disabled,
}: MetricsPanelProps) {
  return (
    <aside className={styles.metricsColumn}>
      <h2>{title}</h2>

      <div className={styles.metricsList}>
        {items.map((item) => (
          <div className={styles.metricCard} key={item.label}>
            <span>{item.label}</span>
            <strong>{item.value}</strong>
          </div>
        ))}
      </div>

      <Button
        className={styles.clearButton}
        label={clearLabel}
        onClick={onClearHistory}
        disabled={disabled}
      />
    </aside>
  );
}
