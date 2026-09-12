import { useMemo } from "react";
import { Billboard, Line } from "@react-three/drei";
import * as THREE from "three";
import { partAnchor } from "@/lib/house/anchors";
import { mulberry32 } from "@/lib/house/rng";
import { PART_LABEL, type HouseSpec, type PartId } from "@/lib/house/types";
import { useLot } from "@/lib/house/store";

function Callout({
  part,
  spec,
  active,
  line,
  onPick,
}: {
  part: PartId;
  spec: HouseSpec;
  active: boolean;
  line: string;
  onPick: (p: PartId) => void;
}) {
  const a = partAnchor(spec, part);
  const tex = useMemo(() => {
    const c = document.createElement("canvas");
    c.width = 640;
    c.height = 160;
    const ctx = c.getContext("2d");
    if (!ctx) return null;
    ctx.fillStyle = active ? "rgba(232,228,217,0.94)" : "rgba(18,20,16,0.88)";
    ctx.fillRect(0, 0, 640, 160);
    ctx.strokeStyle = active ? "#121410" : "#b85c4a";
    ctx.lineWidth = 8;
    ctx.strokeRect(8, 8, 624, 144);
    ctx.fillStyle = active ? "#121410" : "#e8e4d9";
    ctx.font = "600 36px 'DM Sans', system-ui, sans-serif";
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillText(PART_LABEL[part], 28, 52);
    ctx.font = "500 28px 'DM Sans', system-ui, sans-serif";
    ctx.fillStyle = active ? "#3a3832" : "#9a9588";
    ctx.fillText(line.slice(0, 42), 28, 108);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.needsUpdate = true;
    return t;
  }, [part, active, line]);

  return (
    <group position={[a.x, a.y, a.z]}>
      <Billboard follow>
        <mesh
          rotation={[-Math.PI / 2, 0, 0]}
          onClick={(e) => {
            e.stopPropagation();
            onPick(part);
          }}
        >
          <ringGeometry args={[0.18, active ? 0.38 : 0.28, 24]} />
          <meshBasicMaterial color={active ? "#e8e4d9" : "#c56a32"} transparent opacity={active ? 1 : 0.85} />
        </mesh>
        <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[0.08, 16]} />
          <meshBasicMaterial color={active ? "#121410" : "#e8e4d9"} />
        </mesh>
        {tex && active ? (
          <mesh position={[0, 0.42, 0]}>
            <planeGeometry args={[1.35, 0.34]} />
            <meshBasicMaterial map={tex} transparent />
          </mesh>
        ) : null}
      </Billboard>
    </group>
  );
}

function HailScars({ spec, count }: { spec: HouseSpec; count: number }) {
  const pts = useMemo(() => {
    const rng = mulberry32(spec.seed ^ 0x91a2);
    const bodyH = spec.stories * spec.storyHeight + 0.36;
    const rise = Math.tan(spec.roofPitch) * (spec.depth / 2);
    const out: { x: number; y: number; z: number; s: number }[] = [];
    for (let i = 0; i < count; i++) {
      const x = (rng() - 0.5) * spec.width * 0.78;
      const z = (rng() - 0.15) * spec.depth * 0.62;
      const y = bodyH + rise * 0.45 + 0.12;
      out.push({ x, y, z, s: 0.07 + rng() * 0.11 });
    }
    return out;
  }, [spec, count]);
  return (
    <group>
      {pts.map((p, i) => (
        <group key={i} position={[p.x, p.y, p.z]} rotation={[-0.55, 0, 0]}>
          <mesh>
            <circleGeometry args={[p.s, 10]} />
            <meshBasicMaterial color="#1a1c1a" transparent opacity={0.9} />
          </mesh>
          <mesh>
            <ringGeometry args={[p.s * 1.15, p.s * 1.7, 16]} />
            <meshBasicMaterial color="#c56a32" transparent opacity={0.85} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

function DimensionLines({ spec }: { spec: HouseSpec }) {
  const w = spec.width;
  const d = spec.depth;
  const h = spec.stories * spec.storyHeight + 0.36;
  const y = 0.08;
  const tex = (label: string) => {
    const c = document.createElement("canvas");
    c.width = 320;
    c.height = 80;
    const ctx = c.getContext("2d");
    if (!ctx) return null;
    ctx.fillStyle = "rgba(18,20,16,0.82)";
    ctx.fillRect(0, 0, 320, 80);
    ctx.fillStyle = "#e8e4d9";
    ctx.font = "600 36px ui-monospace, monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(label, 160, 42);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  };
  const wTex = useMemo(() => tex(`${w.toFixed(1)} m`), [w]);
  const dTex = useMemo(() => tex(`${d.toFixed(1)} m`), [d]);
  const hTex = useMemo(() => tex(`${h.toFixed(1)} m`), [h]);
  const cream = "#e8e4d9";
  return (
    <group>
      <Line points={[[-w / 2, y, d / 2 + 0.7], [w / 2, y, d / 2 + 0.7]]} color={cream} lineWidth={1.2} />
      <Line points={[[w / 2 + 0.7, y, -d / 2], [w / 2 + 0.7, y, d / 2]]} color={cream} lineWidth={1.2} />
      <Line points={[[-w / 2 - 0.55, 0, -d / 2], [-w / 2 - 0.55, h, -d / 2]]} color={cream} lineWidth={1.2} />
      {wTex ? (
        <Billboard position={[0, y + 0.25, d / 2 + 0.7]}>
          <mesh>
            <planeGeometry args={[1.15, 0.28]} />
            <meshBasicMaterial map={wTex} transparent />
          </mesh>
        </Billboard>
      ) : null}
      {dTex ? (
        <Billboard position={[w / 2 + 0.7, y + 0.25, 0]}>
          <mesh>
            <planeGeometry args={[1.15, 0.28]} />
            <meshBasicMaterial map={dTex} transparent />
          </mesh>
        </Billboard>
      ) : null}
      {hTex ? (
        <Billboard position={[-w / 2 - 0.55, h / 2, -d / 2]}>
          <mesh>
            <planeGeometry args={[1.05, 0.26]} />
            <meshBasicMaterial map={hTex} transparent />
          </mesh>
        </Billboard>
      ) : null}
    </group>
  );
}

export function DamageMarks({ spec }: { spec: HouseSpec }) {
  const health = useLot((s) => s.health);
  const focusPart = useLot((s) => s.focusPart);
  const phase = useLot((s) => s.phase);
  const events = useLot((s) => s.events);
  const applied = useLot((s) => s.applied);
  const setFocusPart = useLot((s) => s.setFocusPart);
  const attachments = useLot((s) => s.attachments);
  if (phase !== "storm" && phase !== "measure") return null;
  const parts = (Object.keys(health) as PartId[]).filter((p) => health[p] < 0.98);
  const roofHits = Math.round((1 - health.roof) * 18);
  const photoCount = attachments.filter((a) => a.kind === "photo").length;
  return (
    <group>
      {roofHits > 0 ? <HailScars spec={spec} count={roofHits} /> : null}
      {phase === "measure" ? <DimensionLines spec={spec} /> : null}
      {photoCount > 0 ? (
        <Billboard position={[0, spec.stories * spec.storyHeight + 1.55, 0]}>
          <mesh>
            <planeGeometry args={[1.6, 0.36]} />
            <meshBasicMaterial color="#c56a32" />
          </mesh>
        </Billboard>
      ) : null}
      {parts.map((p) => {
        const ev = events.find((e) => e.part === p && applied[e.id]);
        const line = ev ? `${ev.label} · modeled` : `Integrity ${Math.round(health[p] * 100)}% · modeled`;
        return (
          <Callout
            key={p}
            part={p}
            spec={spec}
            active={focusPart === p}
            line={line}
            onPick={setFocusPart}
          />
        );
      })}
    </group>
  );
}
