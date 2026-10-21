"use client";

import { Canvas } from "@react-three/fiber";
import { ContactShadows, Environment, Float, Lightformer, OrbitControls } from "@react-three/drei";
import { Cpu, Gpu, Laptop, Printer, Ssd } from "./models";

const MODELS = {
  laptop: <Laptop scale={1.15} position={[0, -0.9, 0]} />,
  gpu: <Gpu scale={1.2} rotation={[0.3, 0, 0]} />,
  ssd: <Ssd scale={1.8} rotation={[0.4, 0, 0]} />,
  printer: <Printer scale={1.2} position={[0, -0.2, 0]} />,
  cpu: <Cpu scale={2.6} rotation={[0.6, 0, 0]} />,
} as const;

export default function ShowcaseScene({ model }: { model: keyof typeof MODELS }) {
  return (
    <Canvas dpr={[1, 1.5]} camera={{ position: [0, 1.2, 6.5], fov: 38 }} gl={{ antialias: true, alpha: true }} aria-hidden="true">
      <ambientLight intensity={0.5} />
      <directionalLight position={[4, 6, 4]} intensity={1.8} />
      <pointLight position={[-5, 2, 3]} intensity={70} color="#8b5cf6" />
      <pointLight position={[5, -2, 3]} intensity={50} color="#22d3ee" />
      <Environment resolution={128} frames={1}>
        <Lightformer form="rect" intensity={2} position={[0, 5, -8]} scale={[12, 4, 1]} color="#9db7ff" />
        <Lightformer form="rect" intensity={1.2} position={[-8, 1, 2]} rotation-y={Math.PI / 2} scale={[8, 3, 1]} color="#a78bfa" />
      </Environment>
      <Float speed={1.2} rotationIntensity={0.15} floatIntensity={0.5}>{MODELS[model]}</Float>
      <ContactShadows position={[0, -1.7, 0]} opacity={0.45} scale={10} blur={2.6} far={4} />
      <OrbitControls enablePan={false} minDistance={4} maxDistance={10} autoRotate autoRotateSpeed={0.9} makeDefault />
    </Canvas>
  );
}
