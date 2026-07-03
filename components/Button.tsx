type ButtonProps = {
  label: string;
  className?: string;
  disabled?: boolean;
  type?: "button" | "submit";
  onClick?: () => void;
};

export default function Button({
  label,
  className,
  disabled,
  type = "button",
  onClick,
}: ButtonProps) {
  return (
    <button className={className} type={type} disabled={disabled} onClick={onClick}>
      {label}
    </button>
  );
}
