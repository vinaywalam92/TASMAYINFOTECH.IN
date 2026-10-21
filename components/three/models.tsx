"use client";

import { useRef } from "react";
import { useFrame, type ThreeElements } from "@react-three/fiber";
import { RoundedBox } from "@react-three/drei";
import type * as THREE from "three";

/**
 * Procedural hardware models built from primitives, so the 3D scenes need no downloaded assets
 * (fast first paint, no CORS/CSP surprises). They are stylised stand-ins, not scans of real products.
 */
type G = ThreeElements["group"];

const dark = { color: "#151927", metalness: 0.85, roughness: 0.3 } as const;

export function Laptop(props: G) {
  return (
    <group {...props}>
      <RoundedBox args={[3.2, 0.14, 2.2]} radius={0.06} smoothness={4}>
        <meshStandardMaterial {...dark} />
      </RoundedBox>
      <mesh position={[0, 0.076, -0.15]}>
        <boxGeometry args={[2.85, 0.012, 1.15]} />
        <meshStandardMaterial color="#0a0c15" roughness={0.6} />
      </mesh>
      {Array.from({ length: 4 }).map((_, r) => (
        <mesh key={r} position={[0, 0.086, -0.5 + r * 0.26]}>
          <boxGeometry args={[2.6, 0.008, 0.14]} />
          <meshStandardMaterial color="#1e2540" emissive="#3b6bff" emissiveIntensity={0.25} />
        </mesh>
      ))}
      <mesh position={[0, 0.076, 0.72]}>
        <boxGeometry args={[0.95, 0.012, 0.5]} />
        <meshStandardMaterial color="#222842" metalness={0.5} roughness={0.35} />
      </mesh>
      {/* lid, hinged at the back edge and leaning back */}
      <group position={[0, 0.07, -1.05]} rotation={[-0.2, 0, 0]}>
        <RoundedBox args={[3.2, 2.1, 0.08]} radius={0.05} smoothness={4} position={[0, 1.05, 0]}>
          <meshStandardMaterial {...dark} />
        </RoundedBox>
        <mesh position={[0, 1.05, 0.046]}>
          <planeGeometry args={[3.0, 1.9]} />
          <meshStandardMaterial color="#070b1f" emissive="#2f5bff" emissiveIntensity={0.85} />
        </mesh>
        <mesh position={[-0.55, 1.35, 0.05]}>
          <planeGeometry args={[1.4, 0.12]} />
          <meshBasicMaterial color="#a78bfa" />
        </mesh>
        <mesh position={[-0.7, 1.12, 0.05]}>
          <planeGeometry args={[1.1, 0.1]} />
          <meshBasicMaterial color="#67e8f9" />
        </mesh>
        <mesh position={[0.45, 0.8, 0.05]}>
          <planeGeometry args={[1.5, 0.55]} />
          <meshBasicMaterial color="#1d3a9a" />
        </mesh>
      </group>
    </group>
  );
}

function Fan({ position }: { position: [number, number, number] }) {
  const ref = useRef<THREE.Group>(null);
  useFrame((_, dt) => {
    if (ref.current) ref.current.rotation.y += dt * 4;
  });
  return (
    <group position={position}>
      <mesh>
        <torusGeometry args={[0.47, 0.03, 12, 48]} />
        <meshStandardMaterial color="#22d3ee" emissive="#22d3ee" emissiveIntensity={1.2} />
      </mesh>
      <group ref={ref}>
        <mesh>
          <cylinderGeometry args={[0.13, 0.13, 0.06, 24]} />
          <meshStandardMaterial color="#0b0d16" metalness={0.9} roughness={0.25} />
        </mesh>
        {Array.from({ length: 9 }).map((_, i) => (
          <mesh key={i} rotation={[0.35, (i / 9) * Math.PI * 2, 0]} position={[Math.cos((i / 9) * Math.PI * 2) * 0.28, 0, -Math.sin((i / 9) * Math.PI * 2) * 0.28]}>
            <boxGeometry args={[0.3, 0.014, 0.13]} />
            <meshStandardMaterial color="#232a45" metalness={0.6} roughness={0.4} />
          </mesh>
        ))}
      </group>
    </group>
  );
}

export function Gpu(props: G) {
  return (
    <group {...props}>
      <RoundedBox args={[3.5, 0.55, 1.4]} radius={0.06} smoothness={4}>
        <meshStandardMaterial {...dark} />
      </RoundedBox>
      <mesh position={[0, 0.278, 0]}>
        <boxGeometry args={[3.3, 0.01, 1.2]} />
        <meshStandardMaterial color="#1a2036" metalness={0.7} roughness={0.35} />
      </mesh>
      <Fan position={[-0.85, 0.32, 0]} />
      <Fan position={[0.85, 0.32, 0]} />
      <mesh position={[0, 0.2, 0.71]}>
        <boxGeometry args={[3.0, 0.05, 0.03]} />
        <meshStandardMaterial color="#8b5cf6" emissive="#8b5cf6" emissiveIntensity={1.6} />
      </mesh>
      <mesh position={[-1.78, -0.1, 0]}>
        <boxGeometry args={[0.05, 0.95, 1.25]} />
        <meshStandardMaterial color="#9aa3bd" metalness={1} roughness={0.25} />
      </mesh>
      <mesh position={[0.2, -0.33, 0]}>
        <boxGeometry args={[1.7, 0.08, 0.1]} />
        <meshStandardMaterial color="#d4af37" metalness={1} roughness={0.3} />
      </mesh>
    </group>
  );
}

export function Ssd(props: G) {
  return (
    <group {...props}>
      <RoundedBox args={[1.9, 0.17, 1.2]} radius={0.05} smoothness={4}>
        <meshStandardMaterial color="#1b2036" metalness={0.9} roughness={0.28} />
      </RoundedBox>
      <mesh position={[0, 0.09, -0.05]}>
        <boxGeometry args={[1.6, 0.008, 0.85]} />
        <meshStandardMaterial color="#222a4a" emissive="#2f5bff" emissiveIntensity={0.35} />
      </mesh>
      <mesh position={[-0.3, 0.1, -0.05]}>
        <boxGeometry args={[0.7, 0.01, 0.1]} />
        <meshBasicMaterial color="#22d3ee" />
      </mesh>
      <mesh position={[-0.3, 0.1, 0.12]}>
        <boxGeometry args={[0.45, 0.01, 0.08]} />
        <meshBasicMaterial color="#a78bfa" />
      </mesh>
      <mesh position={[0, -0.02, 0.66]}>
        <boxGeometry args={[0.9, 0.06, 0.14]} />
        <meshStandardMaterial color="#d4af37" metalness={1} roughness={0.3} />
      </mesh>
    </group>
  );
}

export function Printer(props: G) {
  return (
    <group {...props}>
      <RoundedBox args={[2.7, 0.95, 1.7]} radius={0.1} smoothness={4}>
        <meshStandardMaterial color="#e6eaf5" metalness={0.15} roughness={0.5} />
      </RoundedBox>
      <mesh position={[0, 0.52, -0.35]} rotation={[-0.12, 0, 0]}>
        <boxGeometry args={[1.9, 0.04, 0.95]} />
        <meshStandardMaterial color="#c5cce0" roughness={0.6} />
      </mesh>
      <mesh position={[0, 0.58, -0.3]} rotation={[-0.12, 0, 0]}>
        <boxGeometry args={[1.5, 0.012, 0.9]} />
        <meshStandardMaterial color="#ffffff" roughness={0.9} />
      </mesh>
      <mesh position={[0, -0.12, 0.86]}>
        <boxGeometry args={[1.9, 0.12, 0.04]} />
        <meshStandardMaterial color="#0d1020" />
      </mesh>
      <mesh position={[0, -0.12, 1.05]} rotation={[0.25, 0, 0]}>
        <boxGeometry args={[1.5, 0.012, 0.6]} />
        <meshStandardMaterial color="#ffffff" roughness={0.9} />
      </mesh>
      <mesh position={[0.9, 0.2, 0.86]}>
        <boxGeometry args={[0.5, 0.2, 0.03]} />
        <meshStandardMaterial color="#0b1230" emissive="#22d3ee" emissiveIntensity={0.7} />
      </mesh>
    </group>
  );
}

export function Cpu(props: G) {
  return (
    <group {...props}>
      <RoundedBox args={[1.1, 0.09, 1.1]} radius={0.03} smoothness={3}>
        <meshStandardMaterial color="#27304a" metalness={0.6} roughness={0.4} />
      </RoundedBox>
      <mesh position={[0, 0.07, 0]}>
        <boxGeometry args={[0.72, 0.05, 0.72]} />
        <meshStandardMaterial color="#b4bbd0" metalness={1} roughness={0.22} />
      </mesh>
      <mesh position={[0, 0.1, 0]}>
        <boxGeometry args={[0.3, 0.005, 0.3]} />
        <meshStandardMaterial color="#6f94ff" emissive="#6f94ff" emissiveIntensity={1.3} />
      </mesh>
    </group>
  );
}
