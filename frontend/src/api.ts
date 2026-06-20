import type { PokemonDetail, PokemonListItem } from "./types";

const BASE = "https://pokeapi.co/api/v2";
const EXCLUDED_TYPES = new Set(["unknown", "shadow"]);

// ponytail: Map sin TTL; suficiente para una sesión de navegador
const _cache = new Map<string, unknown>();

async function _get<T>(url: string): Promise<T> {
  if (_cache.has(url)) return _cache.get(url) as T;
  const resp = await fetch(url);
  if (resp.status === 404) throw new Error("NOT_FOUND");
  if (!resp.ok) throw new Error("UPSTREAM_ERROR");
  const data = await resp.json();
  _cache.set(url, data);
  return data as T;
}

function _idFromUrl(url: string): number {
  return parseInt(url.replace(/\/$/, "").split("/").pop()!);
}

export const fetchPokemonList = async (limit: number, offset: number): Promise<PokemonListItem[]> => {
  const data = await _get<{ results: { name: string; url: string }[] }>(
    `${BASE}/pokemon?limit=${limit}&offset=${offset}`
  );
  return data.results.map((p) => {
    const id = _idFromUrl(p.url);
    return { id, name: p.name, sprite: spriteUrl(id), types: [] };
  });
};

export const fetchPokemon = async (idOrName: string | number): Promise<PokemonDetail> => {
  const data = await _get<Record<string, unknown>>(`${BASE}/pokemon/${idOrName}`);
  const animated =
    (data.sprites as Record<string, unknown> | null)
    && ((data.sprites as Record<string, Record<string, Record<string, Record<string, Record<string, string | null>>>>>)
      ?.versions?.["generation-v"]?.["black-white"]?.animated?.front_default ?? null);
  return {
    id: data.id as number,
    name: data.name as string,
    height: data.height as number,
    weight: data.weight as number,
    types: (data.types as { type: { name: string } }[]).map((t) => t.type.name),
    abilities: (data.abilities as { ability: { name: string } }[]).map((a) => a.ability.name),
    stats: Object.fromEntries(
      (data.stats as { stat: { name: string }; base_stat: number }[]).map((s) => [s.stat.name, s.base_stat])
    ) as PokemonDetail["stats"],
    sprites: {
      default: (data.sprites as Record<string, string | null>).front_default as string,
      shiny: (data.sprites as Record<string, string | null>).front_shiny as string,
      animated: animated || null,
    },
    cry: ((data.cries as Record<string, string | null> | undefined)?.latest) ?? null,
  };
};

export const fetchPokemonIndex = async (): Promise<{ id: number; name: string }[]> => {
  const data = await _get<{ results: { name: string; url: string }[] }>(
    `${BASE}/pokemon?limit=20000&offset=0`
  );
  return data.results.map((p) => ({ id: _idFromUrl(p.url), name: p.name }));
};

export const fetchTypes = async (): Promise<string[]> => {
  const data = await _get<{ results: { name: string }[] }>(`${BASE}/type`);
  return data.results.map((t) => t.name).filter((n) => !EXCLUDED_TYPES.has(n));
};

export const fetchTypePokemons = async (type: string): Promise<number[]> => {
  const data = await _get<{ pokemon: { pokemon: { url: string } }[] }>(`${BASE}/type/${type}`);
  return data.pokemon.map((p) => _idFromUrl(p.pokemon.url)).sort((a, b) => a - b);
};

export const spriteUrl = (id: number) =>
  `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${id}.png`;

export const filterSuggestions = (index: { id: number; name: string }[], query: string) =>
  index.filter((p) => p.name.includes(query.toLowerCase())).slice(0, 8);
