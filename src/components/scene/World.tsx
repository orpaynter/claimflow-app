import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { ContactShadows, OrbitControls } from "@react-three/drei";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { setWeatherAudio, thunder } from "@/lib/audio";
import { partAnchor } from "@/lib/house/anchors";
import { useLot } from "@/lib/house/store";
import { DamageMarks } from "./DamageMarks";
import { FootprintBody } from "./FootprintBody";
import { HouseMesh } from "./HouseMesh";
import { Lot } from "./Lot";
import { SatGround } from "./SatGround";
import { Rain } from "./Weather";

const clearSky = new THREE.Color("#8ea6b4");
const stormSky = new THREE.Color("#1a2026");
const flashSky = new THREE.Color("#d5e0ea");
const skyNow = new THREE.Color();

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const onChange = () => setReduced(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  return reduced;
}

function Atmosphere() {
  const { scene } = useThree();
  const weather = useLot((s) => s.weather);
  const lightning = useLot((s) => s.lightning);
  const phase = useLot((s) => s.phase);
  const fog = useMemo(() => new THREE.Fog(stormSky, 28, 90), []);
  const inspect = phase === "measure" || phase === "survey" || phase === "restored";

  useFrame(() => {
    const w = inspect ? 0.04 : weather;
    skyNow.copy(clearSky).lerp(stormSky, w);
    if (lightning > 0.15) skyNow.lerp(flashSky, lightning * 0.7);
    scene.background = skyNow;
    fog.color.copy(skyNow);
    fog.near = inspect ? 40 : 18 - w * 4;
    fog.far = inspect ? 110 : 70 - w * 10;
    scene.fog = inspect ? null : fog;
  });
  return null;
}

function Lights() {
  const dir = useRef<THREE.DirectionalLight>(null);
  const amb = useRef<THREE.AmbientLight>(null);
  const weather = useLot((s) => s.weather);
  const lightning = useLot((s) => s.lightning);
  const phase = useLot((s) => s.phase);
  const inspect = phase === "measure" || phase === "survey" || phase === "restored";

  useFrame(() => {
    const w = inspect ? 0.04 : weather;
    if (dir.current) {
      dir.current.intensity = inspect ? 1.55 : 1.35 - w * 1.1 + lightning * 1.6;
      dir.current.position.set(10, inspect ? 18 : 15 - w * 8, 9);
      dir.current.color.set(lightning > 0.2 ? "#eef3f7" : "#f4f1e6");
    }
    if (amb.current) amb.current.intensity = inspect ? 0.55 : 0.22 + w * 0.07 + lightning * 1.0;
  });

  return (
    <>
      <hemisphereLight args={["#d7e4ee", "#4a5340", 0.72]} />
      <ambientLight ref={amb} intensity={0.4} />
      <directionalLight
        ref={dir}
        castShadow
        position={[10, 18, 9]}
        intensity={1.5}
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        shadow-camera-far={50}
        shadow-camera-left={-18}
        shadow-camera-right={18}
        shadow-camera-top={18}
        shadow-camera-bottom={-18}
        shadow-bias={-0.0003}
      />
    </>
  );
}

function Directors() {
  const tickStorm = useLot((s) => s.tickStorm);
  const tickRepair = useLot((s) => s.tickRepair);
  const lightning = useLot((s) => s.lightning);
  const weather = useLot((s) => s.weather);
  const lastBoom = useRef(0);

  const tickScan = useLot((s) => s.tickScan);
  useFrame((_, dt) => {
    const d = Math.min(dt, 0.1);
    tickStorm(d);
    tickRepair(d);
    tickScan(d);
    setWeatherAudio(weather);
    if (lightning > 0.9 && lastBoom.current <= 0) {
      thunder();
      lastBoom.current = 0.8;
    }
    lastBoom.current = Math.max(0, lastBoom.current - d);
  });
  return null;
}

function Shake({ children }: { children: React.ReactNode }) {
  const ref = useRef<THREE.Group>(null);
  const shake = useLot((s) => s.shake);
  useFrame(() => {
    const g = ref.current;
    if (!g) return;
    if (shake < 0.02) {
      g.position.set(0, 0, 0);
      return;
    }
    g.position.set(
      (Math.random() - 0.5) * shake * 0.12,
      (Math.random() - 0.5) * shake * 0.08,
      (Math.random() - 0.5) * shake * 0.12,
    );
  });
  return <group ref={ref}>{children}</group>;
}

function LotWrapper() {
  const spec = useLot((s) => s.spec);
  const treeHealth = useLot((s) => s.health.trees);
  const fenceHealth = useLot((s) => s.health.fence);
  const weather = useLot((s) => s.weather);
  return (
    <Lot spec={spec} treeHealth={treeHealth} fenceHealth={fenceHealth} weather={weather} />
  );
}

const _desired = new THREE.Vector3();
const _dir = new THREE.Vector3();

function Inspector() {
  const controls = useRef<{ target: THREE.Vector3; object: THREE.Camera }>(null);
  const spec = useLot((s) => s.spec);
  const focusPart = useLot((s) => s.focusPart);
  const phase = useLot((s) => s.phase);
  const reduced = usePrefersReducedMotion();
  const storm = phase === "storm";
  const calm = (phase === "survey" || phase === "restored") && !reduced && !storm;

  useFrame((_, dt) => {
    const c = controls.current;
    if (!c || !spec) return;
    const a = partAnchor(spec, storm ? focusPart : null);
    _desired.set(a.x, storm ? a.y : 1.6, a.z);
    const k = 1 - Math.pow(0.12, Math.min(dt, 0.1) * 60);
    c.target.lerp(_desired, k);
    const cam = c.object;
    _dir.subVectors(cam.position, c.target);
    const len = Math.max(0.05, _dir.length());
    const want = storm ? Math.max(7.2, a.dist + 4.4) : 13.4;
    _dir.multiplyScalar((len + (want - len) * k) / len);
    cam.position.copy(c.target).add(_dir);
  });

  return (
    <OrbitControls
      ref={controls as never}
      makeDefault
      enablePan
      minPolarAngle={0.28}
      maxPolarAngle={Math.PI / 2 - 0.12}
      minDistance={6}
      maxDistance={32}
      target={[0, 1.6, 0.15]}
      enableDamping
      dampingFactor={0.08}
      autoRotate={calm}
      autoRotateSpeed={0.28}
      zoomSpeed={0.95}
    />
  );
}

function SceneBody() {
  const spec = useLot((s) => s.spec);
  const health = useLot((s) => s.health);

  return (
    <>
      <Atmosphere />
      <Lights />
      <Directors />
      <Rain />
      <SatGround />
      <LotWrapper />
      {spec ? <FootprintBody spec={spec} /> : null}
      <Shake>{spec ? <HouseMesh spec={spec} health={health} /> : null}</Shake>
      {spec ? <DamageMarks spec={spec} /> : null}
      <ContactShadows position={[0, 0.02, 0]} opacity={0.22} scale={36} blur={2.4} far={8} />
      <Inspector />
    </>
  );
}

export function World() {
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);
  if (!ready) return <div className="absolute inset-0 bg-bg" />;

  return (
    <Canvas
      className="absolute inset-0 touch-none"
      shadows
      dpr={[1, 1.6]}
      camera={{ position: [9.2, 7.4, 12.6], fov: 38, near: 0.1, far: 160 }}
      gl={{ antialias: true, alpha: false, powerPreference: "high-performance" }}
      onCreated={({ gl }) => {
        gl.shadowMap.enabled = true;
        gl.shadowMap.type = THREE.PCFShadowMap;
      }}
    >
      <SceneBody />
    </Canvas>
  );
}
