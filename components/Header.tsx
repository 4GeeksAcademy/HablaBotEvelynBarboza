import styles from "@/app/page.module.css";

type HeaderProps = {
  title: string;
  subtitle: string;
  modelName: string;
};

export default function Header({ title, subtitle, modelName }: HeaderProps) {
  return (
    <header className={styles.chatHeader}>
      <div className={styles.brandLine}>
        <span className={styles.brandGlyph} aria-hidden="true">
          AI
        </span>
        <div>
          <h1>{title}</h1>
          <p>{subtitle}</p>
        </div>
      </div>
      <p className={styles.modelLabel}>Modelo activo: {modelName}</p>
    </header>
  );
}
