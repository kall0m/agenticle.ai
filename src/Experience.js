import { useFrame } from "@react-three/fiber";
import { useRef } from "react";

export default function Experience() {
    const meshRef = useRef();

    useFrame((state, delta) => {
        meshRef.current.rotation.y += delta;
    });

    return (
        <>
            <mesh ref={meshRef}>
                <torusKnotGeometry />
                <meshNormalMaterial />
            </mesh>
        </>
    );
}
