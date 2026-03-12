"use client";

export function RoomShell({
  width,
  depth,
}: {
  width: number;
  depth: number;
  height: number;
}) {
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[width, depth]} />
        <meshStandardMaterial color="#e5e7eb" />
      </mesh>
    </group>
  );
}
