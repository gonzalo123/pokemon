import type { PokemonDetail } from "./types";

// ponytail: tabla local evita 18 fetches de damage_relations
const TYPE_CHART: Record<string, { double: string[]; half: string[]; zero: string[] }> = {
  normal:   { double: [],                                   half: ["rock","steel"],          zero: ["ghost"] },
  fire:     { double: ["grass","ice","bug","steel"],        half: ["fire","water","rock","dragon"], zero: [] },
  water:    { double: ["fire","ground","rock"],             half: ["water","grass","dragon"], zero: [] },
  electric: { double: ["water","flying"],                   half: ["electric","grass","dragon"], zero: ["ground"] },
  grass:    { double: ["water","ground","rock"],            half: ["fire","grass","poison","flying","bug","dragon","steel"], zero: [] },
  ice:      { double: ["grass","ground","flying","dragon"], half: ["fire","water","ice","steel"], zero: [] },
  fighting: { double: ["normal","ice","rock","dark","steel"], half: ["poison","bug","psychic","flying","fairy"], zero: ["ghost"] },
  poison:   { double: ["grass","fairy"],                    half: ["poison","ground","rock","ghost"], zero: ["steel"] },
  ground:   { double: ["fire","electric","poison","rock","steel"], half: ["grass","bug"],     zero: ["flying"] },
  flying:   { double: ["grass","fighting","bug"],           half: ["electric","rock","steel"], zero: [] },
  psychic:  { double: ["fighting","poison"],                half: ["psychic","steel"],        zero: ["dark"] },
  bug:      { double: ["grass","psychic","dark"],           half: ["fire","fighting","poison","flying","ghost","steel","fairy"], zero: [] },
  rock:     { double: ["fire","ice","flying","bug"],        half: ["fighting","ground","steel"], zero: [] },
  ghost:    { double: ["psychic","ghost"],                  half: ["dark"],                   zero: ["normal"] },
  dragon:   { double: ["dragon"],                           half: ["steel"],                  zero: ["fairy"] },
  dark:     { double: ["psychic","ghost"],                  half: ["fighting","dark","fairy"], zero: [] },
  steel:    { double: ["ice","rock","fairy"],               half: ["fire","water","electric","steel"], zero: [] },
  fairy:    { double: ["fighting","dragon","dark"],         half: ["fire","poison","steel"],   zero: [] },
};

export function typeMultiplier(attackType: string, defenderTypes: string[]): number {
  const chart = TYPE_CHART[attackType];
  if (!chart) return 1;
  return defenderTypes.reduce((mult, defType) => {
    if (chart.zero.includes(defType)) return 0;
    if (chart.double.includes(defType)) return mult * 2;
    if (chart.half.includes(defType)) return mult * 0.5;
    return mult;
  }, 1);
}

export type Effectiveness = "super" | "normal" | "weak" | "immune";

export interface BattleEvent {
  attackerId: number;
  defenderId: number;
  dmg: number;
  mult: number;
  effectiveness: Effectiveness;
  defenderHpAfter: number;
}

export interface BattleResult {
  events: BattleEvent[];
  winnerId: number;
  maxHpA: number;
  maxHpB: number;
}

export function simulateBattle(a: PokemonDetail, b: PokemonDetail): BattleResult {
  const maxHpA = a.stats.hp * 3;
  const maxHpB = b.stats.hp * 3;
  let hpA = maxHpA;
  let hpB = maxHpB;
  const events: BattleEvent[] = [];

  // ponytail: heurístico simple; physical vs special según cuál hace más daño esperado
  function chooseAtk(attacker: PokemonDetail, defender: PokemonDetail) {
    const phys = attacker.stats.attack / defender.stats.defense;
    const spec = attacker.stats["special-attack"] / defender.stats["special-defense"];
    return phys >= spec
      ? { atk: attacker.stats.attack, def: defender.stats.defense }
      : { atk: attacker.stats["special-attack"], def: defender.stats["special-defense"] };
  }

  function calcDmg(attacker: PokemonDetail, defender: PokemonDetail): { dmg: number; mult: number; effectiveness: Effectiveness } {
    const { atk, def } = chooseAtk(attacker, defender);
    const mult = typeMultiplier(attacker.types[0], defender.types);
    const raw = Math.round((atk / def) * mult * 12 * (0.85 + Math.random() * 0.15));
    const dmg = Math.max(mult === 0 ? 0 : 1, raw);
    const effectiveness: Effectiveness =
      mult === 0 ? "immune" : mult >= 2 ? "super" : mult <= 0.5 ? "weak" : "normal";
    return { dmg, mult, effectiveness };
  }

  // Speed decides who goes first; tie → A
  let aTurn = a.stats.speed >= b.stats.speed;

  while (hpA > 0 && hpB > 0) {
    if (aTurn) {
      const { dmg, mult, effectiveness } = calcDmg(a, b);
      hpB = Math.max(0, hpB - dmg);
      events.push({ attackerId: a.id, defenderId: b.id, dmg, mult, effectiveness, defenderHpAfter: hpB });
    } else {
      const { dmg, mult, effectiveness } = calcDmg(b, a);
      hpA = Math.max(0, hpA - dmg);
      events.push({ attackerId: b.id, defenderId: a.id, dmg, mult, effectiveness, defenderHpAfter: hpA });
    }
    aTurn = !aTurn;
  }

  return { events, winnerId: hpA > 0 ? a.id : b.id, maxHpA, maxHpB };
}

// ponytail: self-check básico en dev
if (import.meta.env.DEV) {
  console.assert(typeMultiplier("water", ["fire"]) === 2, "water->fire debe ser x2");
  console.assert(typeMultiplier("fire", ["water"]) === 0.5, "fire->water debe ser x0.5");
  console.assert(typeMultiplier("normal", ["ghost"]) === 0, "normal->ghost debe ser x0");
}
