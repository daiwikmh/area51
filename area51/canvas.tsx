"use client";

import React, { useRef, useMemo } from 'react';
import { Canvas, useFrame, extend } from '@react-three/fiber';
import { OrbitControls, Effects } from '@react-three/drei';
import { UnrealBloomPass } from 'three-stdlib';
import * as THREE from 'three';

extend({ UnrealBloomPass });

declare module "@react-three/fiber" {
  interface ThreeElements {
    unrealBloomPass: { threshold: number; strength: number; radius: number };
  }
}

const ParticleSwarm = () => {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const count = 20000;
  const speedMult = 1;
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const target = useMemo(() => new THREE.Vector3(), []);
  const pColor = useMemo(() => new THREE.Color(), []);
  const color = pColor; // Alias for user code compatibility
  
  const positions = useMemo(() => {
     const pos = [];
     for(let i=0; i<count; i++) pos.push(new THREE.Vector3((Math.random()-0.5)*100, (Math.random()-0.5)*100, (Math.random()-0.5)*100));
     return pos;
  }, []);

  // Material & Geom
  const material = useMemo(() => new THREE.MeshBasicMaterial({ color: 0xffffff }), []);
  const geometry = useMemo(() => new THREE.TetrahedronGeometry(0.04), []);

  const PARAMS = useMemo(() => ({"scale":20,"speed":3,"flow":5}), []);
  const addControl = (id: string, _l: string, _min: number, _max: number, val: number): number => {
      return (PARAMS as Record<string, number>)[id] !== undefined ? (PARAMS as Record<string, number>)[id] : val;
  };
  const setInfo = (_title: string, _desc: string) => {};
  const annotate = () => {};

  useFrame((state) => {
    if (!meshRef.current) return;
    const time = state.clock.getElapsedTime() * speedMult;
    const THREE_LIB = THREE;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if((material as any).uniforms && (material as any).uniforms.uTime) {
         // eslint-disable-next-line @typescript-eslint/no-explicit-any
         (material as any).uniforms.uTime.value = time;
    }

    for (let i = 0; i < count; i++) {
        // USER CODE START
        const scale = addControl("scale", "Entity Scale", 20, 150, 65);
        const speed = addControl("speed", "Gallop Speed", 1, 15, 5.5);
        const flow = addControl("flow", "Mane Energy", 0, 50, 22);
        
        const n = i / count;
        const t = time * speed;
        
        const profile = Math.sin(n * Math.PI) * Math.exp(-n * 4) * 4.5;
        const r = scale * (0.12 + profile);
        
        const baseX = scale * (1.2 - n * 3.5);
        const theta = i * 2.39996 + (n * 8) + (t * 0.1);
        
        const phase = n * Math.PI * 1.5;
        const gallopY = Math.abs(Math.sin(t - phase)) * (scale * 0.4);
        const gallopX = Math.cos(t - phase) * (scale * 0.15);
        
        const rippleY = Math.sin(baseX * 0.12 + t * 2.5) * flow * profile;
        const rippleZ = Math.cos(baseX * 0.12 + t * 2.5) * flow * profile;
        
        const x = baseX + gallopX;
        const y = r * Math.cos(theta) + gallopY + rippleY - (scale * 0.3);
        const z = r * Math.sin(theta) + rippleZ;
        
        target.set(x, y, z);
        
        const hue = 0.06 + (Math.sin(n * Math.PI) * 0.08);
        const lightness = 0.25 + (profile * 0.12) + Math.abs(Math.sin(i * 0.03 - t * 1.5)) * 0.35;
        
        color.setHSL(hue, 0.95, lightness);
        
        if (i === 0) {
        setInfo("Majestic Golden Run", "Abstract bounding energy field symbolizing power, speed, and premium scalable engineering.");
        }
        // USER CODE END

        positions[i].lerp(target, 0.1);
        dummy.position.copy(positions[i]);
        dummy.updateMatrix();
        meshRef.current.setMatrixAt(i, dummy.matrix);
        meshRef.current.setColorAt(i, pColor);
    }
    meshRef.current.instanceMatrix.needsUpdate = true;
    if (meshRef.current.instanceColor) meshRef.current.instanceColor.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[geometry, material, count]} />
  );
};

export default function App() {
  return (
    <div style={{ position: 'absolute', inset: 0 }}>
      <Canvas camera={{ position: [0, 0, 100], fov: 60 }} gl={{ alpha: true }} style={{ position: 'absolute', inset: 0, background: 'transparent' }}>
        <fog attach="fog" args={['#000000', 0.01]} />
        <ParticleSwarm />
        <OrbitControls autoRotate={true} enableZoom={false} enablePan={false} />
        <Effects disableGamma>
            <unrealBloomPass threshold={0} strength={1.8} radius={0.4} />
        </Effects>
      </Canvas>
    </div>
  );
}
