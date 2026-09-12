import { Canvas, useFrame } from "@react-three/fiber";
import { Html, OrbitControls, Stars, useTexture } from "@react-three/drei";
import { Suspense, useMemo, useRef, useState } from "react";
import { BackSide, type Group, type Mesh } from "three";
import { latLonToVec, REGIONS, WORLD_INDUSTRIES, type WorldRegion } from "@/lib/geo/regions";
import { useLot } from "@/lib/house/store";
import { cn } from "@/lib/cn";

const R = 1.6;
const EARTH = "https://unpkg.com/three-globe@2.44.1/example/img/earth-blue-marble.jpg";

function Earth({ onPick }: { onPick: (r: WorldRegion) => void }) {
  const group = useRef<Group>(null);
  const glow = useRef<Mesh>(null);
  const tex = useTexture(EARTH);
  tex.colorSpace = "srgb";
  const [hover, setHover] = useState<string | null>(null);

  useFrame((_, dt) => {
    if (group.current) group.current.rotation.y += dt * 0.045;
    if (glow.current) glow.current.rotation.y -= dt * 0.01;
  });

  const pins = useMemo(
    () =>
      REGIONS.map((r) => ({
        r,
        pos: latLonToVec(r.lat, r.lon, R + 0.04),
      })),
    [],
  );

  return (
    <group ref={group}>
      <mesh>
        <sphereGeometry args={[R, 64, 48]} />
        <meshStandardMaterial map={tex} color="#8fb4d4" roughness={0.92} metalness={0.04} emissive="#102030" emissiveIntensity={0.15} />
      </mesh>
      <mesh ref={glow} scale={1.08}>
        <sphereGeometry args={[R, 32, 24]} />
        <meshBasicMaterial color="#4a6d9a" transparent opacity={0.16} side={BackSide} />
      </mesh>
      {pins.map(({ r, pos }) => (
        <group key={r.id} position={pos}>
          <mesh
            onClick={(e) => {
              e.stopPropagation();
              onPick(r);
            }}
            onPointerOver={(e) => {
              e.stopPropagation();
              setHover(r.id);
              document.body.style.cursor = "pointer";
            }}
            onPointerOut={() => {
              setHover(null);
              document.body.style.cursor = "default";
            }}
          >
            <sphereGeometry args={[hover === r.id ? 0.045 : 0.028, 12, 12]} />
            <meshBasicMaterial color={r.live ? "#c56a32" : "#8b95a3"} />
          </mesh>
          <Html center distanceFactor={8} occlude={false} style={{ pointerEvents: "none" }}>
            <div
              className={cn(
                "whitespace-nowrap rounded-sm px-1.5 py-0.5 font-mono text-[10px] tracking-wide uppercase",
                hover === r.id ? "bg-accent text-accent-fg" : "bg-surface/90 text-fg",
              )}
            >
              {r.name}
            </div>
          </Html>
        </group>
      ))}
    </group>
  );
}

export default function GlobeView() {
  const pickRegion = useLot((s) => s.pickRegion);
  const setVertical = useLot((s) => s.setVertical);
  const verticalId = useLot((s) => s.verticalId);

  return (
    <div className="absolute inset-0 z-0 h-full w-full bg-bg">
      <Canvas camera={{ position: [0, 0.35, 4.6], fov: 38 }} gl={{ antialias: true }}>
        <color attach="background" args={["#10141a"]} />
        <ambientLight intensity={0.55} />
        <directionalLight position={[4, 2, 3]} intensity={1.35} />
        <Stars radius={80} depth={40} count={1200} factor={2.4} saturation={0} fade speed={0.4} />
        <Suspense fallback={null}>
          <Earth onPick={(r) => pickRegion(r.id)} />
        </Suspense>
        <OrbitControls enablePan={false} minDistance={3.2} maxDistance={7} enableDamping />
      </Canvas>
      <div className="pointer-events-none absolute inset-x-0 bottom-8 z-10 flex justify-center px-3">
        <div className="pointer-events-auto w-full max-w-xl rounded-lg bg-surface/92 p-4 shadow-border backdrop-blur-sm">
          <p className="flex items-center gap-2 text-xs font-medium tracking-[0.18em] text-muted uppercase">
            <span className="grid size-7 place-items-center rounded-sm bg-navy text-[11px] font-semibold tracking-tight text-fg">OP</span>
            Portable command
          </p>
          <p className="mt-2 text-sm leading-relaxed text-fg">
            One rail. Every industry. Download it onto the system an enterprise already runs. AI drafts. A named human governs. Kill is always on.
          </p>
          <p className="mt-2 text-xs text-subtle">Click a region on the globe. Satellite hones in. Live weather in this session is U.S. NWS.</p>
          <div className="mt-3 flex flex-wrap gap-1">
            {WORLD_INDUSTRIES.map((i) => (
              <button
                key={i.id}
                type="button"
                onClick={() => setVertical(i.id)}
                className={cn(
                  "min-h-9 rounded-md px-2 font-mono text-[10px] tracking-wide uppercase",
                  verticalId === i.id ? "bg-accent text-accent-fg" : "bg-bg text-muted hover:text-fg",
                )}
              >
                {i.name}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
