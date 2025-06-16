import * as THREE from "three";
import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { MarchingCube } from "@react-three/drei";
import { RigidBody, BallCollider } from "@react-three/rapier";

export default function MetaBall({
    color,
    vec = new THREE.Vector3(),
    ...props
}) {
    const api = useRef();

    useFrame((state, delta) => {
        delta = Math.min(delta, 0.1);
        api.current.applyImpulse(
            vec
                .copy(api.current.translation())
                .normalize()
                .multiplyScalar(delta * -0.05)
        );
    });

    return (
        <RigidBody
            ref={api}
            colliders={false}
            linearDamping={4}
            angularDamping={0.95}
            {...props}
        >
            <MarchingCube strength={0.5} subtract={12} color={color} />
            <BallCollider args={[0.1]} type="dynamic" />
        </RigidBody>
    );
}
