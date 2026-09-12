import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { metersPerDegLon } from "@/lib/geo/project";
import type { Building } from "@/lib/geo/types";
import { useLot } from "@/lib/house/store";
import type { HouseSpec } from "@/lib/house/types";

function ringToShape(ring: { lat: number; lon: number }[], origin: { lat: number; lon: number }) {
  const mx = metersPerDegLon(origin.lat);
  const my = 110540;
  const shape = new THREE.Shape();
  ring.forEach((p, i) => {
    const x = (p.lon - origin.lon) * mx;
    const z = -(p.lat - origin.lat) * my;
    if (i === 0) shape.moveTo(x, z);
    else shape.lineTo(x, z);
  });
  shape.closePath();
  return shape;
}

export function FootprintBody({ spec }: { spec: HouseSpec }) {
  const site = useLot((s) => s.site);
  const selectedId = useLot((s) => s.selectedId);
  const health = useLot((s) => s.health);
  const building: Building | undefined =
    site?.buildings.find((b) => b.id === selectedId) ?? site?.buildings.find((b) => b.id === site.matchedId);
  const origin = building?.centroid ?? (spec.lat != null && spec.lon != null ? { lat: spec.lat, lon: spec.lon } : null);
  const geom = useMemo(() => {
    if (!building || !origin || building.ring.length < 4) return null;
    const shape = ringToShape(building.ring, origin);
    const g = new THREE.ExtrudeGeometry(shape, { depth: spec.stories * spec.storyHeight, bevelEnabled: false });
    g.rotateX(-Math.PI / 2);
    return g;
  }, [building, origin, spec.stories, spec.storyHeight]);

  useEffect(() => () => geom?.dispose(), [geom]);

  if (!geom || !building) return null;
  const roofHurt = 1 - health.roof;
  return (
    <mesh geometry={geom} position={[0, 0.02, 0]} castShadow receiveShadow>
      <meshStandardMaterial
        color={roofHurt > 0.25 ? "#5a4034" : "#c4b49a"}
        roughness={0.92}
        transparent
        opacity={0.22}
        depthWrite={false}
      />
    </mesh>
  );
}
