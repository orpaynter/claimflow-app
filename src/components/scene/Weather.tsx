import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useLot } from "@/lib/house/store";

const RAIN = 520;

export function Rain() {
  const mesh = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const weather = useLot((s) => s.weather);
  const phase = useLot((s) => s.phase);
  const state = useMemo(() => {
    const pos = new Float32Array(RAIN * 3);
    const vel = new Float32Array(RAIN);
    for (let i = 0; i < RAIN; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 36;
      pos[i * 3 + 1] = Math.random() * 20;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 36;
      vel[i] = 13 + Math.random() * 9;
    }
    return { pos, vel };
  }, []);

  useFrame((_, dt) => {
    const m = mesh.current;
    if (!m) return;
    const d = Math.min(dt, 0.1);
    if (weather < 0.1 || phase === "measure" || phase === "survey") {
      m.visible = false;
      return;
    }
    m.visible = true;
    const { pos, vel } = state;
    for (let i = 0; i < RAIN; i++) {
      pos[i * 3 + 1] -= vel[i] * d * (0.55 + weather);
      pos[i * 3] += d * 5 * weather;
      if (pos[i * 3 + 1] < 0) {
        pos[i * 3 + 1] = 14 + Math.random() * 7;
        pos[i * 3] = (Math.random() - 0.5) * 36;
        pos[i * 3 + 2] = (Math.random() - 0.5) * 36;
      }
      dummy.position.set(pos[i * 3], pos[i * 3 + 1], pos[i * 3 + 2]);
      dummy.scale.set(0.022, 0.4 + weather * 0.32, 0.022);
      dummy.rotation.z = -0.32 * weather;
      dummy.updateMatrix();
      m.setMatrixAt(i, dummy.matrix);
    }
    m.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={mesh} args={[undefined, undefined, RAIN]} frustumCulled={false}>
      <boxGeometry args={[1, 1, 1]} />
      <meshBasicMaterial color="#c9d4dc" transparent opacity={0.38} />
    </instancedMesh>
  );
}
