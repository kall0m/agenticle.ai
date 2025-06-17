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

export default function Experience() {
    return (
        <>
            <directionalLight
                castShadow
                position={[2, 2, 3]}
                intensity={2}
                shadow-normalBias={0.04}
            />
            <ambientLight intensity={0.5} />

            {/* <Suspense fallback={<Placeholder scale={[3, 3, 1]} />}>
                <Logo position={[2, 0, 0]} rotation={[0, -0.3, 0]} />
            </Suspense> */}

            {/* <Physics gravity={[0, 2, 0]}>
                <MarchingCubes
                    resolution={50}
                    maxPolyCount={20000}
                    enableUvs={false}
                    enableColors={true}
                    position={[2, 0, 0]}
                >
                    <meshStandardMaterial
                        vertexColors
                        thickness={0.15}
                        roughness={0}
                    />
                    <MetaBall color="#B3B1F9" position={[1, 1, 0.5]} />
                    <MetaBall color="#8F90DF" position={[-1, -1, -0.5]} />
                    <MetaBall color="#FC8759" position={[2, 2, 0.5]} />
                    <MetaBall color="#FC8759" position={[-2, -2, -0.5]} />
                    <MetaBall color="#B3B1F9" position={[3, 3, 0.5]} />
                    <MetaBall color="#8F90DF" position={[-3, -3, -0.5]} />
                    <Pointer />

                    <MarchingPlane planeType="y" strength={0.5} subtract={12} />
                </MarchingCubes>
            </Physics> */}

            {/* <Ocean /> */}

            <Suspense fallback={<Placeholder scale={[3, 3, 1]} />}>
                <Water mouseSize={0.28} deep={0.004} viscosity={0.96} />
            </Suspense>
        </>
    );
}
