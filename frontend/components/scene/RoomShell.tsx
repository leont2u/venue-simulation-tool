"use client";

export function RoomShell({ width, depth }: { width: number; depth: number }) {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
      <planeGeometry args={[width, depth]} />
      <meshStandardMaterial color="#e8ece4" roughness={0.92} metalness={0.02} />
    </mesh>
  );
}
