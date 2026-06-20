import { TYPE_COLORS } from "../theme";

interface Props {
  type: string;
}

export default function TypeBadge({ type }: Props) {
  const color = TYPE_COLORS[type] ?? TYPE_COLORS.default;
  return (
    <span style={{
      backgroundColor: color,
      color: "#fff",
      padding: "2px 8px",
      borderRadius: "12px",
      fontSize: "0.7rem",
      fontWeight: 600,
      textTransform: "capitalize",
      textShadow: "0 1px 2px rgba(0,0,0,0.3)",
      display: "inline-block",
    }}>
      {type}
    </span>
  );
}
