import { Canvas, useThree } from "@react-three/fiber";
import { Html, Line, MapControls } from "@react-three/drei";
import { useLayoutEffect, useMemo } from "react";
import * as THREE from "three";
import { layoutCity, NODE_COLOR, ZONE_COLOR, project, type CityLot, type CityNode } from "@/lib/city/layout";
import { useLot } from "@/lib/house/store";

const GROUND = "#1e221c";
const SKY = "#243038";

function shapeOf(points: [number, number][]): THREE.Shape | null {
  if (points.length < 4) return null;
  const s = new THREE.Shape();
  s.moveTo(points[0]![0], -points[0]![1]);
  for (let i = 1; i < points.length; i++) s.lineTo(points[i]![0], -points[i]![1]);
  s.closePath();
  return s;
}

function LotMesh({
  lot,
  selected,
  onPick,
}: {
  lot: CityLot;
  selected: boolean;
  onPick: (id: string) => void;
}) {
  const geom = useMemo(() => {
    const shape = shapeOf(lot.points);
    if (!shape) return null;
    const g = new THREE.ExtrudeGeometry(shape, {
      depth: lot.height,
      bevelEnabled: false,
      steps: 1,
    });
    g.rotateX(-Math.PI / 2);
    g.computeVertexNormals();
    return g;
  }, [lot.points, lot.height]);

  const color = selected ? "#f7f4ec" : lot.hit >= 2 ? "#b85c4a" : lot.hit === 1 ? "#9a7a6a" : ZONE_COLOR[lot.zone];

  if (!geom) return null;
  return (
    <mesh
      geometry={geom}
      castShadow
      receiveShadow
      onClick={(e) => {
        e.stopPropagation();
        if (lot.enterable) onPick(lot.id);
      }}
      onPointerOver={() => {
        document.body.style.cursor = lot.enterable ? "pointer" : "default";
      }}
      onPointerOut={() => {
        document.body.style.cursor = "default";
      }}
    >
      <meshStandardMaterial
        color={color}
        roughness={0.82}
        metalness={0.04}
        side={THREE.DoubleSide}
        emissive={selected ? "#d7ddd4" : lot.hit >= 2 ? "#4a221c" : "#000000"}
        emissiveIntensity={selected ? 0.22 : lot.hit >= 2 ? 0.18 : 0}
      />
      {selected ? (
        <Html position={[lot.cx, lot.height + 4, lot.cz]} center distanceFactor={420} occlude={false}>
          <div className="rounded-sm bg-fg px-1.5 py-0.5 font-mono text-[10px] tracking-wide text-accent-fg whitespace-nowrap">
            {lot.label} · {lot.zone}
          </div>
        </Html>
      ) : null}
    </mesh>
  );
}

function NodeMesh({ node }: { node: CityNode }) {
  const h = node.kind === "supplier" ? 16 : node.kind === "contractor" ? 12 : 10;
  const w = node.kind === "supplier" ? 28 : 18;
  const color = NODE_COLOR[node.kind];
  const tag = node.kind === "supplier" ? "I" : node.kind === "contractor" ? "C" : "C";
  return (
    <group position={[node.x, 0, node.z]}>
      <mesh position={[0, 0.4, 0]} receiveShadow>
        <boxGeometry args={[w + 10, 0.8, w + 8]} />
        <meshStandardMaterial color={color} roughness={0.9} />
      </mesh>
      <mesh position={[0, h / 2 + 0.8, 0]} castShadow>
        <boxGeometry args={[w, h, w * 0.7]} />
        <meshStandardMaterial color={color} roughness={0.55} metalness={0.08} />
      </mesh>
      <Html position={[0, h + 8, 0]} center distanceFactor={480} occlude={false}>
        <div className="rounded-sm bg-surface/90 px-1.5 py-0.5 font-mono text-[10px] tracking-wide text-fg whitespace-nowrap shadow-border">
          {tag} · {node.name}
        </div>
      </Html>
    </group>
  );
}

function Links({ origin, nodes }: { origin: { x: number; z: number; y: number }; nodes: CityNode[] }) {
  const lines = useMemo(() => {
    return nodes.map((n) => {
      const start = new THREE.Vector3(origin.x, origin.y, origin.z);
      const end = new THREE.Vector3(n.x, n.kind === "supplier" ? 16 : 12, n.z);
      const mid = start.clone().lerp(end, 0.5);
      mid.y += 28;
      const curve = new THREE.QuadraticBezierCurve3(start, mid, end);
      return { id: n.id, pts: curve.getPoints(18), color: NODE_COLOR[n.kind] };
    });
  }, [origin.x, origin.y, origin.z, nodes]);
  return (
    <>
      {lines.map((l) => (
        <Line key={l.id} points={l.pts.map((p) => [p.x, p.y, p.z] as [number, number, number])} color={l.color} lineWidth={1.6} />
      ))}
    </>
  );
}

function Roads({ roads }: { roads: { id: string; points: [number, number][]; named: boolean }[] }) {
  return (
    <>
      {roads.map((r) => {
        if (r.points.length < 2) return null;
        return (
          <Line
            key={r.id}
            points={r.points.map((p) => [p[0], 0.35, p[1]] as [number, number, number])}
            color={r.named ? "#e8e4d9" : "#6f6b62"}
            lineWidth={r.named ? 1.4 : 0.8}
            transparent
            opacity={r.named ? 0.55 : 0.28}
          />
        );
      })}
    </>
  );
}

function HailCell({
  lat,
  lon,
  oLat,
  oLon,
  radiusM,
}: {
  lat: number;
  lon: number;
  oLat: number;
  oLon: number;
  radiusM: number;
}) {
  const [x, z] = project(lat, lon, oLat, oLon);
  return (
    <group position={[x, 0, z]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[radiusM, 48]} />
        <meshBasicMaterial color="#b85c4a" transparent opacity={0.16} depthWrite={false} />
      </mesh>
      <mesh>
        <cylinderGeometry args={[radiusM * 0.28, radiusM * 0.28, 36, 28, 1, true]} />
        <meshBasicMaterial color="#f7f4ec" transparent opacity={0.22} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>
      <mesh>
        <cylinderGeometry args={[radiusM * 0.62, radiusM * 0.62, 22, 28, 1, true]} />
        <meshBasicMaterial color="#b85c4a" transparent opacity={0.18} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>
    </group>
  );
}

function Rig({ radius }: { radius: number }) {
  const { camera } = useThree();
  useLayoutEffect(() => {
    const r = Math.max(220, radius);
    camera.position.set(r * 0.85, r * 0.62, r * 0.85);
    camera.lookAt(0, 0, 0);
    camera.updateProjectionMatrix();
  }, [camera, radius]);
  return (
    <MapControls
      enableDamping
      dampingFactor={0.12}
      minDistance={90}
      maxDistance={Math.max(900, radius * 3.2)}
      maxPolarAngle={Math.PI / 2.12}
      minPolarAngle={0.22}
      target={[0, 0, 0]}
    />
  );
}

function CityScene() {
  const site = useLot((s) => s.site);
  const selectedId = useLot((s) => s.selectedId);
  const pickBuilding = useLot((s) => s.pickBuilding);
  const hailCenter = useLot((s) => s.hailCenter);
  const layout = useMemo(() => (site ? layoutCity(site) : null), [site]);
  const selected = layout?.lots.find((l) => l.id === selectedId) ?? layout?.lots.find((l) => l.enterable);

  if (!site || !layout) return null;

  return (
    <>
      <color attach="background" args={[SKY]} />
      <fog attach="fog" args={[SKY, layout.radius * 1.2, layout.radius * 4.2]} />
      <hemisphereLight args={["#d2dbe0", "#3a4034", 0.85]} />
      <ambientLight intensity={0.42} />
      <directionalLight
        position={[layout.radius * 0.4, layout.radius * 0.8, layout.radius * 0.2]}
        intensity={1.35}
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        shadow-camera-far={layout.radius * 3}
        shadow-camera-left={-layout.radius}
        shadow-camera-right={layout.radius}
        shadow-camera-top={layout.radius}
        shadow-camera-bottom={-layout.radius}
        shadow-bias={-0.0002}
      />
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[layout.radius * 6, layout.radius * 6]} />
        <meshStandardMaterial color={GROUND} roughness={1} />
      </mesh>
      <gridHelper args={[layout.radius * 4, 32, "#2c322c", "#1e221c"]} position={[0, 0.05, 0]} />
      <Roads roads={layout.roads} />
      {layout.lots.map((lot) => (
        <LotMesh key={lot.id} lot={lot} selected={lot.id === selectedId} onPick={pickBuilding} />
      ))}
      {layout.nodes.map((n) => (
        <NodeMesh key={n.id} node={n} />
      ))}
      {selected ? (
        <Links origin={{ x: selected.cx, z: selected.cz, y: selected.height + 2 }} nodes={layout.nodes} />
      ) : null}
      {hailCenter ? (
        <HailCell
          lat={hailCenter.lat}
          lon={hailCenter.lon}
          oLat={site.place.lat}
          oLon={site.place.lon}
          radiusM={site.hail.radiusM}
        />
      ) : null}
      <Rig radius={layout.radius} />
    </>
  );
}

export default function CityView() {
  return (
    <div className="absolute inset-0 z-0 h-full w-full bg-bg">
      <Canvas
        shadows
        dpr={[1, 1.5]}
        camera={{ fov: 42, near: 2, far: 9000, position: [420, 300, 420] }}
        gl={{ antialias: true, alpha: false }}
        onPointerMissed={() => {
          document.body.style.cursor = "default";
        }}
      >
        <CityScene />
      </Canvas>
    </div>
  );
}
