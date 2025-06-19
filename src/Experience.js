import * as THREE from "three";
import { Suspense } from "react";
import {
    MarchingCubes,
    MeshTransmissionMaterial,
    MarchingPlane,
} from "@react-three/drei";
import { Physics } from "@react-three/rapier";

import Placeholder from "./Placeholder.js";
import Logo from "./Logo.js";
import Pointer from "./Pointer.js";
import MetaBall from "./Metaball.js";
import Ocean from "./Ocean.js";
import Water from "./Water.js";
import { Perf } from "r3f-perf";
import { useControls } from "leva";

export default function Experience() {
    const {
        perfVisible,
        mouseSize,
        deep,
        viscosity,
        smoothing,
        showLogo,
        showWater,
    } = useControls({
        perfVisible: { value: true },
        mouseSize: { value: 0.8, min: 0.01, max: 2, step: 0.01 },
        deep: { value: 0.004, min: 0, max: 0.02, step: 0.001 },
        viscosity: { value: 0.96, min: 0.8, max: 1, step: 0.005 },
        smoothing: { value: false },
        showLogo: { value: true },
        showWater: { value: false },
    });

    return (
        <>
            {perfVisible && <Perf position="top-left" />}

            <ambientLight intensity={0.5} />
            <directionalLight
                castShadow
                position={[2, 2, 3]}
                intensity={4}
                shadow-normalBias={0.04}
            />

            <Suspense fallback={<Placeholder scale={[3, 3, 1]} />}>
                {showWater && (
                    <Water
                        mouseSize={mouseSize}
                        deep={deep}
                        viscosity={viscosity}
                        smoothing={smoothing}
                    />
                )}
                {showLogo && (
                    <Logo
                        position={[0, 0, 0]}
                        rotation={[0, 0, 0]}
                        scale={1.5}
                    />
                )}
            </Suspense>
        </>
    );
}
