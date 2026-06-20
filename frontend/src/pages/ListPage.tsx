import { useEffect, useState, useCallback, useId } from "react";
import { useNavigate } from "react-router-dom";
import { fetchPokemonList, fetchTypes, fetchTypePokemons, fetchPokemon, fetchPokemonIndex, filterSuggestions } from "../api";
import type { PokemonListItem } from "../types";
import PokemonCard from "../components/PokemonCard";
import SearchBar from "../components/SearchBar";
import SuggestionDropdown from "../components/SuggestionDropdown";

const PAGE_SIZE = 20;

export default function ListPage() {
  const navigate = useNavigate();
  const listboxId = useId();
  const [items, setItems] = useState<PokemonListItem[]>([]);
  const [offset, setOffset] = useState(0);
  const [query, setQuery] = useState("");
  const [types, setTypes] = useState<string[]>([]);
  const [selectedType, setSelectedType] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [pokemonIndex, setPokemonIndex] = useState<{ id: number; name: string }[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [activeIdx, setActiveIdx] = useState(-1);

  useEffect(() => {
    fetchTypes().then(setTypes).catch(() => {});
    fetchPokemonIndex().then(setPokemonIndex).catch(() => {});
  }, []);

  // paged/type load (no search active)
  useEffect(() => {
    if (query) return;
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError("");
      try {
        if (selectedType) {
          const ids = await fetchTypePokemons(selectedType);
          const slice = ids.slice(offset, offset + PAGE_SIZE);
          const details = await Promise.all(slice.map(id => fetchPokemon(id)));
          if (!cancelled) setItems(details.map(d => ({
            id: d.id, name: d.name, sprite: d.sprites.default, types: d.types,
          })));
        } else {
          const list = await fetchPokemonList(PAGE_SIZE, offset);
          if (!cancelled) setItems(list);
        }
      } catch {
        if (!cancelled) setError("Error cargando Pokémon");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [offset, selectedType, query]);

  const runSearch = useCallback(async (q: string) => {
    if (!q) return;
    setLoading(true);
    setError("");
    try {
      const normalized = q.toLowerCase();
      const matches = pokemonIndex.filter(p => p.name.includes(normalized)).slice(0, PAGE_SIZE);
      const details = await Promise.all(matches.map(p => fetchPokemon(p.id)));
      setItems(details.map(d => ({
        id: d.id, name: d.name, sprite: d.sprites.default, types: d.types,
      })));
    } catch {
      setError("Error buscando Pokémon");
    } finally {
      setLoading(false);
    }
  }, [pokemonIndex]);

  // ponytail: debounce con setTimeout
  useEffect(() => {
    if (!query) return;
    const t = setTimeout(() => runSearch(query), 250);
    return () => clearTimeout(t);
  }, [query, runSearch]);

  const handleQueryChange = (v: string) => {
    setQuery(v);
    setActiveIdx(-1);
    if (!v) setOffset(0);
  };

  const suggestions = filterSuggestions(pokemonIndex, query);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showDropdown || suggestions.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIdx(i => Math.min(i + 1, suggestions.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIdx(i => Math.max(i - 1, -1));
    } else if (e.key === "Enter" && activeIdx >= 0) {
      e.preventDefault();
      navigate(`/pokemon/${suggestions[activeIdx].id}`);
    } else if (e.key === "Escape") {
      setShowDropdown(false);
    }
  };

  const isEmpty = !loading && query && items.length === 0;

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: "24px 16px" }}>
      <h1 style={{ textAlign: "center", marginBottom: 24, color: "var(--text)", fontSize: "2.5rem", fontWeight: 900 }}>
        Pokédex
      </h1>

      <div style={{ display: "flex", gap: 12, justifyContent: "center", marginBottom: 24, flexWrap: "wrap" }}>
        <div style={{ position: "relative" }} onKeyDown={handleKeyDown}>
          <SearchBar
            value={query}
            onChange={handleQueryChange}
            placeholder="Buscar por nombre…"
            onFocus={() => setShowDropdown(true)}
            onBlur={() => setTimeout(() => setShowDropdown(false), 150)}
            aria-autocomplete="list"
            aria-controls={listboxId}
            aria-expanded={showDropdown && suggestions.length > 0}
            role="combobox"
          />
          <SuggestionDropdown
            index={pokemonIndex}
            query={query}
            show={showDropdown}
            activeIdx={activeIdx}
            onSelect={id => navigate(`/pokemon/${id}`)}
            listboxId={listboxId}
          />
        </div>
        <select
          value={selectedType}
          onChange={e => { setSelectedType(e.target.value); setOffset(0); setQuery(""); }}
          className="select-brutal"
        >
          <option value="">Todos los tipos</option>
          {types.map(t => (
            <option key={t} value={t} style={{ textTransform: "capitalize" }}>{t}</option>
          ))}
        </select>
      </div>

      {error && <p style={{ textAlign: "center", color: "red" }}>{error}</p>}

      {isEmpty ? (
        <div className="panel" style={{ textAlign: "center", maxWidth: 400, margin: "60px auto", padding: 32 }}>
          <p style={{ fontSize: "2rem", margin: 0 }}>🔍</p>
          <p style={{ fontWeight: 700, color: "var(--text)", marginTop: 8 }}>
            Ningún Pokémon coincide con «{query}»
          </p>
        </div>
      ) : loading ? (
        <div style={{ textAlign: "center", padding: 40 }}>
          <div className="spinner" />
        </div>
      ) : (
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
          gap: 18,
        }}>
          {items.map((p, i) => (
            <PokemonCard
              key={p.id}
              pokemon={p}
              index={i}
              onClick={() => navigate(`/pokemon/${p.id}`)}
            />
          ))}
        </div>
      )}

      {!query && (
        <div style={{ display: "flex", justifyContent: "center", gap: 12, marginTop: 32 }}>
          <button
            disabled={offset === 0}
            onClick={() => setOffset(o => Math.max(0, o - PAGE_SIZE))}
            className="btn-brutal"
          >
            ← Anterior
          </button>
          <button
            onClick={() => setOffset(o => o + PAGE_SIZE)}
            className="btn-brutal"
          >
            Siguiente →
          </button>
        </div>
      )}
    </div>
  );
}
