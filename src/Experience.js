import * as THREE from "three";
import { Suspense } from "react";
import { MarchingCubes, MeshTransmissionMaterial } from "@react-three/drei";
import { Physics } from "@react-three/rapier";
import { useControls } from "leva";

import Placeholder from "./Placeholder.js";
import Logo from "./Logo.js";
import Pointer from "./Pointer.js";
import MetaBall from "./Metaball.js";

export default function Experience() {
    const config = useControls({
        meshPhysicalMaterial: false,
        transmissionSampler: false,
        backside: true,
        samples: { value: 10, min: 1, max: 32, step: 1 },
        resolution: { value: 2048, min: 256, max: 2048, step: 256 },
        transmission: { value: 1, min: 0, max: 1 },
        roughness: { value: 0.0, min: 0, max: 1, step: 0.01 },
        thickness: { value: 3.5, min: 0, max: 10, step: 0.01 },
        ior: { value: 1.5, min: 1, max: 5, step: 0.01 },
        chromaticAberration: { value: 0.06, min: 0, max: 1 },
        anisotropy: { value: 0.1, min: 0, max: 1, step: 0.01 },
        distortion: { value: 0.0, min: 0, max: 1, step: 0.01 },
        distortionScale: { value: 0.3, min: 0.01, max: 1, step: 0.01 },
        temporalDistortion: { value: 0.5, min: 0, max: 1, step: 0.01 },
        clearcoat: { value: 1, min: 0, max: 1 },
        attenuationDistance: { value: 0.5, min: 0, max: 10, step: 0.01 },
        attenuationColor: "#ffffff",
        color: "#8F90DF",
        bg: "#B3B1F9",
    });

    return (
        <>
            <directionalLight
                castShadow
                position={[1, 2, 3]}
                intensity={1.5}
                shadow-normalBias={0.04}
            />
            <ambientLight intensity={0.5} />

            <Suspense fallback={<Placeholder scale={[3, 3, 1]} />}>
                <Logo position={[2, 0, 0]} rotation={[0, -0.3, 0]} />
            </Suspense>

            <Physics gravity={[0, 2, 0]}>
                <MarchingCubes
                    resolution={80}
                    maxPolyCount={10000}
                    enableUvs={false}
                    enableColors={true}
                    position={[2, 0, 0]}
                >
                    <meshStandardMaterial
                        vertexColors
                        thickness={0.15}
                        roughness={0}
                    />
                    {/* <MeshTransmissionMaterial /> */}
                    <MetaBall color="#B3B1F9" position={[1, 1, 0.5]} />
                    <MetaBall color="#8F90DF" position={[-1, -1, -0.5]} />
                    <MetaBall color="#FC8759" position={[2, 2, 0.5]} />
                    <MetaBall color="#FC8759" position={[-2, -2, -0.5]} />
                    <MetaBall color="#B3B1F9" position={[3, 3, 0.5]} />
                    <MetaBall color="#8F90DF" position={[-3, -3, -0.5]} />
                    <Pointer />
                </MarchingCubes>
            </Physics>
        </>
    );
}
