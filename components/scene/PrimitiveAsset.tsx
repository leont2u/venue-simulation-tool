"use client";

import { useMemo } from "react";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";

type Props = {
  url: string;
  position: [number, number, number];
  rotation: [number, number, number];
  scale: [number, number, number];
  selected?: boolean;
  onClick?: () => void;
};

export function PrimitiveAsset({
  url,
  position,
  rotation,
  scale,
  selected,
  onClick,
}: Props) {
  const { scene } = useGLTF(url);

  const normalizedScene = useMemo(() => {
    const cloned = scene.clone(true);
    cloned.updateMatrixWorld(true);

    const box = new THREE.Box3().setFromObject(cloned);
    const center = new THREE.Vector3();

    box.getCenter(center);

    cloned.position.x -= center.x;
    cloned.position.z -= center.z;
    cloned.position.y -= box.min.y;

    cloned.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });

    const wrapper = new THREE.Group();
    wrapper.add(cloned);
    return wrapper;
  }, [scene]);

  return (
    <group
      onClick={(e) => {
        e.stopPropagation();
        onClick?.();
      }}
    >
      <primitive
        object={normalizedScene}
        position={position}
        rotation={rotation}
        scale={scale}
      />

      {selected && (
        <mesh
          position={[position[0], position[1] + 0.05, position[2]]}
          rotation={[-Math.PI / 2, 0, 0]}
        >
          <ringGeometry args={[0.55, 0.7, 32]} />
          <meshBasicMaterial color="#49d24d" />
        </mesh>
      )}
    </group>
  );
}
