"use client";

import { useMemo, useRef } from "react";
import { useGLTF } from "@react-three/drei";
import { ThreeEvent, useThree } from "@react-three/fiber";
import * as THREE from "three";

type Props = {
  id: string;
  url: string;
  position: [number, number, number];
  rotation: [number, number, number];
  scale: [number, number, number];
  selected?: boolean;
  draggable?: boolean;
  onClick?: () => void;
  onMove?: (x: number, z: number) => void;
};

export function PrimitiveAsset({
  url,
  position,
  rotation,
  scale,
  selected,
  draggable = true,
  onClick,
  onMove,
}: Props) {
  const { scene } = useGLTF(url);
  const { camera, raycaster, pointer } = useThree();

  const draggingRef = useRef(false);
  const dragPlane = useMemo(
    () => new THREE.Plane(new THREE.Vector3(0, 1, 0), 0),
    [],
  );

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

  const moveToPointer = () => {
    raycaster.setFromCamera(pointer, camera);
    const hit = new THREE.Vector3();
    raycaster.ray.intersectPlane(dragPlane, hit);
    onMove?.(hit.x, hit.z);
  };

  const handlePointerDown = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    onClick?.();
    if (draggable) {
      draggingRef.current = true;
    }
  };

  const handlePointerMove = (e: ThreeEvent<PointerEvent>) => {
    if (!draggingRef.current || !selected || !draggable) return;
    e.stopPropagation();
    moveToPointer();
  };

  const handlePointerUp = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    draggingRef.current = false;
  };

  return (
    <group
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
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
        <>
          <mesh
            position={[position[0], position[1] + 0.05, position[2]]}
            rotation={[-Math.PI / 2, 0, 0]}
          >
            <ringGeometry args={[0.7, 0.86, 40]} />
            <meshBasicMaterial color="#3b82f6" />
          </mesh>

          <mesh position={[position[0], position[1] + 1.3, position[2]]}>
            <sphereGeometry args={[0.08, 16, 16]} />
            <meshBasicMaterial color="#22c55e" />
          </mesh>
        </>
      )}
    </group>
  );
}
