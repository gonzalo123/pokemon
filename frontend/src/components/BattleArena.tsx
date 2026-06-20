import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { PokemonDetail } from "../types";
import { TYPE_COLORS } from "../theme";
import { simulateBattle, type BattleEvent } from "../battle";

// ponytail: constantes de timing para tunear el ritmo arcade
const INTRO_MS      = 900;
const FIGHT_MS      = 700;
const TURN_GAP_MS   = 1100;
const LUNGE_MS      = 220;
const SLOWMO_MS     = 2200; // duración del slow-mo de KO

type Phase = "intro" | "vs" | "fight" | "battle" | "ko";

interface Props {
  a: PokemonDetail;
  b: PokemonDetail;
  onClose: () => void;
}

function playSound(url: string | null) {
  if (!url) return;
  try { new Audio(url).play(); } catch { /* ignorar */ }
}

function hpColor(ratio: number) {
  if (ratio > 0.5) return "#4caf50";
  if (ratio > 0.25) return "#f8d030";
  return "#f44336";
}

// Partículas de impacto
function Sparks({ color, count = 10 }: { color: string; count?: number }) {
  const sparks = useMemo(() =>
    Array.from({ length: count }, (_, i) => ({
      id: i,
      angle: (360 / count) * i + Math.random() * 20 - 10,
      dist: 40 + Math.random() * 40,
    })), [count]);

  return (
    <>
      {sparks.map(s => {
        const rad = (s.angle * Math.PI) / 180;
        return (
          <motion.div
            key={s.id}
            style={{
              position: "absolute", top: "50%", left: "50%",
              width: 6, height: 6, borderRadius: "50%",
              background: color, pointerEvents: "none",
            }}
            initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
            animate={{
              x: Math.cos(rad) * s.dist,
              y: Math.sin(rad) * s.dist,
              opacity: 0,
              scale: 0,
            }}
            transition={{ duration: 0.4, ease: "easeOut" }}
          />
        );
      })}
    </>
  );
}

// Trazo SVG de impacto (slash)
function SlashMark({ color }: { color: string }) {
  return (
    <motion.svg
      width="80" height="80"
      style={{ position: "absolute", top: "10%", left: "10%", pointerEvents: "none" }}
      initial={{ opacity: 1, scale: 0.5 }}
      animate={{ opacity: 0, scale: 1.4 }}
      transition={{ duration: 0.35 }}
    >
      <motion.line x1="10" y1="10" x2="70" y2="70" stroke={color} strokeWidth="5" strokeLinecap="round"
        initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.15 }} />
      <motion.line x1="25" y1="10" x2="75" y2="60" stroke={color} strokeWidth="3" strokeLinecap="round"
        initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.15, delay: 0.05 }} />
    </motion.svg>
  );
}

// Barra de HP con "damage trail"
function HpBar({ hp, maxHp, name, flipped }: { hp: number; maxHp: number; name: string; flipped?: boolean }) {
  const ratio = maxHp > 0 ? hp / maxHp : 0;
  const [trailRatio, setTrailRatio] = useState(ratio);

  useEffect(() => {
    const t = setTimeout(() => setTrailRatio(ratio), 300);
    return () => clearTimeout(t);
  }, [ratio]);

  return (
    <div style={{
      flex: 1,
      display: "flex",
      flexDirection: flipped ? "row-reverse" : "row",
      alignItems: "center",
      gap: 8,
    }}>
      <span style={{
        fontWeight: 900, fontSize: "0.8rem", textTransform: "capitalize",
        color: "#fff", textShadow: "1px 1px 0 #000", whiteSpace: "nowrap",
        minWidth: 80, textAlign: flipped ? "left" : "right",
      }}>
        {name}
      </span>
      <div style={{
        flex: 1, height: 18, background: "#111", border: "2px solid #fff",
        position: "relative", borderRadius: 4, overflow: "hidden",
        direction: flipped ? "rtl" : "ltr",
      }}>
        {/* trail rojo */}
        <div style={{
          position: "absolute", inset: 0,
          width: `${trailRatio * 100}%`,
          background: "#c0392b",
          transition: "width 0.5s ease",
        }} />
        {/* HP real */}
        <div style={{
          position: "absolute", inset: 0,
          width: `${ratio * 100}%`,
          background: hpColor(ratio),
          transition: "width 0.25s ease",
        }} />
      </div>
      <span style={{ color: "#fff", fontWeight: 800, fontSize: "0.75rem", minWidth: 36, textAlign: "center" }}>
        {Math.max(0, Math.round(hp))}/{maxHp}
      </span>
    </div>
  );
}

export default function BattleArena({ a, b, onClose }: Props) {
  const result = useMemo(() => simulateBattle(a, b), [a, b]);
  const [phase, setPhase] = useState<Phase>("intro");
  const [step, setStep] = useState(-1);
  const [hpA, setHpA] = useState(result.maxHpA);
  const [hpB, setHpB] = useState(result.maxHpB);
  const [impactSide, setImpactSide] = useState<"a" | "b" | null>(null);
  const [dmgFloat, setDmgFloat] = useState<{ side: "a" | "b"; dmg: number; eff: BattleEvent["effectiveness"] } | null>(null);
  const [effBanner, setEffBanner] = useState<string | null>(null);
  const [shakingArena, setShakingArena] = useState(false);
  const [shakeHard, setShakeHard] = useState(false);
  const [sparksAt, setSparksAt] = useState<{ side: "a" | "b"; color: string } | null>(null);
  const [slashAt, setSlashAt] = useState<{ side: "a" | "b"; color: string } | null>(null);
  const [flashWhite, setFlashWhite] = useState(false);
  const [aLunge, setALunge] = useState(false);
  const [bLunge, setBLunge] = useState(false);
  const [loser, setLoser] = useState<"a" | "b" | null>(null);
  const [key, setKey] = useState(0); // para REVANCHA

  const stepRef = useRef(step);
  stepRef.current = step;

  const colorA = TYPE_COLORS[a.types[0]] ?? TYPE_COLORS.default;
  const colorB = TYPE_COLORS[b.types[0]] ?? TYPE_COLORS.default;
  const spriteA = a.sprites.animated ?? a.sprites.default;
  const spriteB = b.sprites.animated ?? b.sprites.default;

  // ── Secuencia de intro ──
  useEffect(() => {
    // intro: combatientes entran
    const t1 = setTimeout(() => setPhase("vs"), INTRO_MS);
    const t2 = setTimeout(() => setPhase("fight"), INTRO_MS + 600);
    const t3 = setTimeout(() => { setPhase("battle"); setStep(0); }, INTRO_MS + 600 + FIGHT_MS);
    // cry de intro
    const t4 = setTimeout(() => { playSound(a.cry); playSound(b.cry); }, INTRO_MS + 200);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearTimeout(t4); };
  }, [key]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Stepper de turnos ──
  useEffect(() => {
    if (phase !== "battle") return;
    if (step < 0 || step >= result.events.length) return;

    const ev = result.events[step];
    const isA = ev.attackerId === a.id;
    const atkSide = isA ? "a" : "b";
    const defSide = isA ? "b" : "a";
    const atkColor = isA ? colorA : colorB;

    // Lunge (embestida)
    if (atkSide === "a") setALunge(true);
    else setBLunge(true);

    const t1 = setTimeout(() => {
      if (atkSide === "a") setALunge(false);
      else setBLunge(false);

      // Actualizar HP
      if (defSide === "b") setHpB(ev.defenderHpAfter);
      else setHpA(ev.defenderHpAfter);

      // Reproducir cry del atacante
      const atkPoke = isA ? a : b;
      playSound(atkPoke.cry);

      // Impacto + efectos
      setImpactSide(defSide);
      setSparksAt({ side: defSide, color: atkColor });
      setSlashAt({ side: defSide, color: atkColor });
      setFlashWhite(true);

      const intensity = ev.effectiveness === "super" || ev.effectiveness === "immune";
      setShakingArena(true);
      if (intensity) setShakeHard(true);

      // Número flotante
      setDmgFloat({ side: defSide, dmg: ev.dmg, eff: ev.effectiveness });

      // Banner de efectividad
      if (ev.effectiveness === "super") setEffBanner("¡SUPEREFICAZ!");
      else if (ev.effectiveness === "weak") setEffBanner("Poco eficaz...");
      else if (ev.effectiveness === "immune") setEffBanner("¡INMUNE!");
      else setEffBanner(null);

      setTimeout(() => {
        setImpactSide(null);
        setSparksAt(null);
        setSlashAt(null);
        setFlashWhite(false);
        setShakingArena(false);
        setShakeHard(false);
        setDmgFloat(null);
        setEffBanner(null);
      }, 500);

      // Avanzar al siguiente paso o terminar
      const isLast = ev.defenderHpAfter <= 0;
      if (isLast) {
        setLoser(defSide);
        setTimeout(() => setPhase("ko"), isLast ? SLOWMO_MS : 0);
      } else {
        setTimeout(() => setStep(s => s + 1), TURN_GAP_MS);
      }
    }, LUNGE_MS);

    return () => clearTimeout(t1);
  }, [step, phase]); // eslint-disable-line react-hooks/exhaustive-deps

  function revancha() {
    setPhase("intro");
    setStep(-1);
    const newResult = simulateBattle(a, b);
    setHpA(newResult.maxHpA);
    setHpB(newResult.maxHpB);
    setLoser(null);
    setImpactSide(null);
    setSparksAt(null);
    setSlashAt(null);
    setFlashWhite(false);
    setShakingArena(false);
    setDmgFloat(null);
    setEffBanner(null);
    setKey(k => k + 1);
  }

  const winner = result.winnerId === a.id ? a : b;
  const winnerSprite = winner.sprites.animated ?? winner.sprites.default;
  const winnerColor = TYPE_COLORS[winner.types[0]] ?? TYPE_COLORS.default;

  const prefersReduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

  return (
    <div
      className={`battle-overlay${shakingArena && !prefersReduced ? (shakeHard ? " shake-hard" : " shake") : ""}`}
      style={{ "--aura-a": colorA, "--aura-b": colorB } as React.CSSProperties}
    >
      {/* Flash blanco de impacto */}
      {flashWhite && !prefersReduced && (
        <motion.div
          className="battle-flash"
          initial={{ opacity: 0.6 }}
          animate={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
        />
      )}

      {/* ── HUD superior ── */}
      <div className="battle-hud">
        <HpBar hp={hpA} maxHp={result.maxHpA} name={a.name} />
        <div style={{ width: 60, textAlign: "center", color: "#fff", fontWeight: 900, fontSize: "1rem" }}>VS</div>
        <HpBar hp={hpB} maxHp={result.maxHpB} name={b.name} flipped />
      </div>

      {/* ── Escenario ── */}
      <div className="battle-stage">

        {/* Combatiente A */}
        <div className="battle-fighter battle-fighter--a">
          <div className="battle-aura" style={{ background: `radial-gradient(circle, ${colorA}55 0%, transparent 70%)` }} />
          <motion.img
            src={spriteA} alt={a.name}
            className="battle-sprite"
            animate={
              !prefersReduced
                ? aLunge
                  ? { x: [0, -10, 60, 0] }
                  : impactSide === "a"
                    ? { x: [0, -10, 10, -8, 8, 0], rotate: [0, -3, 3, -2, 2, 0] }
                    : loser === "a"
                      ? { rotate: 90, y: 60, opacity: 0 }
                      : {}
                : {}
            }
            transition={loser === "a" ? { duration: 0.6 } : { duration: LUNGE_MS / 1000 }}
          />
          {sparksAt?.side === "a" && <Sparks color={colorA} />}
          {slashAt?.side === "a" && <SlashMark color={colorA} />}
          {dmgFloat?.side === "a" && (
            <motion.div
              className={`battle-dmg${dmgFloat.eff === "super" ? " battle-dmg--super" : dmgFloat.eff === "immune" ? " battle-dmg--immune" : ""}`}
              initial={{ y: 0, opacity: 1 }}
              animate={{ y: -50, opacity: 0 }}
              transition={{ duration: 0.7 }}
            >
              {dmgFloat.eff === "immune" ? "0" : `-${dmgFloat.dmg}`}
            </motion.div>
          )}
        </div>

        {/* Combatiente B */}
        <div className="battle-fighter battle-fighter--b">
          <div className="battle-aura" style={{ background: `radial-gradient(circle, ${colorB}55 0%, transparent 70%)` }} />
          <motion.img
            src={spriteB} alt={b.name}
            className="battle-sprite battle-sprite--flipped"
            animate={
              !prefersReduced
                ? bLunge
                  ? { x: [0, 10, -60, 0] }
                  : impactSide === "b"
                    ? { x: [0, 10, -10, 8, -8, 0], rotate: [0, 3, -3, 2, -2, 0] }
                    : loser === "b"
                      ? { rotate: -90, y: 60, opacity: 0 }
                      : {}
                : {}
            }
            transition={loser === "b" ? { duration: 0.6 } : { duration: LUNGE_MS / 1000 }}
          />
          {sparksAt?.side === "b" && <Sparks color={colorB} />}
          {slashAt?.side === "b" && <SlashMark color={colorB} />}
          {dmgFloat?.side === "b" && (
            <motion.div
              className={`battle-dmg${dmgFloat.eff === "super" ? " battle-dmg--super" : dmgFloat.eff === "immune" ? " battle-dmg--immune" : ""}`}
              initial={{ y: 0, opacity: 1 }}
              animate={{ y: -50, opacity: 0 }}
              transition={{ duration: 0.7 }}
            >
              {dmgFloat.eff === "immune" ? "0" : `-${dmgFloat.dmg}`}
            </motion.div>
          )}
        </div>

        {/* ── Banners de fase ── */}
        <AnimatePresence>
          {phase === "vs" && (
            <motion.div
              key="vs"
              className="battle-vs"
              initial={{ scale: 0.2, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 1.5, opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              VS
            </motion.div>
          )}

          {phase === "fight" && (
            <motion.div
              key="fight"
              className="battle-fight-banner"
              initial={{ scale: 3, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.5, opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              FIGHT!
            </motion.div>
          )}

          {effBanner && phase === "battle" && (
            <motion.div
              key={effBanner + step}
              className={`battle-eff-banner${effBanner.includes("SUPER") ? " battle-eff-banner--super" : effBanner.includes("INMUNE") ? " battle-eff-banner--immune" : " battle-eff-banner--weak"}`}
              initial={{ scale: 1.4, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              {effBanner}
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Pantalla de KO ── */}
        {phase === "ko" && (
          <motion.div
            className="battle-ko-screen"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4 }}
          >
            <motion.div
              className="battle-ko-label"
              style={{ color: winnerColor, textShadow: `4px 4px 0 #000, 8px 8px 0 ${winnerColor}88` }}
              initial={{ scale: 0, rotate: -10 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 15, delay: 0.2 }}
            >
              K.O.
            </motion.div>
            <motion.img
              src={winnerSprite} alt={winner.name}
              className="battle-ko-sprite"
              initial={{ y: 30, opacity: 0 }}
              animate={{ y: [30, -10, 0], opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.5 }}
            />
            <motion.p
              className="battle-ko-name"
              style={{ color: winnerColor }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.7 }}
            >
              {winner.name} gana!
            </motion.p>
            {/* confeti */}
            {!prefersReduced && Array.from({ length: 12 }, (_, i) => (
              <span
                key={i}
                className="sparkle"
                style={{
                  top: `${20 + Math.random() * 60}%`,
                  left: `${10 + Math.random() * 80}%`,
                  animationDelay: `${Math.random() * 0.5}s`,
                  color: winnerColor,
                }}
              />
            ))}
            <div style={{ display: "flex", gap: 12, justifyContent: "center", marginTop: 24 }}>
              <button className="btn-brutal" onClick={revancha}>Revancha</button>
              <button className="btn-brutal" onClick={onClose}>Cerrar</button>
            </div>
          </motion.div>
        )}
      </div>

      {/* Botón de emergencia para cerrar durante la batalla */}
      {phase !== "ko" && (
        <button
          className="btn-brutal"
          style={{ position: "absolute", top: 12, right: 12, zIndex: 10, fontSize: "0.75rem", padding: "4px 12px" }}
          onClick={onClose}
        >
          ✕
        </button>
      )}
    </div>
  );
}
