"use client";

import { useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";

function Particles() {
    const points = useRef<THREE.Points>(null);

    const particlesCount = 2000;

    const [positions, colors] = useMemo(() => {
        const positions = new Float32Array(particlesCount * 3);
        const colors = new Float32Array(particlesCount * 3);

        const color1 = new THREE.Color("#00f3ff"); // neon blue
        const color2 = new THREE.Color("#b537f2"); // neon purple

        for (let i = 0; i < particlesCount; i++) {
            // random position in a sphere
            const r = 20 * Math.cbrt(Math.random());
            const theta = Math.random() * 2 * Math.PI;
            const phi = Math.acos(2 * Math.random() - 1);

            positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
            positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
            positions[i * 3 + 2] = r * Math.cos(phi);

            // mix colors based on distance or random
            const mixedColor = color1.clone().lerp(color2, Math.random());
            colors[i * 3] = mixedColor.r;
            colors[i * 3 + 1] = mixedColor.g;
            colors[i * 3 + 2] = mixedColor.b;
        }
        return [positions, colors];
    }, [particlesCount]);

    useFrame((state, delta) => {
        if (points.current) {
            points.current.rotation.y += delta * 0.05;
            points.current.rotation.x += delta * 0.02;
        }
    });

    return (
        <points ref={points}>
            <bufferGeometry>
                <bufferAttribute
                    attach="attributes-position"
                    args={[positions, 3]}
                />
                <bufferAttribute
                    attach="attributes-color"
                    args={[colors, 3]}
                />
            </bufferGeometry>
            <pointsMaterial
                size={0.05}
                vertexColors
                transparent
                opacity={0.8}
                sizeAttenuation
                blending={THREE.AdditiveBlending}
            />
        </points>
    );
}

export default function CosmicBackground() {
    return (
        <div className="fixed inset-0 -z-10 bg-gradient-to-br from-cosmic-dark via-cosmic-blue to-cosmic-purple pointer-events-none">
            <Canvas camera={{ position: [0, 0, 10], fov: 60 }}>
                <Particles />
            </Canvas>
        </div>
    );
}
