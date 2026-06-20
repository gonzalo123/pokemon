import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { fetchPokemon } from "../api";
import type { PokemonDetail } from "../types";
import { TYPE_COLORS } from "../theme";
import { StatRadar } from "../components/StatRadar";
import TypeBadge from "../components/TypeBadge";

const SPARKLE_COUNT = 10;

function Sparkles() {
  // useState lazy init: random values generated once per mount, not on every render
  const [sparks] = useState(() =>
    Array.from({ length: SPARKLE_COUNT }, (_, i) => ({
      id: i,
      top:   `${Math.random() * 90}%`,
      left:  `${Math.random() * 90}%`,
      delay: `${Math.random() * 0.4}s`,
    }))
  );
  return (
    <>
      {sparks.map(s => (
        <span
          key={s.id}
          className="sparkle"
          style={{ top: s.top, left: s.left, animationDelay: s.delay }}
        />
      ))}
    </>
  );
}

export default function DetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const numericId = Number(id);
  const [pokemon, setPokemon] = useState<PokemonDetail | null>(null);
  const [shiny, setShiny] = useState(false);
  const [showSparkles, setShowSparkles] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    const run = async () => {
      setLoading(true);
      setShiny(false);
      try {
        const p = await fetchPokemon(id);
        if (cancelled) return;
        setPokemon(p);
        if (p.cry) {
          const audio = new Audio(p.cry);
          audio.volume = 0.35;
          audioRef.current = audio;
          // ponytail: autoplay puede bloquearse por política del navegador; botón es fallback
          audio.play().catch(() => {});
        }
      } catch {
        if (!cancelled) setError("Pokémon no encontrado");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    run();
    return () => { cancelled = true; audioRef.current = null; };
  }, [id]);

  // keyboard ← → for prev/next
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft" && numericId > 1) navigate(`/pokemon/${numericId - 1}`);
      if (e.key === "ArrowRight") navigate(`/pokemon/${numericId + 1}`);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [numericId, navigate]);

  const playCry = () => {
    if (!audioRef.current) return;
    audioRef.current.currentTime = 0;
    audioRef.current.play().catch(() => {});
  };

  const toggleShiny = () => {
    if (!shiny) {
      setShowSparkles(true);
      setTimeout(() => setShowSparkles(false), 900);
    }
    setShiny(s => !s);
  };

  if (loading) return (
    <div style={{ textAlign: "center", padding: 80 }}>
      <div className="spinner" />
    </div>
  );
  if (error || !pokemon) return (
    <div style={{ textAlign: "center", padding: 80, color: "red" }}>{error}</div>
  );

  const primaryType = pokemon.types[0] ?? "default";
  const color = TYPE_COLORS[primaryType] ?? TYPE_COLORS.default;
  const spriteUrl = shiny ? pokemon.sprites.shiny : (pokemon.sprites.animated ?? pokemon.sprites.default);

  return (
    // key={id} ensures framer-motion re-runs the enter animation when navigating between pokémon
    <motion.div
      key={id}
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.25 }}
      style={{
        minHeight: "100vh",
        background: `linear-gradient(135deg, ${color}30 0%, var(--bg) 55%)`,
        padding: "32px 16px",
      }}
    >
      <div style={{ maxWidth: 700, margin: "0 auto" }}>
        <button className="btn-brutal" onClick={() => navigate(-1)} style={{ marginBottom: 16 }}>
          ← Volver
        </button>

        {/* sprite with prev/next arrows */}
        <div style={{ textAlign: "center", position: "relative" }}>
          <div style={{ position: "relative", display: "inline-block" }}>
            {/* ponytail: límite inferior id=1; sin tope superior duro, 404 lo maneja el catch */}
            <button
              className="nav-arrow prev"
              onClick={() => navigate(`/pokemon/${numericId - 1}`)}
              disabled={numericId <= 1}
              aria-label="Pokémon anterior"
            >‹</button>

            <AnimatePresence mode="wait">
              <motion.img
                key={spriteUrl}
                src={spriteUrl}
                alt={pokemon.name}
                initial={{ opacity: 0, scale: 0.8, rotate: -5 }}
                animate={{ opacity: 1, scale: 1, rotate: 0 }}
                exit={{ opacity: 0, scale: 0.7, rotate: 5 }}
                transition={{ duration: 0.25 }}
                style={{ width: 200, height: 200, imageRendering: "pixelated", display: "block" }}
              />
            </AnimatePresence>
            {showSparkles && <Sparkles />}

            <button
              className="nav-arrow next"
              onClick={() => navigate(`/pokemon/${numericId + 1}`)}
              aria-label="Pokémon siguiente"
            >›</button>
          </div>

          <div style={{ marginTop: 12, display: "flex", gap: 8, justifyContent: "center", alignItems: "center" }}>
            <button
              onClick={toggleShiny}
              className="btn-accent"
              style={{ background: shiny ? color : "transparent", color: shiny ? "#fff" : color, borderColor: color }}
            >
              {shiny ? "✦ Normal" : "✨ Shiny"}
            </button>
            {pokemon.cry && (
              <button onClick={playCry} className="btn-brutal" style={{ fontSize: "1.2rem", padding: "6px 12px" }} title="Escuchar grito">
                🔊
              </button>
            )}
          </div>
        </div>

        <div style={{ textAlign: "center", margin: "16px 0" }}>
          <span style={{ color: "var(--text-muted)", fontSize: "0.9rem", fontWeight: 700 }}>
            #{String(pokemon.id).padStart(3, "0")}
          </span>
          <h2 style={{ margin: "4px 0", textTransform: "capitalize", fontSize: "2.2rem", color: "var(--text)" }}>
            {pokemon.name}
          </h2>
          <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" }}>
            {pokemon.types.map(t => <TypeBadge key={t} type={t} />)}
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginTop: 24 }}>
          <div className="panel">
            <h3 style={{ marginTop: 0, color: "var(--text)" }}>Stats</h3>
            <StatRadar stats={pokemon.stats} color={color} />
          </div>

          <div className="panel">
            <h3 style={{ marginTop: 0, color: "var(--text)" }}>Info</h3>
            <p style={{ color: "var(--text)" }}><strong>Altura:</strong> {(pokemon.height / 10).toFixed(1)} m</p>
            <p style={{ color: "var(--text)" }}><strong>Peso:</strong> {(pokemon.weight / 10).toFixed(1)} kg</p>
            <p style={{ color: "var(--text)" }}><strong>Habilidades:</strong></p>
            <ul style={{ paddingLeft: 18, color: "var(--text)" }}>
              {pokemon.abilities.map(a => (
                <li key={a} style={{ textTransform: "capitalize" }}>{a}</li>
              ))}
            </ul>
          </div>
        </div>

        <div style={{ textAlign: "center", marginTop: 32 }}>
          <button
            onClick={() => navigate(`/compare?a=${pokemon.id}`)}
            className="btn-accent"
            style={{ background: color, fontSize: "1rem", padding: "10px 28px" }}
          >
            ⚔ Comparar
          </button>
        </div>
      </div>
    </motion.div>
  );
}
