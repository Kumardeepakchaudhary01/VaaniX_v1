"use client";

import { useGLTF, Center } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import * as THREE from "three";
import { KTX2Loader } from "three-stdlib";

export default function AvatarModel({ isSpeaking, emotion = "neutral" }: { isSpeaking: boolean, emotion?: string }) {
    const { gl, viewport } = useThree();

    // Use Drei's 'useGLTF' wrapper to automatically ingest its Draco and Meshopt decoders, 
    // while explicitly injecting our custom KTX2Loader via the 4th parameter's extendLoader.
    const { scene } = useGLTF("/models/facecap.glb?v=7", true, true, (loader: any) => {
        const ktx2Loader = new KTX2Loader()
            .setTranscoderPath('https://unpkg.com/three@0.160.0/examples/jsm/libs/basis/')
            .detectSupport(gl);
        loader.setKTX2Loader(ktx2Loader);
    });

    const headMeshRef = useRef<THREE.Mesh | null>(null);
    const jawOpenIdxRef = useRef<number | null>(null);
    const baseScaleRef = useRef<number>(1);
    const nativeSizeRef = useRef<THREE.Vector3 | null>(null);

    useEffect(() => {
        // Find the mesh with morph targets
        scene.traverse((child) => {
            const mesh = child as THREE.Mesh;
            if (mesh.isMesh && mesh.morphTargetDictionary) {
                headMeshRef.current = mesh;
                if (mesh.morphTargetDictionary['jawOpen'] !== undefined) {
                    jawOpenIdxRef.current = mesh.morphTargetDictionary['jawOpen'];
                }
            }
        });

        // Determine native height just once to guide responsive scaling later
        if (scene && !nativeSizeRef.current) {
            scene.scale.set(1, 1, 1);
            scene.position.set(0, 0, 0);
            const box = new THREE.Box3().setFromObject(scene);
            const size = box.getSize(new THREE.Vector3());
            
            if (size.y > 0) {
                nativeSizeRef.current = size;
            }
        }
    }, [scene]);

    useFrame((state) => {
        const time = state.clock.getElapsedTime();

        // Idle behavior
        scene.rotation.y = Math.sin(time * 0.4) * 0.08;
        scene.rotation.x = Math.sin(time * 0.2) * 0.02;

        const mesh = headMeshRef.current;
        if (mesh && mesh.morphTargetInfluences && mesh.morphTargetDictionary) {
            // Speech movement via jawOpen
            if (jawOpenIdxRef.current !== null) {
                if (isSpeaking) {
                    const rawMouth = 0.4 + Math.sin(time * 18) * 0.5 + Math.sin(time * 11) * 0.2;
                    const mouthOpen = Math.max(0, Math.min(1.0, rawMouth));
                    mesh.morphTargetInfluences[jawOpenIdxRef.current] = THREE.MathUtils.lerp(
                        mesh.morphTargetInfluences[jawOpenIdxRef.current],
                        mouthOpen * 0.45,
                        0.3
                    );
                } else {
                    mesh.morphTargetInfluences[jawOpenIdxRef.current] = THREE.MathUtils.lerp(
                        mesh.morphTargetInfluences[jawOpenIdxRef.current],
                        0,
                        0.2
                    );
                }
            }

            // Blinking logic
            const blinkLIdx = mesh.morphTargetDictionary['eyeBlink_L'];
            const blinkRIdx = mesh.morphTargetDictionary['eyeBlink_R'];
            
            if (blinkLIdx !== undefined && blinkRIdx !== undefined) {
                const blinkValue = Math.sin(time * 2.5) > 0.96 ? 1 : 0;
                mesh.morphTargetInfluences[blinkLIdx] = THREE.MathUtils.lerp(mesh.morphTargetInfluences[blinkLIdx], blinkValue, 0.4);
                mesh.morphTargetInfluences[blinkRIdx] = THREE.MathUtils.lerp(mesh.morphTargetInfluences[blinkRIdx], blinkValue, 0.4);
            }

            // Emotion mapping
            const setMorph = (name: string, value: number) => {
                const idx = mesh.morphTargetDictionary[name];
                if (idx !== undefined) {
                    mesh.morphTargetInfluences[idx] = THREE.MathUtils.lerp(mesh.morphTargetInfluences[idx], value, 0.1);
                }
            };

            if (emotion === "happy") {
                setMorph('mouthSmile_L', 0.6);
                setMorph('mouthSmile_R', 0.6);
                setMorph('browInnerUp', 0.3);
                setMorph('mouthFrown_L', 0);
                setMorph('mouthFrown_R', 0);
                setMorph('browDown_L', 0);
                setMorph('browDown_R', 0);
            } else if (emotion === "concerned") {
                setMorph('mouthSmile_L', 0);
                setMorph('mouthSmile_R', 0);
                setMorph('browInnerUp', 0.8);
                setMorph('mouthFrown_L', 0.4);
                setMorph('mouthFrown_R', 0.4);
                setMorph('browDown_L', 0.5);
                setMorph('browDown_R', 0.5);
            } else if (emotion === "helpful") {
                setMorph('mouthSmile_L', 0.2);
                setMorph('mouthSmile_R', 0.2);
                setMorph('browInnerUp', 0.5);
                setMorph('mouthFrown_L', 0);
                setMorph('mouthFrown_R', 0);
                setMorph('browDown_L', 0);
                setMorph('browDown_R', 0);
            } else { // neutral
                setMorph('mouthSmile_L', 0);
                setMorph('mouthSmile_R', 0);
                setMorph('browInnerUp', 0);
                setMorph('mouthFrown_L', 0);
                setMorph('mouthFrown_R', 0);
                setMorph('browDown_L', 0);
                setMorph('browDown_R', 0);
            }
        }
    });

    // Dynamic scale based on viewport 
    let dynamicScale = baseScaleRef.current;
    if (nativeSizeRef.current) {
        // Target height is 75% of viewport height
        dynamicScale = (viewport.height * 0.75) / nativeSizeRef.current.y;
    }

    return (
        <Center>
            <group scale={dynamicScale}>
                <primitive object={scene} />
            </group>
        </Center>
    );
}
