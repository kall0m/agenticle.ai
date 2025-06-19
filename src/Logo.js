import React, { useRef } from "react";
import * as THREE from "three";
import { useGLTF, MeshTransmissionMaterial } from "@react-three/drei";
import { useThree, useFrame } from "@react-three/fiber";
import { useControls } from "leva";

export default function Logo(props) {
    const { nodes, materials } = useGLTF("./agenticle-logo.glb");
    const group = useRef();

    const config = useControls("Logo Material", {
        meshPhysicalMaterial: false,
        transmissionSampler: false,
        backside: true,
        samples: { value: 10, min: 1, max: 32, step: 1 },
        resolution: { value: 2048, min: 256, max: 2048, step: 256 },
        transmission: { value: 1, min: 0, max: 1 },
        roughness: { value: 0.0, min: 0, max: 1, step: 0.01 },
        thickness: { value: 3.5, min: 0, max: 10, step: 0.01 },
        ior: { value: 1.5, min: 1, max: 5, step: 0.01 },
        chromaticAberration: { value: 1, min: 0, max: 1 },
        anisotropy: { value: 1, min: 0, max: 1, step: 0.01 },
        distortion: { value: 0.05, min: 0, max: 1, step: 0.01 },
        distortionScale: { value: 0.3, min: 0.01, max: 1, step: 0.01 },
        temporalDistortion: { value: 0.5, min: 0, max: 1, step: 0.01 },
        clearcoat: { value: 1, min: 0, max: 1 },
        attenuationDistance: { value: 0.5, min: 0, max: 10, step: 0.01 },
        attenuationColor: "#ffffff",
        color: "#8F90DF",
        bg: "#B3B1F9",
    });

    // Animate tilt based on mouse movement
    useFrame(({ mouse }) => {
        if (group.current) {
            const maxTilt = 0.3;
            const targetX = Math.PI / 2 + mouse.y * maxTilt; // ← flipped here
            const targetY = mouse.x * maxTilt;

            group.current.rotation.x = THREE.MathUtils.lerp(
                group.current.rotation.x,
                targetX,
                0.1
            );
            group.current.rotation.y = THREE.MathUtils.lerp(
                group.current.rotation.y,
                targetY,
                0.1
            );
        }
    });

    return (
        <group
            ref={group}
            rotation={[Math.PI / 2, 0, 0]}
            {...props}
            dispose={null}
        >
            <mesh castShadow receiveShadow geometry={nodes.Blob1.geometry}>
                <MeshTransmissionMaterial
                    background={new THREE.Color(config.bg)}
                    {...config}
                />
            </mesh>
            <mesh
                castShadow
                receiveShadow
                geometry={nodes.Blob2.geometry}
                material={nodes.Blob2.material}
            />
        </group>
    );
}

useGLTF.preload("./agenticle-logo.glb");
