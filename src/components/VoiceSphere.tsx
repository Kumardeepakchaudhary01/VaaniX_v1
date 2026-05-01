"use client";

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { Sphere, OrbitControls } from "@react-three/drei";

// A classic 3D simplex noise function for shader distortion
const vertexShader = `
  uniform float uTime;
  uniform float uIntensity;
  varying vec2 vUv;
  varying float vDisplacement;

  // Simple 3D noise function
  vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec4 permute(vec4 x) { return mod289(((x*34.0)+1.0)*x); }
  vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

  float snoise(vec3 v) {
    const vec2 C = vec2(1.0/6.0, 1.0/3.0);
    const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);

    vec3 i  = floor(v + dot(v, C.yyy));
    vec3 x0 = v - i + dot(i, C.xxx);

    vec3 g = step(x0.yzx, x0.xyz);
    vec3 l = 1.0 - g;
    vec3 i1 = min( g.xyz, l.zxy );
    vec3 i2 = max( g.xyz, l.zxy );

    vec3 x1 = x0 - i1 + C.xxx;
    vec3 x2 = x0 - i2 + C.yyy;
    vec3 x3 = x0 - D.yyy;

    i = mod289(i);
    vec4 p = permute( permute( permute(
               i.z + vec4(0.0, i1.z, i2.z, 1.0 ))
             + i.y + vec4(0.0, i1.y, i2.y, 1.0 ))
             + i.x + vec4(0.0, i1.x, i2.x, 1.0 ));

    float n_ = 0.142857142857;
    vec3  ns = n_ * D.wyz - D.xzx;

    vec4 j = p - 49.0 * floor(p * ns.z * ns.z);

    vec4 x_ = floor(j * ns.z);
    vec4 y_ = floor(j - 7.0 * x_);

    vec4 x = x_ *ns.x + ns.yyyy;
    vec4 y = y_ *ns.x + ns.yyyy;
    vec4 h = 1.0 - abs(x) - abs(y);

    vec4 b0 = vec4( x.xy, y.xy );
    vec4 b1 = vec4( x.zw, y.zw );

    vec4 s0 = floor(b0)*2.0 + 1.0;
    vec4 s1 = floor(b1)*2.0 + 1.0;
    vec4 sh = -step(h, vec4(0.0));

    vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy;
    vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww;

    vec3 p0 = vec3(a0.xy,h.x);
    vec3 p1 = vec3(a0.zw,h.y);
    vec3 p2 = vec3(a1.xy,h.z);
    vec3 p3 = vec3(a1.zw,h.w);

    vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2, p2), dot(p3,p3)));
    p0 *= norm.x;
    p1 *= norm.y;
    p2 *= norm.z;
    p3 *= norm.w;

    vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
    m = m * m;
    return 42.0 * dot( m*m, vec4( dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3) ) );
  }

  void main() {
    vUv = uv;
    
    // Add noise based on position and time
    float noiseFreq = 1.5;
    float noiseAmp = 0.3 * uIntensity;
    vec3 noisePos = vec3(position.x * noiseFreq + uTime, position.y * noiseFreq - uTime, position.z * noiseFreq);
    
    vDisplacement = snoise(noisePos) * noiseAmp;
    
    vec3 newPosition = position + normal * vDisplacement;
    
    gl_Position = projectionMatrix * modelViewMatrix * vec4(newPosition, 1.0);
  }
`;

const fragmentShader = `
  uniform vec3 uColor1;
  uniform vec3 uColor2;
  uniform float uIntensity;
  
  varying vec2 vUv;
  varying float vDisplacement;

  void main() {
    // Mix two colors based on the displacement (the peaks vs the valleys)
    float mixRatio = smoothstep(-0.2, 0.2, vDisplacement * (1.0 / uIntensity));
    vec3 color = mix(uColor1, uColor2, mixRatio);
    
    // Add artificial "fresnel" edge glow
    float edgeGlow = 1.0 - vUv.y;
    
    gl_FragColor = vec4(color, 0.95);
  }
`;

export default function VoiceSphere({ isRecording, isSpeaking }: { isRecording: boolean, isSpeaking: boolean }) {
    const meshRef = useRef<THREE.Mesh>(null);

    const baseColor1 = new THREE.Color("#000000"); // deep dark
    const baseColor2 = new THREE.Color("#00f3ff"); // neon blue

    const recColor1 = new THREE.Color("#3a0000"); // dark red
    const recColor2 = new THREE.Color("#ff0055"); // neon pinkish red

    const speakColor1 = new THREE.Color("#1a0033"); // dark purple
    const speakColor2 = new THREE.Color("#b537f2"); // neon purple

    // Setup shader uniforms
    const uniforms = useMemo(() => ({
        uTime: { value: 0 },
        uIntensity: { value: 0.2 },
        uColor1: { value: baseColor1 },
        uColor2: { value: baseColor2 }
    }), []);

    useFrame((state) => {
        if (!meshRef.current) return;

        const time = state.clock.getElapsedTime();
        const mat = meshRef.current.material as THREE.ShaderMaterial;

        // Base rotation
        meshRef.current.rotation.y = time * 0.1;
        meshRef.current.rotation.z = time * 0.05;

        // Animate uniforms smoothly
        mat.uniforms.uTime.value = time * 0.5;

        // Target state values
        let targetIntensity = 0.2;
        let c1 = baseColor1;
        let c2 = baseColor2;

        if (isRecording) {
            targetIntensity = 0.8 + Math.sin(time * 10) * 0.3; // erratic pulsing
            c1 = recColor1;
            c2 = recColor2;
        } else if (isSpeaking) {
            targetIntensity = 0.5 + Math.sin(time * 3) * 0.2; // deep smooth pulsing
            c1 = speakColor1;
            c2 = speakColor2;
        }

        // Interpolate
        mat.uniforms.uIntensity.value = THREE.MathUtils.lerp(mat.uniforms.uIntensity.value, targetIntensity, 0.1);
        mat.uniforms.uColor1.value.lerp(c1, 0.1);
        mat.uniforms.uColor2.value.lerp(c2, 0.1);

        // Scale the entire mesh slightly based on intensity
        const s = 1.0 + mat.uniforms.uIntensity.value * 0.2;
        meshRef.current.scale.set(s, s, s);
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
                <Sphere ref={meshRef} args={[1.5, 128, 128]}>
                    <shaderMaterial
                        vertexShader={vertexShader}
                        fragmentShader={fragmentShader}
                        uniforms={uniforms}
                        transparent={true}
                        wireframe={isRecording} // Keep wireframe for recording state just for techy vibe
                    />
                </Sphere>

                {/* Elegant glow rings */}
                <mesh rotation={[Math.PI / 2, 0, 0]}>
                    <ringGeometry args={[2.2, 2.22, 64]} />
                    <meshBasicMaterial color="#ffffff" transparent opacity={0.1} side={THREE.DoubleSide} />
                </mesh>
                <mesh rotation={[Math.PI / 2, 0, 0]}>
                    <ringGeometry args={[2.5, 2.51, 64]} />
                    <meshBasicMaterial color="#ffffff" transparent opacity={0.05} side={THREE.DoubleSide} />
                </mesh>
                <mesh rotation={[0, Math.PI / 2, 0]}>
                    <ringGeometry args={[2.8, 2.81, 64]} />
                    <meshBasicMaterial color="#ffffff" transparent opacity={0.03} side={THREE.DoubleSide} />
                </mesh>
            </group>
        </>
    );
}
