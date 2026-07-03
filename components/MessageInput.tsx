import type { FormEvent } from "react";
import styles from "@/app/page.module.css";
import Button from "@/components/Button";

type MessageInputProps = {
  placeholder: string;
  buttonLabel: string;
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  isLoading: boolean;
};

export default function MessageInput({
  placeholder,
  buttonLabel,
  value,
  onChange,
  onSubmit,
  isLoading,
}: MessageInputProps) {
  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSubmit();
  };

  return (
    <form className={styles.composer} onSubmit={handleSubmit}>
      <input
        type="text"
        placeholder={placeholder}
        aria-label="Entrada de mensaje"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={isLoading}
      />
      <Button label={buttonLabel} type="submit" disabled={isLoading} />
    </form>
  );
}
