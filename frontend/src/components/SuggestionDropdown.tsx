import { useId } from "react";
import { spriteUrl } from "../api";

interface Props {
  index: { id: number; name: string }[];
  query: string;
  show: boolean;
  activeIdx: number;
  onSelect: (id: number) => void;
  listboxId?: string;
}

export default function SuggestionDropdown({ index, query, show, activeIdx, onSelect, listboxId }: Props) {
  const autoId = useId();
  const id = listboxId ?? autoId;

  if (!show || !query) return null;

  const suggestions = index
    .filter(p => p.name.includes(query.toLowerCase()))
    .slice(0, 8);

  if (suggestions.length === 0) return null;

  return (
    <div className="search-dropdown" role="listbox" id={id}>
      {suggestions.map((s, i) => (
        <div
          key={s.id}
          className={`search-dropdown-item${i === activeIdx ? " active" : ""}`}
          role="option"
          aria-selected={i === activeIdx}
          onMouseDown={() => onSelect(s.id)}
        >
          <img
            src={spriteUrl(s.id)}
            alt={s.name}
            width={32}
            height={32}
            style={{ imageRendering: "pixelated" }}
          />
          <span className="dd-id">#{String(s.id).padStart(3, "0")}</span>
          <span className="dd-name">{s.name}</span>
        </div>
      ))}
    </div>
  );
}

