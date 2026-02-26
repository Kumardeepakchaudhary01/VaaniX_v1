"use client";

import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import * as THREE from "three";
import { Sphere, OrbitControls } from "@react-three/drei";

export default function VoiceSphere({ isRecording, isSpeaking }: { isRecording: boolean, isSpeaking: boolean }) {
    const meshRef = useRef<THREE.Mesh>(null);
    const materialRef = useRef<THREE.MeshPhysicalMaterial>(null);

    const targetScaleVec = new THREE.Vector3();
    const baseColor = new THREE.Color("#00f3ff"); // neon blue
    const recordingColor = new THREE.Color("#ff0055"); // red/pinkish
    const speakingColor = new THREE.Color("#b537f2"); // purple

    useFrame((state) => {
        if (!meshRef.current || !materialRef.current) return;

        const time = state.clock.getElapsedTime();

        // Base rotation
        meshRef.current.rotation.y = time * 0.2;
        meshRef.current.rotation.z = time * 0.1;

        // Scale animation based on state
        const targetScale = isRecording ? 1.3 + Math.sin(time * 8) * 0.1 : isSpeaking ? 1.2 + Math.sin(time * 5) * 0.05 : 1;
        targetScaleVec.set(targetScale, targetScale, targetScale);
        meshRef.current.scale.lerp(targetScaleVec, 0.1);

        let targetColor = baseColor;
        if (isRecording) targetColor = recordingColor;
        if (isSpeaking) targetColor = speakingColor;

        materialRef.current.color.lerp(targetColor, 0.1);
        materialRef.current.emissive.lerp(targetColor, 0.1);
        materialRef.current.emissiveIntensity = isRecording || isSpeaking ? 1.5 + Math.sin(time * 4) * 0.5 : 0.8;
    });

    return (
        <>
            <OrbitControls
                enableZoom={false}
                enablePan={false}
                minPolarAngle={Math.PI / 2.5}
                maxPolarAngle={Math.PI / 1.5}
            />
            <group>
                <Sphere ref={meshRef} args={[1.5, 64, 64]}>
                    <meshPhysicalMaterial
                        ref={materialRef}
                        color="#00f3ff"
                        emissive="#00f3ff"
                        emissiveIntensity={0.8}
                        roughness={0.1}
                        metalness={0.8}
                        clearcoat={1}
                        clearcoatRoughness={0.1}
                        wireframe={isRecording}
                    />
                </Sphere>

                {/* Surrounding particles/rings could be added here */}
                <mesh rotation={[Math.PI / 2, 0, 0]}>
                    <ringGeometry args={[2.2, 2.25, 64]} />
                    <meshBasicMaterial color="#ffffff" transparent opacity={0.1} side={THREE.DoubleSide} />
                </mesh>
                <mesh rotation={[Math.PI / 2, 0, 0]}>
                    <ringGeometry args={[2.6, 2.62, 64]} />
                    <meshBasicMaterial color="#ffffff" transparent opacity={0.05} side={THREE.DoubleSide} />
                </mesh>
            </group>
        </>
    );
}
