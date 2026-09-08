/* eslint-disable react/no-unknown-property -- react-three-fiber maps three.js
   properties such as object, position and intensity onto JSX elements. */
import { useRef, useMemo, useEffect, Suspense } from "react";
import * as THREE from "three";
import { Canvas, useFrame } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import ballUrl from "../assets/ball_compressed.glb?url";

// The GLB is Draco compressed; the decoder files are served from
// client/public/draco. Start fetching the 6.6 MB model as soon as this chunk
// loads, before the canvas mounts.
useGLTF.preload(ballUrl, "/draco/");

function Ball() {
  const spin = useRef();
  const { scene } = useGLTF(ballUrl, "/draco/");

  // Clone so this instance owns its transforms. The scene from useGLTF is shared
  // and cached, so mutating it directly drifts across remounts.
  const object = useMemo(() => scene.clone(true), [scene]);

  // Centre the model on the origin and scale it to a predictable size. Applied
  // as props, so re-running it is harmless.
  const { position, scale } = useMemo(() => {
    const box = new THREE.Box3().setFromObject(object);
    const centre = box.getCenter(new THREE.Vector3());
    const diagonal = box.getSize(new THREE.Vector3()).length();
    return { position: [-centre.x, -centre.y, -centre.z], scale: 6 / diagonal };
  }, [object]);

  // The model has no animation. Turn it slowly on the Y axis every frame.
  useFrame((_, delta) => {
    spin.current.rotation.y += delta * 0.3;
  });

  return (
    <group ref={spin} scale={scale}>
      <primitive object={object} position={position} />
    </group>
  );
}

// react-three-fiber's own unmount cleanup already loses the context. This guards
// against a second loseContext call on an already lost context.
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
      {/* The model suspends while it loads. Catching it here keeps r3f from
          bubbling the suspense out and remounting the whole canvas. */}
      <Suspense fallback={null}>
        <Ball />
      </Suspense>
      <ambientLight intensity={1.2} />
      <directionalLight position={[5, 8, 10]} intensity={2.5} />
    </Canvas>
  );
}
