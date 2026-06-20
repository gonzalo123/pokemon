export interface PokemonListItem {
  id: number;
  name: string;
  sprite: string;
  types: string[];
}

export interface PokemonDetail {
  id: number;
  name: string;
  height: number;
  weight: number;
  types: string[];
  abilities: string[];
  stats: {
    hp: number;
    attack: number;
    defense: number;
    "special-attack": number;
    "special-defense": number;
    speed: number;
  };
  sprites: {
    default: string;
    shiny: string;
    animated: string | null;
  };
  cry: string | null;
}
