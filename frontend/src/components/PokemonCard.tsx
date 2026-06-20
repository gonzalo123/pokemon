import { useRef } from "react";
import { motion } from "framer-motion";
import type { PokemonListItem } from "../types";
import TypeBadge from "./TypeBadge";

interface Props {
  pokemon: PokemonListItem;
  index: number;
  onClick: () => void;
}

export default function PokemonCard({ pokemon, index, onClick }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const idStr = `#${String(pokemon.id).padStart(3, "0")}`;

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;   // 0..1
    const y = (e.clientY - rect.top)  / rect.height;  // 0..1
    const rotY = (x - 0.5) * 22;
    const rotX = (0.5 - y) * 16;
    el.style.setProperty("--rotx", `${rotX}deg`);
    el.style.setProperty("--roty", `${rotY}deg`);
    el.style.setProperty("--mx", `${x * 100}%`);
    el.style.setProperty("--my", `${y * 100}%`);
    el.style.transform = `perspective(600px) rotateX(${rotX}deg) rotateY(${rotY}deg) scale(1.05)`;
  };

  const handleMouseLeave = () => {
    const el = ref.current;
    if (!el) return;
    el.style.transform = "";
    el.style.setProperty("--mx", "50%");
    el.style.setProperty("--my", "50%");
  };

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.03, duration: 0.25 }}
      className="poke-card"
      role="button"
      tabIndex={0}
      aria-label={`${pokemon.name}, número ${idStr}`}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onClick={onClick}
      onKeyDown={(e: React.KeyboardEvent) => (e.key === "Enter" || e.key === " ") && onClick()}
    >
      <img
        src={pokemon.sprite}
        alt={pokemon.name}
        width={96}
        height={96}
        style={{ imageRendering: "pixelated" }}
        loading="lazy"
      />
      <div className="card-id">{idStr}</div>
      <div className="card-name">{pokemon.name}</div>
      <div className="card-types">
        {pokemon.types.map(t => <TypeBadge key={t} type={t} />)}
      </div>
    </motion.div>
  );
}
