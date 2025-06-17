import * as THREE from "three";
import { useRef, useMemo, useEffect } from "react";
import { useFrame, useThree, extend } from "@react-three/fiber";
import { shaderMaterial, useTexture } from "@react-three/drei";
import { GPUComputationRenderer } from "three/addons/misc/GPUComputationRenderer.js";

const WIDTH = 128;
const BOUNDS = 6;
const BOUNDS_HALF = BOUNDS * 0.5;

// GLSL: fragment shader to simulate wave propagation
const heightmapFrag = `
  uniform vec2 mousePos;
  uniform float mouseSize;
  uniform float viscosity;
  uniform float deep;
  void main() {
    vec2 cellSize = 1.0 / resolution.xy;
    vec2 uv = gl_FragCoord.xy * cellSize;
    vec4 heightmapValue = texture2D(heightmap, uv);
    vec4 north = texture2D(heightmap, uv + vec2(0.0, cellSize.y));
    vec4 south = texture2D(heightmap, uv - vec2(0.0, cellSize.y));
    vec4 east = texture2D(heightmap, uv + vec2(cellSize.x, 0.0));
    vec4 west = texture2D(heightmap, uv - vec2(cellSize.x, 0.0));
    float newHeight = ((north.x + south.x + east.x + west.x) * 0.5 - heightmapValue.y) * viscosity;
    float mousePhase = clamp(length((uv - vec2(0.5)) * ${BOUNDS.toFixed(
        1
    )} - vec2(mousePos.x, -mousePos.y)) * 3.1416 / mouseSize, 0.0, 3.1416);
    newHeight -= (cos(mousePhase) + 1.0) * deep;
    heightmapValue.y = heightmapValue.x;
    heightmapValue.x = newHeight;
    gl_FragColor = heightmapValue;
  }
`;

// Water material
const WaterMaterial = shaderMaterial(
    {
        heightmap: null,
        time: 0,
    },
    `varying vec2 vUv;
   void main() {
     vUv = uv;
     gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
   }`,
    `uniform sampler2D heightmap;
   varying vec2 vUv;
   void main() {
     float h = texture2D(heightmap, vUv).x;
     vec3 color = vec3(0.4, 0.7, 0.9) + h * 2.0;
     gl_FragColor = vec4(color, 0.9);
   }`
);

extend({ WaterMaterial });

WaterMaterial.key = "waterShader";

export default function Water({
    mouseSize = 0.2,
    deep = 0.01,
    viscosity = 0.93,
}) {
    const ref = useRef();
    const meshRef = useRef();
    const { gl, camera, size } = useThree();

    const gpuCompute = useMemo(
        () => new GPUComputationRenderer(WIDTH, WIDTH, gl),
        [gl]
    );

    const heightmap0 = useMemo(() => {
        const tex = gpuCompute.createTexture();
        const data = tex.image.data;
        for (let i = 0; i < data.length; i += 4) {
            const h = Math.random() * 0.05;
            data[i] = h;
            data[i + 1] = h;
            data[i + 2] = 0;
            data[i + 3] = 1;
        }
        return tex;
    }, [gpuCompute]);

    const variable = useMemo(() => {
        const v = gpuCompute.addVariable(
            "heightmap",
            heightmapFrag,
            heightmap0
        );
        v.material.uniforms["mousePos"] = {
            value: new THREE.Vector2(10000, 10000),
        };
        v.material.uniforms["mouseSize"] = { value: mouseSize };
        v.material.uniforms["deep"] = { value: deep };
        v.material.uniforms["viscosity"] = { value: viscosity };
        v.material.defines.BOUNDS = BOUNDS.toFixed(1);
        gpuCompute.setVariableDependencies(v, [v]);
        const err = gpuCompute.init();
        if (err) console.error(err);
        return v;
    }, [gpuCompute, mouseSize, deep, viscosity, heightmap0]);

    const mouse = useRef(new THREE.Vector2(10000, 10000));

    useEffect(() => {
        const handleMove = (e) => {
            const x = (e.clientX / size.width) * 2 - 1;
            const y = -(e.clientY / size.height) * 2 + 1;
            const vec = new THREE.Vector3(x, y, 0.5).unproject(camera);
            const dir = vec.sub(camera.position).normalize();
            const distance = -camera.position.y / dir.y;
            const pos = camera.position
                .clone()
                .add(dir.multiplyScalar(distance));
            mouse.current.set(pos.x, pos.z);
        };
        window.addEventListener("pointermove", handleMove);
        return () => window.removeEventListener("pointermove", handleMove);
    }, [camera, size]);

    useFrame(() => {
        variable.material.uniforms["mousePos"].value.copy(mouse.current);
        gpuCompute.compute();
        if (ref.current)
            ref.current.heightmap =
                gpuCompute.getCurrentRenderTarget(variable).texture;
    });

    return (
        <mesh ref={meshRef} rotation-x={-Math.PI / 2}>
            <planeGeometry args={[BOUNDS, BOUNDS, WIDTH - 1, WIDTH - 1]} />
            <waterMaterial ref={ref} />
        </mesh>
    );
}
