"use client";

import { useGLTF, useAnimations } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import * as THREE from "three";

export default function AvatarModel({ isSpeaking }: { isSpeaking: boolean }) {
    // Using a sample public Ready Player Me avatar
    const { scene, animations } = useGLTF("https://models.readyplayer.me/64bfa15f0e72c63d7c3934a6.glb");
    const { actions } = useAnimations(animations, scene);

    const headMeshRef = useRef<THREE.Mesh | null>(null);
    const jawBoneRef = useRef<THREE.Bone | null>(null);

    useEffect(() => {
        // Find the head mesh or jaw bone for procedural animation
        scene.traverse((child) => {
            if ((child as THREE.Mesh).isMesh && child.name.includes("Wolf3D_Head")) {
                headMeshRef.current = child as THREE.Mesh;
            }
            if ((child as THREE.Bone).isBone && child.name === "Jaw") {
                jawBoneRef.current = child as THREE.Bone;
            }
        });
    }, [scene]);

    useFrame((state) => {
        const time = state.clock.getElapsedTime();

        // Idle gentle sway
        scene.rotation.y = Math.sin(time * 0.5) * 0.1;

        // Procedural lip sync/jaw movement
        if (isSpeaking) {
            if (jawBoneRef.current) {
                // Randomly open and close jaw fast to simulate talking
                jawBoneRef.current.rotation.x = 0.1 + Math.random() * 0.2;
            } else if (headMeshRef.current && headMeshRef.current.morphTargetDictionary && headMeshRef.current.morphTargetInfluences) {
                const mouthOpenIdx = headMeshRef.current.morphTargetDictionary['mouthOpen'];
                if (mouthOpenIdx !== undefined) {
                    headMeshRef.current.morphTargetInfluences[mouthOpenIdx] = Math.random() * 0.8;
                }
            }
        } else {
            // Close mouth
            if (jawBoneRef.current) {
                jawBoneRef.current.rotation.x = THREE.MathUtils.lerp(jawBoneRef.current.rotation.x, 0, 0.2);
            } else if (headMeshRef.current && headMeshRef.current.morphTargetDictionary && headMeshRef.current.morphTargetInfluences) {
                const mouthOpenIdx = headMeshRef.current.morphTargetDictionary['mouthOpen'];
                if (mouthOpenIdx !== undefined) {
                    headMeshRef.current.morphTargetInfluences[mouthOpenIdx] = 0;
                }
            }
        }

        // Blinking
        if (headMeshRef.current && headMeshRef.current.morphTargetDictionary && headMeshRef.current.morphTargetInfluences) {
            const blinkIdx = headMeshRef.current.morphTargetDictionary['eyeBlinkLeft'];
            const blinkRightIdx = headMeshRef.current.morphTargetDictionary['eyeBlinkRight'];

            if (blinkIdx !== undefined && blinkRightIdx !== undefined) {
                // Blink every ~4 seconds
                const blinkVal = Math.sin(time * 2) > 0.95 ? 1 : 0;
                headMeshRef.current.morphTargetInfluences[blinkIdx] = blinkVal;
                headMeshRef.current.morphTargetInfluences[blinkRightIdx] = blinkVal;
            }
        }
    });

    return (
        <primitive object={scene} scale={2} position={[0, -3, 0]} />
    );
}

// Preload the model
useGLTF.preload("https://models.readyplayer.me/64bfa15f0e72c63d7c3934a6.glb");
