import "./style.css";
import ReactDOM from "react-dom/client";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import Experience from "./Experience.js";
import * as THREE from "three";

if (window.location.hostname === "localhost") {
    window.parent.postMessage("localhost-alive", "*");
}

const root = ReactDOM.createRoot(document.querySelector("#root"));

root.render(
    <Canvas
        shadows
        gl={{
            antialias: true,
            toneMapping: THREE.ACESFilmicToneMapping,
            outputColorSpace: THREE.SRGBColorSpace,
        }}
        camera={{ fov: 30, near: 0.1, far: 100, position: [0, 0, 10] }}
    >
        {/* <OrbitControls /> */}
        <Experience />
    </Canvas>
);
