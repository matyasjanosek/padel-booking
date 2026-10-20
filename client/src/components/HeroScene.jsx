import { useRef, useMemo, useEffect, Suspense } from "react";
import * as THREE from "three";
import { Canvas, useFrame } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import ballUrl from "../assets/ball_optimized.glb?url";

useGLTF.preload(ballUrl, "/draco/");

function Ball() {
  const spin = useRef();
  const { scene } = useGLTF(ballUrl, "/draco/");

  const object = useMemo(() => scene.clone(true), [scene]);

  const { position, scale } = useMemo(() => {
    const box = new THREE.Box3().setFromObject(object);
    const centre = box.getCenter(new THREE.Vector3());
    const diagonal = box.getSize(new THREE.Vector3()).length();
    return { position: [-centre.x, -centre.y, -centre.z], scale: 6 / diagonal };
  }, [object]);

  useFrame((_, delta) => {
    spin.current.rotation.y += delta * 0.3;
  });

  return (
    <group ref={spin} scale={scale}>
      <primitive object={object} position={position} />
    </group>
  );
}

function releaseRenderer(gl) {
  if (!gl.getContext().isContextLost()) gl.forceContextLoss();
  gl.dispose();
}

export default function HeroScene() {
  const renderer = useRef(null);

  useEffect(() => {
    return () => {
      if (renderer.current) {
        releaseRenderer(renderer.current);
        renderer.current = null;
      }
    };
  }, []);

  return (
    <Canvas
      camera={{ position: [0, 0, 9], fov: 40 }}
      dpr={[1, 1.5]}
      onCreated={({ gl }) => {
        renderer.current = gl;
      }}
    >
      {/* The model suspends while it loads. */}
      <Suspense fallback={null}>
        <Ball />
      </Suspense>
      {/* Lit like a single floodlight at night, not an evenly lit product
          shot */}
      <ambientLight intensity={0.28} />
      <directionalLight position={[4, 9, 6]} intensity={3.4} />
      <directionalLight position={[-6, -2, -4]} intensity={0.7} color="#a6e22e" />
    </Canvas>
  );
}
