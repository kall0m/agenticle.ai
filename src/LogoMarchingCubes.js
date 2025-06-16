import React, { useMemo } from "react";
import { useGLTF } from "@react-three/drei";
import { MarchingCube } from "@react-three/drei";
import * as THREE from "three";

export default function LogoMarchingCubes({
    strength = 0.6,
    subtract = 10,
    color = "#8F90DF",
}) {
    const { nodes } = useGLTF("./agenticle-logo.glb");

    const positions = useMemo(() => {
        const geometry = nodes.Curve.geometry.clone();
        geometry.computeBoundingBox();

        // Normalize size to fit in [-1,1] range
        const size = new THREE.Vector3();
        geometry.boundingBox.getSize(size);
        const max = Math.max(size.x, size.y, size.z);
        const scale = 1 / max;

        geometry.center();
        geometry.scale(scale, scale, scale);

        const pos = [];
        const positionAttr = geometry.attributes.position;
        const step = 20;
        for (let i = 0; i < positionAttr.count; i += step) {
            pos.push([
                positionAttr.getX(i),
                positionAttr.getY(i),
                positionAttr.getZ(i),
            ]);
        }

        return pos;
    }, [nodes]);

    return (
        <>
            {positions.map((pos, i) => (
                <MarchingCube
                    key={i}
                    position={pos}
                    strength={strength}
                    subtract={subtract}
                    color={color}
                />
            ))}
        </>
    );
}

useGLTF.preload("./agenticle-logo.glb");
