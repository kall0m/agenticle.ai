import React, { useRef, useEffect } from "react";
import * as THREE from "three";
import { useGLTF, MeshTransmissionMaterial } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useControls } from "leva";

export default function Logo(props) {
    const { nodes } = useGLTF("./agenticle-logo.glb");
    const group = useRef();

    const isDragging = useRef(false);
    const dragY = useRef(0);
    const dragYDisplay = useRef(0);
    const velocityY = useRef(0);
    const lastX = useRef(0);
    const lastTime = useRef(performance.now());

    const targetRotation = useRef({ x: 0, y: 0 });
    const currentRotation = useRef({ x: 0, y: 0 });

    const config = useControls("Logo Material", {
        meshPhysicalMaterial: false,
        transmissionSampler: false,
        backside: true,
        samples: { value: 10, min: 1, max: 32, step: 1 },
        resolution: { value: 2048, min: 256, max: 2048, step: 256 },
        transmission: { value: 1, min: 0, max: 1 },
        roughness: { value: 0.12, min: 0, max: 1, step: 0.01 },
        thickness: { value: 3.5, min: 0, max: 10, step: 0.01 },
        ior: { value: 1.2, min: 1, max: 5, step: 0.01 },
        chromaticAberration: { value: 0.45, min: 0, max: 1 },
        anisotropy: { value: 0.7, min: 0, max: 1, step: 0.01 },
        distortion: { value: 0.1, min: 0, max: 1, step: 0.01 },
        distortionScale: { value: 0.3, min: 0.01, max: 1, step: 0.01 },
        temporalDistortion: { value: 0.5, min: 0, max: 1, step: 0.01 },
        clearcoat: { value: 1, min: 0, max: 1 },
        attenuationDistance: { value: 0.5, min: 0, max: 10, step: 0.01 },
        attenuationColor: "#ffffff",
        color: "#B3B1F9",
        bg: "#dad9fc",
    });

    useEffect(() => {
        const handlePointerDown = (e) => {
            isDragging.current = true;
            lastX.current = e.clientX;
            lastTime.current = performance.now();
            velocityY.current = 0;
        };

        const handlePointerMove = (e) => {
            if (!isDragging.current) return;

            const now = performance.now();
            const dx = e.clientX - lastX.current;
            const dt = now - lastTime.current;

            const DRAG_MULTIPLIER = 0.01;
            const deltaRotation = -dx * DRAG_MULTIPLIER;
            dragY.current += deltaRotation;

            if (dt > 0) {
                const v = deltaRotation / (dt / 1000);
                velocityY.current = THREE.MathUtils.lerp(
                    velocityY.current,
                    v,
                    0.5
                );
            }

            lastX.current = e.clientX;
            lastTime.current = now;
        };

        const handlePointerUp = () => {
            isDragging.current = false;
        };

        window.addEventListener("pointerdown", handlePointerDown);
        window.addEventListener("pointermove", handlePointerMove);
        window.addEventListener("pointerup", handlePointerUp);

        return () => {
            window.removeEventListener("pointerdown", handlePointerDown);
            window.removeEventListener("pointermove", handlePointerMove);
            window.removeEventListener("pointerup", handlePointerUp);
        };
    }, []);

    useFrame(({ mouse }, delta) => {
        const maxTilt = THREE.MathUtils.degToRad(15);

        // Hover tilt
        targetRotation.current.x = mouse.y * maxTilt;
        targetRotation.current.y = mouse.x * maxTilt;

        // Smooth hover response
        currentRotation.current.x = THREE.MathUtils.damp(
            currentRotation.current.x,
            targetRotation.current.x,
            6,
            delta
        );
        currentRotation.current.y = THREE.MathUtils.damp(
            currentRotation.current.y,
            targetRotation.current.y,
            6,
            delta
        );

        // Smooth display of Y rotation
        dragYDisplay.current = THREE.MathUtils.damp(
            dragYDisplay.current,
            dragY.current,
            6,
            delta
        );

        if (!isDragging.current) {
            // Limit extreme spin
            velocityY.current = Math.max(-5, Math.min(5, velocityY.current));

            // Apply inertia
            dragY.current += velocityY.current * delta;

            // Decelerate
            velocityY.current = THREE.MathUtils.damp(
                velocityY.current,
                0,
                3,
                delta
            );
        }

        if (group.current) {
            group.current.rotation.set(
                Math.PI / 2 + currentRotation.current.x,
                dragYDisplay.current + currentRotation.current.y,
                0
            );
        }
    });

    return (
        <group ref={group} {...props} dispose={null}>
            <mesh castShadow receiveShadow geometry={nodes.blob_outer.geometry}>
                <MeshTransmissionMaterial
                    background={new THREE.Color(config.bg)}
                    {...config}
                />
            </mesh>
            <mesh
                castShadow
                receiveShadow
                geometry={nodes.blob_inner.geometry}
                material={nodes.blob_inner.material}
            />
        </group>
    );
}

useGLTF.preload("./agenticle-logo.glb");
