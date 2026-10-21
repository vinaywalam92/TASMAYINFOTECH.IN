"use client";

import { useRef, type RefObject } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { AdaptiveDpr, Environment, Float, Lightformer, Sparkles } from "@react-three/drei";
import type * as THREE from "three";
import { Cpu, Gpu, Laptop, Printer, Ssd } from "./models";

/** Floating hardware showroom. Reacts to the pointer (anywhere over the hero) and to page scroll. */
function Rig() {
  const group = useRef<THREE.Group>(null);
  const { viewport } = useThree();
  // On wide screens push the scene right so the headline on the left stays readable.
  const shiftX = viewport.width > 11 ? 1.9 : 0;

  useFrame((state, dt) => {
    const g = group.current;
    if (!g) return;
    const k = 1 - Math.pow(0.001, dt); // frame-rate independent smoothing
    const scroll = typeof window === "undefined" ? 0 : Math.min(window.scrollY, 900);
    g.rotation.y += (state.pointer.x * 0.28 - g.rotation.y) * k;
    g.rotation.x += (-state.pointer.y * 0.14 - g.rotation.x) * k;
    g.position.x += (shiftX + state.pointer.x * 0.25 - g.position.x) * k;
    g.position.y += (scroll * 0.0042 - g.position.y) * k;
  });

  return (
    <group ref={group}>
      <Float speed={1.1} rotationIntensity={0.35} floatIntensity={0.7}>
        <Laptop position={[0.9, -0.55, 0]} rotation={[0.12, -0.5, 0]} scale={1.05} />
      </Float>
      <Float speed={1.4} rotationIntensity={0.6} floatIntensity={1}>
        <Gpu position={[-2.7, 1.3, -1.4]} rotation={[0.35, 0.65, 0.12]} scale={0.78} />
      </Float>
      <Float speed={1.6} rotationIntensity={0.8} floatIntensity={1.1}>
        <Ssd position={[-1.5, -1.9, 1.3]} rotation={[0.5, 0.45, 0.2]} scale={0.8} />
      </Float>
      <Float speed={1.0} rotationIntensity={0.5} floatIntensity={0.8}>
        <Printer position={[4.1, 1.7, -2.6]} rotation={[0.2, -0.9, 0]} scale={0.62} />
      </Float>
      <Float speed={1.8} rotationIntensity={1} floatIntensity={1.2}>
        <Cpu position={[3.4, -2.1, 0.9]} rotation={[0.9, 0.3, 0.5]} scale={0.9} />
      </Float>
      <Sparkles count={70} scale={[16, 9, 8]} size={2.2} speed={0.35} opacity={0.7} color="#7aa2ff" />
    </group>
  );
}

export default function HeroScene3D({ active, eventSource }: { active: boolean; eventSource: RefObject<HTMLElement | null> }) {
  return (
    <Canvas
      dpr={[1, 1.6]}
      camera={{ position: [0, 0.6, 9.5], fov: 38 }}
      gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
      // Pause the render loop while the hero is off-screen: no wasted CPU/GPU/battery.
      frameloop={active ? "always" : "never"}
      performance={{ min: 0.5 }}
      eventSource={eventSource as RefObject<HTMLElement>}
      eventPrefix="client"
      aria-hidden="true"
      onCreated={({ gl }) => gl.setClearColor(0x000000, 0)}
    >
      <ambientLight intensity={0.4} />
      <directionalLight position={[5, 6, 5]} intensity={1.8} color="#d6e4ff" />
      <pointLight position={[-6, 2, 3]} intensity={90} color="#8b5cf6" />
      <pointLight position={[6, -3, 4]} intensity={70} color="#22d3ee" />
      {/* Studio reflections generated in-scene (no HDR download) */}
      <Environment resolution={256} frames={1}>
        <Lightformer form="rect" intensity={2.2} position={[0, 5, -9]} scale={[12, 4, 1]} color="#9db7ff" />
        <Lightformer form="rect" intensity={1.4} position={[-8, 1, 2]} rotation-y={Math.PI / 2} scale={[8, 3, 1]} color="#a78bfa" />
        <Lightformer form="ring" intensity={1.6} position={[6, 2, -2]} scale={4} color="#67e8f9" />
      </Environment>
      <Rig />
      <AdaptiveDpr pixelated />
    </Canvas>
  );
}
