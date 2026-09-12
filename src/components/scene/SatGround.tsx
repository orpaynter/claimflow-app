import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { useLot } from "@/lib/house/store";

export function SatGround() {
  const satUrl = useLot((s) => s.satUrl);
  const tex = useMemo(() => {
    if (!satUrl) return null;
    const t = new THREE.TextureLoader().load(satUrl);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 8;
    t.needsUpdate = true;
    return t;
  }, [satUrl]);

  useEffect(() => () => tex?.dispose(), [tex]);

  if (!tex) {
    return (
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]} receiveShadow>
        <planeGeometry args={[80, 80]} />
        <meshStandardMaterial color="#2a3328" roughness={1} />
      </mesh>
    );
  }

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]} receiveShadow>
      <planeGeometry args={[84, 84]} />
      <meshStandardMaterial map={tex} roughness={0.95} metalness={0} />
    </mesh>
  );
}
