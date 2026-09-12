import { useEffect, useMemo } from "react";
import { mulberry32 } from "@/lib/house/rng";
import type { HouseSpec } from "@/lib/house/types";
import { useLot } from "@/lib/house/store";
import { makeGrass } from "./textures";

function Tree({
  position,
  fallen,
  seed,
  sway,
}: {
  position: [number, number, number];
  fallen: number;
  seed: number;
  sway: number;
}) {
  const rng = useMemo(() => mulberry32(seed), [seed]);
  const h = 2.05 + rng() * 1.35;
  const r = 0.58 + rng() * 0.26;
  const hue = rng() > 0.5 ? "#35523a" : "#2f4634";
  const outward = position[0] >= 0 ? 1 : -1;
  const lean = fallen * (Math.PI / 2) * outward;

  return (
    <group position={position} rotation={[0, 0, lean + sway * (1 - fallen) * 0.07]}>
      <mesh position={[0, h * 0.28, 0]} castShadow>
        <cylinderGeometry args={[0.08, 0.14, h * 0.55, 6]} />
        <meshStandardMaterial color="#4a3728" roughness={0.95} />
      </mesh>
      <mesh position={[0, h * 0.7, 0]} castShadow>
        <coneGeometry args={[r, h * 0.72, 7]} />
        <meshStandardMaterial color={hue} roughness={0.88} />
      </mesh>
      <mesh position={[0, h * 0.9, 0]} castShadow>
        <coneGeometry args={[r * 0.66, h * 0.36, 7]} />
        <meshStandardMaterial color={hue} roughness={0.88} />
      </mesh>
    </group>
  );
}

type Post = { x: number; z: number; yaw: number; rail: boolean };

function fenceRun(
  x0: number,
  z0: number,
  x1: number,
  z1: number,
  yaw: number,
  step = 1.2,
): Post[] {
  const len = Math.hypot(x1 - x0, z1 - z0);
  const count = Math.max(2, Math.round(len / step) + 1);
  const posts: Post[] = [];
  for (let i = 0; i < count; i++) {
    const t = i / (count - 1);
    posts.push({
      x: x0 + (x1 - x0) * t,
      z: z0 + (z1 - z0) * t,
      yaw,
      rail: i < count - 1,
    });
  }
  return posts;
}

function placeTrees(spec: HouseSpec) {
  const rng = mulberry32(spec.seed ^ 0xc0ffee);
  const items: { pos: [number, number, number]; seed: number }[] = [];
  const hw = spec.width / 2;
  const hd = spec.depth / 2;
  let n = 0;
  for (let guard = 0; items.length < spec.treeCount && guard < 80; guard++) {
    n += 1;
    const kind = rng();
    let x: number;
    let z: number;
    if (kind < 0.42) {
      x = (rng() * 2 - 1) * (hw + 5.2);
      z = -hd - 2.4 - rng() * 3.2;
    } else if (kind < 0.78) {
      x = -(hw + 3.9 + rng() * 3.4);
      z = -hd - 0.8 + rng() * (spec.depth + 0.6);
    } else {
      x = hw + 4.4 + rng() * 2.8;
      z = -hd - 1.8 - rng() * 3.0;
    }
    if (z > 0.2) continue;
    if (Math.abs(x) < hw + 2.8 && z > -hd - 1.6) continue;
    items.push({ pos: [x, 0, z], seed: (spec.seed + n * 997) >>> 0 });
  }
  return items;
}

export function Lot({
  spec,
  treeHealth,
  fenceHealth,
  weather,
}: {
  spec: HouseSpec | null;
  treeHealth: number;
  fenceHealth: number;
  weather: number;
}) {
  const grass = useMemo(() => makeGrass(), []);
  useEffect(() => () => grass.dispose(), [grass]);
  const satUrl = useLot((s) => s.satUrl);

  const trees = useMemo(() => (spec ? placeTrees(spec) : []), [spec]);

  const fence = useMemo(() => {
    if (!spec?.hasFence) return [];
    const halfW = spec.width / 2 + 3.4 + (spec.hasGarage ? 1.8 : 0);
    const back = spec.depth / 2 + 3.4;
    const front = spec.depth / 2 * 0.12;
    return [
      ...fenceRun(-halfW, -back, halfW, -back, 0),
      ...fenceRun(-halfW, -back, -halfW, front, -Math.PI / 2),
      ...fenceRun(halfW, -back, halfW, front, -Math.PI / 2),
    ];
  }, [spec]);

  const sway = Math.sin(weather * 7.5) * weather;

  return (
    <group>
      {satUrl ? null : (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
          <planeGeometry args={[80, 80]} />
          <meshStandardMaterial color="#3d4a34" map={grass} roughness={0.95} />
        </mesh>
      )}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 11]} receiveShadow>
        <planeGeometry args={[80, 6.5]} />
        <meshStandardMaterial color="#3a3936" roughness={1} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 11]}>
        <planeGeometry args={[0.16, 6.5]} />
        <meshStandardMaterial color="#c9b56a" />
      </mesh>

      {trees.map((t, i) => (
        <Tree
          key={t.seed}
          position={t.pos}
          seed={t.seed}
          fallen={i < 2 ? Math.max(0, 1 - treeHealth - i * 0.4) : 0}
          sway={sway * (i % 2 === 0 ? 1 : -0.65)}
        />
      ))}

      {fence.map((p, i) => {
        const lean = fenceHealth < 0.65 && i % 5 === 0 ? (1 - fenceHealth) * 0.45 : 0;
        if (fenceHealth < 0.35 && i % 6 === 0) return null;
        return (
          <group key={`${p.x}-${p.z}-${p.yaw}`} position={[p.x, 0, p.z]} rotation={[0, p.yaw, lean]}>
            <mesh position={[0, 0.52, 0]} castShadow>
              <boxGeometry args={[0.07, 1.04, 0.07]} />
              <meshStandardMaterial color="#5c5348" roughness={0.85} />
            </mesh>
            {p.rail ? (
              <>
                <mesh position={[0.6, 0.74, 0]}>
                  <boxGeometry args={[1.2, 0.045, 0.035]} />
                  <meshStandardMaterial color="#6a6156" />
                </mesh>
                <mesh position={[0.6, 0.38, 0]}>
                  <boxGeometry args={[1.2, 0.045, 0.035]} />
                  <meshStandardMaterial color="#6a6156" />
                </mesh>
              </>
            ) : null}
          </group>
        );
      })}
    </group>
  );
}
