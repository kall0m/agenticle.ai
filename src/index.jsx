import "./style.css";
import ReactDOM from "react-dom/client";
import { Canvas } from "@react-three/fiber";
import Experience from "./Experience.js";

if (window.location.hostname === "localhost") {
    window.parent.postMessage("localhost-alive", "*");
}

const root = ReactDOM.createRoot(document.querySelector("#root"));

root.render(
    <Canvas>
        <Experience />
    </Canvas>
);
