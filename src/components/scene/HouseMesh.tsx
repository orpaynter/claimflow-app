import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useLot } from "@/lib/house/store";
import type { HouseSpec, PartId } from "@/lib/house/types";
import { makeClapboard, makeShingles, makeStone } from "./textures";

function DualPitchRoof({
  width,
  depth,
  y,
  pitch,
  color,
  map,
  damage = 0,
}: {
  width: number;
  depth: number;
  y: number;
  pitch: number;
  color: string;
  map: THREE.Texture;
  damage?: number;
}) {
  const overhang = 0.34;
  const w = width + overhang * 2;
  const halfWall = depth / 2;
  const rise = Math.tan(pitch) * halfWall;
  const half = halfWall + overhang;
  const eaveY = -Math.tan(pitch) * overhang;
  const visRise = rise - eaveY;
  const len = Math.hypot(half, visRise);
  const angle = Math.atan2(visRise, half);
  const drop = damage * 0.14;
  const midY = (rise + eaveY) / 2;

  return (
    <group position={[0, y - drop, 0]}>
      <mesh rotation={[angle, 0, 0]} position={[0, midY, half / 2]} castShadow receiveShadow>
        <boxGeometry args={[w, 0.08, len]} />
        <meshStandardMaterial color={damage > 0.2 ? "#2c302c" : color} map={map} roughness={0.9} />
      </mesh>
      <mesh rotation={[-angle, 0, 0]} position={[0, midY, -half / 2]} castShadow receiveShadow>
        <boxGeometry args={[w, 0.08, len]} />
        <meshStandardMaterial color={color} map={map} roughness={0.9} />
      </mesh>
      <mesh position={[0, rise + 0.02, 0]} castShadow>
        <boxGeometry args={[w * 0.99, 0.05, 0.1]} />
        <meshStandardMaterial color={color} roughness={0.72} />
      </mesh>
      {damage > 0.3 ? (
        <mesh position={[w * 0.14, rise * 0.38, halfWall * 0.42]} rotation={[angle, 0, 0.14]}>
          <boxGeometry args={[1.15, 0.04, 0.85]} />
          <meshStandardMaterial color="#1a1c1a" roughness={1} />
        </mesh>
      ) : null}
      {damage > 0.18
        ? [0.22, -0.18, 0.08, -0.32, 0.36].slice(0, Math.max(2, Math.round(damage * 6))).map((ox, i) => (
            <mesh
              key={i}
              position={[w * ox, rise * (0.28 + (i % 3) * 0.12), halfWall * (0.18 + i * 0.08)]}
              rotation={[angle, 0, i % 2 === 0 ? 0.2 : -0.12]}
            >
              <boxGeometry args={[0.42 + (i % 3) * 0.12, 0.035, 0.32]} />
              <meshStandardMaterial color="#161816" roughness={1} />
            </mesh>
          ))
        : null}
    </group>
  );
}

function GableEnds({
  width,
  depth,
  y,
  pitch,
  color,
  map,
}: {
  width: number;
  depth: number;
  y: number;
  pitch: number;
  color: string;
  map: THREE.Texture;
}) {
  const rise = Math.tan(pitch) * (depth / 2);
  const geom = useMemo(() => {
    const shape = new THREE.Shape();
    const hd = depth / 2;
    shape.moveTo(-hd, 0);
    shape.lineTo(hd, 0);
    shape.lineTo(0, rise);
    shape.closePath();
    const g = new THREE.ShapeGeometry(shape);
    g.computeVertexNormals();
    return g;
  }, [depth, rise]);

  return (
    <group position={[0, y, 0]}>
      <mesh geometry={geom} position={[width / 2 - 0.01, 0, 0]} rotation={[0, Math.PI / 2, 0]}>
        <meshStandardMaterial color={color} map={map} roughness={0.82} side={THREE.DoubleSide} />
      </mesh>
      <mesh geometry={geom} position={[-width / 2 + 0.01, 0, 0]} rotation={[0, -Math.PI / 2, 0]}>
        <meshStandardMaterial color={color} map={map} roughness={0.82} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

function RoofWithGables({
  width,
  depth,
  y,
  pitch,
  roofColor,
  roofMap,
  wallColor,
  wallMap,
  damage = 0,
  streetGable = false,
}: {
  width: number;
  depth: number;
  y: number;
  pitch: number;
  roofColor: string;
  roofMap: THREE.Texture;
  wallColor: string;
  wallMap: THREE.Texture;
  damage?: number;
  streetGable?: boolean;
}) {
  const w = streetGable ? depth : width;
  const d = streetGable ? width : depth;
  return (
    <group rotation={[0, streetGable ? Math.PI / 2 : 0, 0]}>
      <DualPitchRoof width={w} depth={d} y={y} pitch={pitch} color={roofColor} map={roofMap} damage={damage} />
      <GableEnds width={w} depth={d} y={y} pitch={pitch} color={wallColor} map={wallMap} />
    </group>
  );
}

function WindowUnit({
  position,
  rotation = [0, 0, 0],
  broken,
  lit,
  shutters,
  shutterColor,
  trim,
}: {
  position: [number, number, number];
  rotation?: [number, number, number];
  broken: boolean;
  lit: boolean;
  shutters: boolean;
  shutterColor: string;
  trim: string;
}) {
  return (
    <group position={position} rotation={rotation}>
      <mesh>
        <boxGeometry args={[0.7, 1.02, 0.07]} />
        <meshStandardMaterial color={trim} roughness={0.55} />
      </mesh>
      <mesh position={[0, 0, 0.025]}>
        <boxGeometry args={[0.52, 0.82, 0.04]} />
        <meshStandardMaterial
          color={broken ? "#141618" : "#8aa3ae"}
          emissive={broken ? "#050608" : lit ? "#f0d78c" : "#1c2a30"}
          emissiveIntensity={broken ? 0 : lit ? 0.5 : 0.1}
          roughness={broken ? 0.92 : 0.18}
        />
      </mesh>
      <mesh position={[0, 0, 0.045]}>
        <boxGeometry args={[0.035, 0.82, 0.02]} />
        <meshStandardMaterial color={trim} />
      </mesh>
      {broken ? (
        <mesh position={[0, 0, 0.05]} rotation={[0, 0, 0.45]}>
          <boxGeometry args={[0.03, 0.8, 0.01]} />
          <meshStandardMaterial color="#0d0e10" />
        </mesh>
      ) : null}
      {shutters ? (
        <>
          <mesh position={[-0.46, 0, 0.01]} rotation={[0, 0, broken ? 0.4 : 0]}>
            <boxGeometry args={[0.2, 1.0, 0.04]} />
            <meshStandardMaterial color={shutterColor} roughness={0.75} />
          </mesh>
          <mesh position={[0.46, 0, 0.01]}>
            <boxGeometry args={[0.2, 1.0, 0.04]} />
            <meshStandardMaterial color={shutterColor} roughness={0.75} />
          </mesh>
        </>
      ) : null}
    </group>
  );
}

function NumberPlate({ n, position }: { n: string; position: [number, number, number] }) {
  const label = n.slice(0, 6);
  const tex = useMemo(() => {
    const c = document.createElement("canvas");
    c.width = 256;
    c.height = 96;
    const ctx = c.getContext("2d");
    if (!ctx) throw new Error("canvas");
    ctx.fillStyle = "#2a2722";
    ctx.fillRect(0, 0, 256, 96);
    ctx.strokeStyle = "#d4ccbc";
    ctx.lineWidth = 6;
    ctx.strokeRect(10, 10, 236, 76);
    ctx.fillStyle = "#efe8da";
    ctx.font = "600 52px 'Times New Roman', serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(label, 128, 50);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 4;
    t.needsUpdate = true;
    return t;
  }, [label]);

  useEffect(() => () => tex.dispose(), [tex]);

  const w = 0.2 + Math.min(6, label.length) * 0.075;
  return (
    <mesh position={position}>
      <planeGeometry args={[w, 0.2]} />
      <meshStandardMaterial map={tex} roughness={0.65} />
    </mesh>
  );
}

export function HouseMesh({
  spec,
  health,
}: {
  spec: HouseSpec;
  health: Record<PartId, number>;
}) {
  const group = useRef<THREE.Group>(null);
  const appear = useRef(0);
  const lastSeed = useRef(spec.seed);
  const lit = useLot((s) => s.weather < 0.42);

  const maps = useMemo(
    () => ({
      clapboard: makeClapboard(spec.palette.body),
      shingles: makeShingles(spec.palette.roof),
      stone: makeStone(spec.palette.foundation),
    }),
    [spec.palette.body, spec.palette.roof, spec.palette.foundation],
  );

  useEffect(() => {
    return () => {
      maps.clapboard.dispose();
      maps.shingles.dispose();
      maps.stone.dispose();
    };
  }, [maps]);

  useFrame((_, dt) => {
    if (lastSeed.current !== spec.seed) {
      appear.current = 0;
      lastSeed.current = spec.seed;
    }
    appear.current = Math.min(1, appear.current + Math.min(dt, 0.1) * 1.4);
    const g = group.current;
    if (!g) return;
    const t = 1 - Math.pow(1 - appear.current, 3);
    g.scale.setScalar(t);
    g.position.y = (1 - t) * -1.2;
  });

  const bodyH = spec.stories * spec.storyHeight;
  const foundH = 0.36;
  const { width: w, depth: d, palette: pal } = spec;
  const sidingTint = health.siding < 0.65 ? "#5a4a3c" : pal.body;
  const porchDrop = (1 - health.porch) * 0.45;
  const porchTilt = (1 - health.porch) * 0.1;
  const chimneyLean = (1 - health.chimney) * 0.32;
  const brokenFrac = 1 - health.windows;
  const useShutters = spec.style === "colonial" || spec.style === "cape";
  const garageW = spec.hasGarage ? 3.35 : 0;
  const garageD = d * 0.7;
  const chimneyX = spec.gableStreetFacing ? w * 0.1 : w * 0.26;
  const chimneyZ = spec.gableStreetFacing ? -d * 0.22 : -d * 0.16;
  const chimneyRun = spec.gableStreetFacing ? w / 2 - Math.abs(chimneyX) : d / 2 - Math.abs(chimneyZ);
  const chimneyRoof = Math.tan(spec.roofPitch) * Math.max(0.25, chimneyRun);
  const chimneyH = 1.65;

  const windows = useMemo(() => {
    const items: { pos: [number, number, number]; rot: [number, number, number]; i: number }[] =
      [];
    for (let s = 0; s < spec.stories; s++) {
      const y = foundH + spec.storyHeight * (s + 0.52);
      for (let c = 0; c < spec.windowCols; c++) {
        const x = -w / 2 + ((c + 0.5) / spec.windowCols) * w;
        if (s === 0 && Math.abs(x) < 0.58) continue;
        items.push({ pos: [x, y, d / 2 + 0.04], rot: [0, 0, 0], i: items.length });
      }
      for (let c = 0; c < 2; c++) {
        const z = -d / 2 + ((c + 0.5) / 2) * d;
        if (!spec.hasGarage) {
          items.push({
            pos: [w / 2 + 0.04, y, z],
            rot: [0, Math.PI / 2, 0],
            i: items.length,
          });
        }
        items.push({
          pos: [-w / 2 - 0.04, y, z],
          rot: [0, -Math.PI / 2, 0],
          i: items.length,
        });
      }
    }
    return items;
  }, [spec, w, d, foundH]);

  const corners: [number, number][] = [
    [w / 2, d / 2],
    [w / 2, -d / 2],
    [-w / 2, d / 2],
    [-w / 2, -d / 2],
  ];

  return (
    <group ref={group}>
      <mesh position={[0, foundH / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[w + 0.22, foundH, d + 0.22]} />
        <meshStandardMaterial color={pal.foundation} map={maps.stone} roughness={0.92} />
      </mesh>

      <mesh position={[0, foundH + bodyH / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[w, bodyH, d]} />
        <meshStandardMaterial color={sidingTint} map={maps.clapboard} roughness={0.82} />
      </mesh>

      {corners.map(([x, z]) => (
        <mesh key={`${x}-${z}`} position={[x, foundH + bodyH / 2, z]}>
          <boxGeometry args={[0.1, bodyH + 0.02, 0.1]} />
          <meshStandardMaterial color={pal.trim} roughness={0.55} />
        </mesh>
      ))}

      <mesh position={[0, foundH + 0.07, d / 2 + 0.02]}>
        <boxGeometry args={[w + 0.04, 0.08, 0.05]} />
        <meshStandardMaterial color={pal.trim} />
      </mesh>

      <RoofWithGables
        width={w}
        depth={d}
        y={foundH + bodyH}
        pitch={spec.roofPitch}
        roofColor={pal.roof}
        roofMap={maps.shingles}
        wallColor={sidingTint}
        wallMap={maps.clapboard}
        damage={1 - health.roof}
        streetGable={spec.gableStreetFacing}
      />

      {spec.dormers > 0
        ? Array.from({ length: spec.dormers }, (_, i) => {
            const x = spec.dormers === 1 ? 0 : -w * 0.22 + i * (w * 0.44);
            return (
              <group key={i} position={[x, foundH + bodyH, d / 2 - 0.95]}>
                <mesh position={[0, 0.38, 0.08]} castShadow>
                  <boxGeometry args={[1.05, 0.76, 1.15]} />
                  <meshStandardMaterial color={sidingTint} map={maps.clapboard} roughness={0.82} />
                </mesh>
                <group rotation={[0, Math.PI / 2, 0]}>
                  <DualPitchRoof
                    width={1.2}
                    depth={1.08}
                    y={0.76}
                    pitch={0.62}
                    color={pal.roof}
                    map={maps.shingles}
                  />
                  <GableEnds
                    width={1.2}
                    depth={1.08}
                    y={0.76}
                    pitch={0.62}
                    color={sidingTint}
                    map={maps.clapboard}
                  />
                </group>
                <WindowUnit
                  position={[0, 0.34, 0.68]}
                  broken={brokenFrac > 0.45}
                  lit={lit}
                  shutters={false}
                  shutterColor={pal.shutters}
                  trim={pal.trim}
                />
              </group>
            );
          })
        : null}

      {windows.map((win) => (
        <WindowUnit
          key={win.i}
          position={win.pos}
          rotation={win.rot}
          broken={((win.i * 17 + spec.seed) % 10) / 10 < brokenFrac}
          lit={lit && (win.i + spec.seed) % 3 !== 0}
          shutters={useShutters}
          shutterColor={pal.shutters}
          trim={pal.trim}
        />
      ))}

      <group position={[0, foundH + 1.12, d / 2 + 0.04]}>
        <mesh>
          <boxGeometry args={[1.02, 2.1, 0.09]} />
          <meshStandardMaterial color={pal.door} roughness={0.68} />
        </mesh>
        <mesh position={[0.3, 0.04, 0.055]}>
          <sphereGeometry args={[0.035, 8, 8]} />
          <meshStandardMaterial color="#c4b27a" metalness={0.55} roughness={0.35} />
        </mesh>
        <mesh position={[0, 1.16, 0]}>
          <boxGeometry args={[1.1, 0.14, 0.1]} />
          <meshStandardMaterial color={pal.trim} />
        </mesh>
      </group>

      <NumberPlate n={spec.number} position={[0.78, foundH + 1.28, d / 2 + 0.055]} />

      <mesh position={[0, foundH * 0.32, d / 2 + 0.5]} receiveShadow>
        <boxGeometry args={[1.5, 0.16, 1.0]} />
        <meshStandardMaterial color={pal.foundation} roughness={0.9} />
      </mesh>
      <mesh position={[0, foundH * 0.5, d / 2 + 0.88]} receiveShadow>
        <boxGeometry args={[1.5, 0.16, 0.5]} />
        <meshStandardMaterial color={pal.foundation} roughness={0.9} />
      </mesh>

      {spec.hasPorch ? (
        <group position={[0, -porchDrop, 0]} rotation={[0, 0, porchTilt]}>
          <mesh position={[0, foundH + 0.05, d / 2 + 1.05]} receiveShadow>
            <boxGeometry args={[spec.porchWrap ? w + 1.6 : w * 0.72, 0.08, 2.0]} />
            <meshStandardMaterial color="#6a5340" roughness={0.85} />
          </mesh>
          {spec.porchWrap
            ? [-1, 1].map((side) => (
                <mesh
                  key={`side-${side}`}
                  position={[side * (w / 2 + 0.8), foundH + 0.05, 0.1]}
                  receiveShadow
                >
                  <boxGeometry args={[1.6, 0.08, d + 0.4]} />
                  <meshStandardMaterial color="#6a5340" roughness={0.85} />
                </mesh>
              ))
            : null}
          {(spec.porchWrap
            ? ([
                [-w / 2 - 0.55, d / 2 + 1.85],
                [w / 2 + 0.55, d / 2 + 1.85],
                [-w / 2 - 0.55, 0.2],
                [w / 2 + 0.55, 0.2],
                [-w / 2 - 0.55, -d / 2 + 0.35],
                [w / 2 + 0.55, -d / 2 + 0.35],
              ] as [number, number][])
            : ([
                [-w * 0.28, d / 2 + 1.9],
                [w * 0.28, d / 2 + 1.9],
              ] as [number, number][])
          ).map(([cx, cz]) => (
            <mesh key={`${cx}-${cz}`} position={[cx, foundH + 1.12, cz]} castShadow>
              <cylinderGeometry args={[0.08, spec.style === "craftsman" ? 0.14 : 0.08, 2.1, 8]} />
              <meshStandardMaterial color={pal.trim} roughness={0.55} />
            </mesh>
          ))}
          <mesh position={[0, foundH + 2.18, d / 2 + 1.08]} rotation={[0.12, 0, 0]} castShadow>
            <boxGeometry args={[spec.porchWrap ? w + 1.7 : w * 0.78, 0.07, 2.15]} />
            <meshStandardMaterial color={pal.roof} map={maps.shingles} roughness={0.86} />
          </mesh>
          {spec.porchWrap
            ? [-1, 1].map((side) => (
                <mesh
                  key={`roof-${side}`}
                  position={[side * (w / 2 + 0.82), foundH + 2.16, 0.15]}
                  rotation={[0, 0, side * -0.12]}
                  castShadow
                >
                  <boxGeometry args={[1.7, 0.07, d + 0.5]} />
                  <meshStandardMaterial color={pal.roof} map={maps.shingles} roughness={0.86} />
                </mesh>
              ))
            : null}
          {spec.style === "craftsman"
            ? [-1, 1].map((side) => (
                <mesh
                  key={`brace-${side}`}
                  position={[side * w * 0.28, foundH + 1.82, d / 2 + 1.45]}
                  rotation={[0.55, 0, 0]}
                >
                  <boxGeometry args={[0.07, 0.07, 0.72]} />
                  <meshStandardMaterial color={pal.trim} roughness={0.55} />
                </mesh>
              ))
            : null}
        </group>
      ) : null}

      {spec.style === "victorian"
        ? Array.from({ length: 5 }, (_, i) => {
            const x = -w * 0.38 + (i * w * 0.76) / 4;
            return (
              <mesh key={`brk-${i}`} position={[x, foundH + bodyH - 0.1, d / 2 + 0.1]}>
                <boxGeometry args={[0.1, 0.22, 0.1]} />
                <meshStandardMaterial color={pal.trim} roughness={0.5} />
              </mesh>
            );
          })
        : null}

      {spec.hasChimney ? (
        <group
          position={[chimneyX, foundH + bodyH + chimneyRoof + chimneyH * 0.12, chimneyZ]}
          rotation={[0, 0, chimneyLean]}
        >
          <mesh castShadow>
            <boxGeometry args={[0.48, chimneyH, 0.58]} />
            <meshStandardMaterial color="#6a4338" map={maps.stone} roughness={0.9} />
          </mesh>
          {health.chimney > 0.35 ? (
            <mesh position={[0, chimneyH * 0.52, 0]}>
              <boxGeometry args={[0.56, 0.12, 0.66]} />
              <meshStandardMaterial color="#4d322c" />
            </mesh>
          ) : null}
        </group>
      ) : null}

      {spec.hasGarage ? (
        <group position={[w / 2 + garageW / 2 - 0.04, 0, -0.08]}>
          <mesh position={[0, foundH / 2, 0]} receiveShadow>
            <boxGeometry args={[garageW + 0.12, foundH, garageD]} />
            <meshStandardMaterial color={pal.foundation} map={maps.stone} roughness={0.92} />
          </mesh>
          <mesh position={[0, foundH + 1.2, 0]} castShadow receiveShadow>
            <boxGeometry args={[garageW, 2.4, garageD]} />
            <meshStandardMaterial color={sidingTint} map={maps.clapboard} roughness={0.82} />
          </mesh>
          <DualPitchRoof
            width={garageW}
            depth={garageD}
            y={foundH + 2.4}
            pitch={0.28}
            color={pal.roof}
            map={maps.shingles}
            damage={1 - health.garage}
          />
          <mesh
            position={[0, foundH + 1.1, garageD / 2 + 0.03]}
            rotation={[0, 0, (1 - health.garage) * 0.16]}
          >
            <boxGeometry args={[2.45, 1.95, 0.07]} />
            <meshStandardMaterial
              color={health.garage < 0.6 ? "#3a342e" : pal.trim}
              roughness={0.7}
            />
          </mesh>
          <mesh
            position={[0, 0.015, garageD / 2 + 2.6]}
            rotation={[-Math.PI / 2, 0, 0]}
            receiveShadow
          >
            <planeGeometry args={[3.0, 5.2]} />
            <meshStandardMaterial color="#4a4742" roughness={0.95} />
          </mesh>
        </group>
      ) : (
        <mesh position={[0, 0.015, d / 2 + 3.2]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
          <planeGeometry args={[1.3, 4.6]} />
          <meshStandardMaterial color="#4a4742" roughness={0.95} />
        </mesh>
      )}

      {spec.hasTurret ? (
        <group position={[w / 2 - 0.2, 0, d / 2 - 0.2]}>
          <mesh position={[0, foundH + bodyH * 0.55, 0]} castShadow>
            <cylinderGeometry args={[0.95, 1.02, bodyH * 1.08, 10]} />
            <meshStandardMaterial color={sidingTint} map={maps.clapboard} roughness={0.8} />
          </mesh>
          <mesh position={[0, foundH + bodyH * 1.18, 0]} castShadow>
            <coneGeometry args={[1.22, 1.55, 10]} />
            <meshStandardMaterial color={pal.roof} map={maps.shingles} roughness={0.85} />
          </mesh>
          <WindowUnit
            position={[0, foundH + bodyH * 0.52, 0.98]}
            broken={brokenFrac > 0.4}
            lit={lit}
            shutters={false}
            shutterColor={pal.shutters}
            trim={pal.trim}
          />
        </group>
      ) : null}

      <group position={[spec.hasGarage ? -1.1 : 1.1, 0, d / 2 + 4.4]}>
        <mesh position={[0, 0.62, 0]}>
          <cylinderGeometry args={[0.045, 0.055, 1.24, 6]} />
          <meshStandardMaterial color="#3a342e" />
        </mesh>
        <mesh position={[0.16, 1.12, 0]}>
          <boxGeometry args={[0.32, 0.24, 0.1]} />
          <meshStandardMaterial color="#4a2c24" />
        </mesh>
      </group>
    </group>
  );
}
