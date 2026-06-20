import {
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import type { PokemonDetail } from "../types";

const STAT_LABELS: Record<string, string> = {
  hp: "HP",
  attack: "Atk",
  defense: "Def",
  "special-attack": "SpAtk",
  "special-defense": "SpDef",
  speed: "Spd",
};

interface SingleProps {
  stats: PokemonDetail["stats"];
  color: string;
}

export function StatRadar({ stats, color }: SingleProps) {
  const data = Object.entries(stats).map(([key, value]) => ({
    stat: STAT_LABELS[key] ?? key,
    value,
  }));

  return (
    <ResponsiveContainer width="100%" height={260}>
      <RadarChart data={data}>
        <PolarGrid />
        <PolarAngleAxis dataKey="stat" tick={{ fontSize: 12 }} />
        <Radar dataKey="value" stroke={color} fill={color} fillOpacity={0.3} dot />
        <Tooltip />
      </RadarChart>
    </ResponsiveContainer>
  );
}

interface CompareData {
  stat: string;
  a: number;
  b: number;
}

interface CompareProps {
  data: CompareData[];
  colorA: string;
  colorB: string;
  nameA: string;
  nameB: string;
}

export function StatRadarCompare({ data, colorA, colorB, nameA, nameB }: CompareProps) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <RadarChart data={data}>
        <PolarGrid />
        <PolarAngleAxis dataKey="stat" tick={{ fontSize: 12 }} />
        <Radar name={nameA} dataKey="a" stroke={colorA} fill={colorA} fillOpacity={0.25} />
        <Radar name={nameB} dataKey="b" stroke={colorB} fill={colorB} fillOpacity={0.25} />
        <Tooltip />
      </RadarChart>
    </ResponsiveContainer>
  );
}
