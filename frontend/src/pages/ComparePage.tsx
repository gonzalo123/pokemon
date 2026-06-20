import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { fetchPokemon, fetchPokemonIndex, filterSuggestions } from "../api";
import type { PokemonDetail } from "../types";
import { TYPE_COLORS } from "../theme";
import { StatRadarCompare } from "../components/StatRadar";
import SearchBar from "../components/SearchBar";
import TypeBadge from "../components/TypeBadge";
import SuggestionDropdown from "../components/SuggestionDropdown";
import BattleArena from "../components/BattleArena";

const STAT_KEYS = ["hp", "attack", "defense", "special-attack", "special-defense", "speed"] as const;
const STAT_LABELS: Record<string, string> = {
  hp: "HP", attack: "Ataque", defense: "Defensa",
  "special-attack": "SpAtaque", "special-defense": "SpDefensa", speed: "Velocidad",
};

async function loadPokemon(
  q: string,
  set: (p: PokemonDetail | null) => void,
  setLoading: (v: boolean) => void,
  setError: (e: string) => void,
) {
  if (!q.trim()) return;
  setLoading(true);
  setError("");
  try {
    set(await fetchPokemon(q.trim().toLowerCase()));
  } catch {
    set(null);
    setError(`No se encontró: ${q}`);
  } finally {
    setLoading(false);
  }
}

function PokemonSlot({
  pokemon, query, error, onQueryChange, onLoad, loading, index: pokemonIndex,
}: {
  pokemon: PokemonDetail | null;
  query: string;
  error: string;
  onQueryChange: (v: string) => void;
  onLoad: (q?: string) => void;
  loading: boolean;
  index: { id: number; name: string }[];
}) {
  const [showDropdown, setShowDropdown] = useState(false);
  const [activeIdx, setActiveIdx] = useState(-1);
  const suggestions = filterSuggestions(pokemonIndex, query);
  const color = pokemon ? (TYPE_COLORS[pokemon.types[0]] ?? TYPE_COLORS.default) : "#aaa";

  const resolve = (q: string) =>
    /^\d+$/.test(q) ? q : (filterSuggestions(pokemonIndex, q)[0]?.name ?? q);

  const select = (id: number) => {
    const name = pokemonIndex.find(p => p.id === id)?.name ?? String(id);
    onQueryChange(name);
    setShowDropdown(false);
    setActiveIdx(-1);
    onLoad(name);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showDropdown || suggestions.length === 0) return;
    if (e.key === "ArrowDown") { e.preventDefault(); setActiveIdx(i => Math.min(i + 1, suggestions.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActiveIdx(i => Math.max(i - 1, -1)); }
    else if (e.key === "Enter" && activeIdx >= 0) { e.preventDefault(); select(suggestions[activeIdx].id); return; }
    else if (e.key === "Escape") setShowDropdown(false);
  };

  return (
    <div style={{
      flex: 1,
      textAlign: "center",
      padding: 16,
      background: `${color}18`,
      border: "2px solid var(--border)",
      borderRadius: 14,
      boxShadow: "var(--shadow)",
    }}>
      <div style={{ display: "flex", gap: 8, justifyContent: "center", marginBottom: 4, position: "relative" }}>
        <div style={{ position: "relative" }} onKeyDown={handleKeyDown}>
          <SearchBar
            value={query}
            onChange={v => { onQueryChange(v); setActiveIdx(-1); }}
            placeholder="Nombre o id…"
            onSubmit={() => onLoad(resolve(query))}
            onFocus={() => setShowDropdown(true)}
            onBlur={() => setTimeout(() => setShowDropdown(false), 150)}
          />
          <SuggestionDropdown
            index={pokemonIndex}
            query={query}
            show={showDropdown}
            activeIdx={activeIdx}
            onSelect={id => select(id)}
          />
        </div>
        <button
          onClick={() => onLoad(resolve(query))}
          disabled={loading}
          className="btn-accent"
          style={{ background: color }}
        >
          Cargar
        </button>
      </div>
      {error && (
        <p style={{ color: "red", fontSize: "0.85rem", margin: "4px 0 8px" }}>{error}</p>
      )}
      {loading && <div className="spinner" style={{ margin: "12px auto" }} />}
      {pokemon && (
        <>
          <img
            src={pokemon.sprites.animated ?? pokemon.sprites.default}
            alt={pokemon.name}
            style={{ width: 120, height: 120, imageRendering: "pixelated" }}
          />
          <h3 style={{ textTransform: "capitalize", margin: "8px 0 4px", color: "var(--text)" }}>
            {pokemon.name}
          </h3>
          <div style={{ display: "flex", gap: 6, justifyContent: "center", flexWrap: "wrap" }}>
            {pokemon.types.map(t => <TypeBadge key={t} type={t} />)}
          </div>
        </>
      )}
    </div>
  );
}

export default function ComparePage() {
  const [searchParams] = useSearchParams();
  const [queryA, setQueryA] = useState(searchParams.get("a") ?? "");
  const [queryB, setQueryB] = useState("");
  const [pokemonA, setPokemonA] = useState<PokemonDetail | null>(null);
  const [pokemonB, setPokemonB] = useState<PokemonDetail | null>(null);
  const [loadingA, setLoadingA] = useState(false);
  const [loadingB, setLoadingB] = useState(false);
  const [errorA, setErrorA] = useState("");
  const [errorB, setErrorB] = useState("");
  const [pokemonIndex, setPokemonIndex] = useState<{ id: number; name: string }[]>([]);
  const [battling, setBattling] = useState(false);

  useEffect(() => {
    fetchPokemonIndex().then(setPokemonIndex).catch(() => {});
  }, []);

  const initialA = searchParams.get("a");
  useEffect(() => {
    if (initialA) loadPokemon(initialA, setPokemonA, setLoadingA, setErrorA);
  }, [initialA]);

  const compareData = pokemonA && pokemonB
    ? STAT_KEYS.map(k => ({ stat: STAT_LABELS[k], a: pokemonA.stats[k], b: pokemonB.stats[k] }))
    : null;

  const colorA = pokemonA ? (TYPE_COLORS[pokemonA.types[0]] ?? TYPE_COLORS.default) : "#6890F0";
  const colorB = pokemonB ? (TYPE_COLORS[pokemonB.types[0]] ?? TYPE_COLORS.default) : "#F08030";

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: "24px 16px" }}>
      <h1 style={{ textAlign: "center", marginBottom: 24, color: "var(--text)", fontSize: "2.5rem", fontWeight: 900 }}>
        Comparador
      </h1>

      <div style={{ display: "flex", gap: 16, marginBottom: 32, flexWrap: "wrap" }}>
        <PokemonSlot
          pokemon={pokemonA} query={queryA} error={errorA}
          onQueryChange={setQueryA}
          onLoad={(q) => loadPokemon(q ?? queryA, setPokemonA, setLoadingA, setErrorA)}
          loading={loadingA}
          index={pokemonIndex}
        />
        <PokemonSlot
          pokemon={pokemonB} query={queryB} error={errorB}
          onQueryChange={setQueryB}
          onLoad={(q) => loadPokemon(q ?? queryB, setPokemonB, setLoadingB, setErrorB)}
          loading={loadingB}
          index={pokemonIndex}
        />
      </div>

      {pokemonA && pokemonB && (
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <button className="btn-fight" onClick={() => setBattling(true)}>
            ⚔ FIGHT!
          </button>
        </div>
      )}

      {battling && pokemonA && pokemonB && (
        <BattleArena a={pokemonA} b={pokemonB} onClose={() => setBattling(false)} />
      )}

      {compareData && (
        <>
          <StatRadarCompare
            data={compareData}
            colorA={colorA} colorB={colorB}
            nameA={pokemonA!.name} nameB={pokemonB!.name}
          />

          <table className="compare-table">
            <thead>
              <tr>
                <th style={{ textAlign: "left" }}>Stat</th>
                <th style={{ textAlign: "center", color: colorA, textTransform: "capitalize" }}>
                  {pokemonA!.name}
                </th>
                <th style={{ textAlign: "center", color: colorB, textTransform: "capitalize" }}>
                  {pokemonB!.name}
                </th>
              </tr>
            </thead>
            <tbody>
              {STAT_KEYS.map(k => {
                const va = pokemonA!.stats[k];
                const vb = pokemonB!.stats[k];
                return (
                  <tr key={k}>
                    <td>{STAT_LABELS[k]}</td>
                    <td style={{ textAlign: "center", fontWeight: va >= vb ? 800 : 400, color: va > vb ? colorA : "var(--text)" }}>{va}</td>
                    <td style={{ textAlign: "center", fontWeight: vb >= va ? 800 : 400, color: vb > va ? colorB : "var(--text)" }}>{vb}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </>
      )}

      <div style={{ textAlign: "center", marginTop: 24 }}>
        <button
          onClick={() => {
            setPokemonA(null); setPokemonB(null);
            setQueryA(""); setQueryB("");
            setErrorA(""); setErrorB("");
          }}
          className="btn-brutal"
        >
          Limpiar
        </button>
      </div>
    </div>
  );
}
