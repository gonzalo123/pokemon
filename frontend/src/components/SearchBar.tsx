interface Props {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  onSubmit?: () => void;
  onFocus?: () => void;
  onBlur?: () => void;
  role?: string;
  "aria-autocomplete"?: "none" | "inline" | "list" | "both";
  "aria-controls"?: string;
  "aria-expanded"?: boolean;
}

export default function SearchBar({
  value, onChange, placeholder, onSubmit, onFocus, onBlur,
  role, "aria-autocomplete": ariaAutocomplete, "aria-controls": ariaControls, "aria-expanded": ariaExpanded,
}: Props) {
  return (
    <input
      type="text"
      value={value}
      placeholder={placeholder ?? "Buscar…"}
      onChange={e => onChange(e.target.value)}
      onKeyDown={e => e.key === "Enter" && onSubmit?.()}
      onFocus={onFocus}
      onBlur={onBlur}
      className="input-brutal"
      role={role}
      aria-autocomplete={ariaAutocomplete}
      aria-controls={ariaControls}
      aria-expanded={ariaExpanded}
    />
  );
}
