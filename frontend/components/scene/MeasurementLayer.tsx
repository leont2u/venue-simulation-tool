"use client";

import { Line, Text } from "@react-three/drei";
import { MeasurementLine } from "@/types/types";

function distance(startX: number, startZ: number, endX: number, endZ: number) {
  const dx = endX - startX;
  const dz = endZ - startZ;
  return Math.sqrt(dx * dx + dz * dz);
}

export function MeasurementLayer({
  measurements,
}: {
  measurements: MeasurementLine[];
}) {
  return (
    <>
      {measurements.map((m) => {
        const midX = (m.startX + m.endX) / 2;
        const midZ = (m.startZ + m.endZ) / 2;
        const length = distance(m.startX, m.startZ, m.endX, m.endZ);

        return (
          <group key={m.id}>
            <Line
              points={[
                [m.startX, 0.03, m.startZ],
                [m.endX, 0.03, m.endZ],
              ]}
              color="white"
              lineWidth={2}
            />

            <mesh position={[m.startX, 0.03, m.startZ]}>
              <sphereGeometry args={[0.08, 12, 12]} />
              <meshBasicMaterial color="#49d24d" />
            </mesh>

            <mesh position={[m.endX, 0.03, m.endZ]}>
              <sphereGeometry args={[0.08, 12, 12]} />
              <meshBasicMaterial color="#49d24d" />
            </mesh>

            <Text
              position={[midX, 0.35, midZ]}
              fontSize={0.28}
              color="white"
              anchorX="center"
              anchorY="middle"
              outlineWidth={0.015}
              outlineColor="black"
            >
              {m.text || `${length.toFixed(1)}m`}
            </Text>
          </group>
        );
      })}
    </>
  );
}
