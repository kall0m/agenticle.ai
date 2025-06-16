import * as THREE from "three";
import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { MarchingCube } from "@react-three/drei";
import { RigidBody, BallCollider } from "@react-three/rapier";

export default function Pointer({ vec = new THREE.Vector3() }) {
    const ref = useRef();

    useFrame(({ pointer, viewport }) => {
        const { width, height } = viewport.getCurrentViewport();
        vec.set(pointer.x * (width / 2) - 2, pointer.y * (height / 2), 0);
        ref.current.setNextKinematicTranslation(vec);
    });

    return (
        <RigidBody type="kinematicPosition" colliders={false} ref={ref}>
            <MarchingCube strength={0.5} subtract={12} color="#DAD9FC" />
            <BallCollider args={[0.1]} type="dynamic" />
        </RigidBody>
    );
}
