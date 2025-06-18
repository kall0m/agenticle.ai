import * as THREE from "three";
import { useRef, useMemo, useEffect, useState } from "react";
import { useThree, useFrame, extend } from "@react-three/fiber";
import { GPUComputationRenderer } from "three/addons/misc/GPUComputationRenderer.js";
import { SimplexNoise } from "three/addons/math/SimplexNoise.js";
import { useControls } from "leva";

const isLowEnd =
    window.devicePixelRatio <= 1.5 || navigator.hardwareConcurrency <= 4;
const DEFAULT_WIDTH = isLowEnd ? 64 : 128;

class WaterMaterial extends THREE.MeshStandardMaterial {
    constructor(params) {
        super(params);
        this.defines = {
            STANDARD: "",
            USE_UV: "",
            WIDTH: DEFAULT_WIDTH.toFixed(1),
            BOUNDS: "1.0",
        };
        this.extra = {};
        this.addUniform("heightmap", null);
        this.onBeforeCompile = (shader) => {
            for (const name in this.extra) {
                shader.uniforms[name] = { value: this.extra[name] };
            }
            this.userData.shader = shader;
            shader.vertexShader = shader.vertexShader
                .replace(
                    "#include <common>",
                    `#include <common>\nuniform sampler2D heightmap;`
                )
                .replace(
                    "#include <beginnormal_vertex>",
                    `
                  vec2 cellSize = vec2( 1.0 / WIDTH, 1.0 / WIDTH );
                  vec3 objectNormal = vec3(
                    ( texture2D( heightmap, uv + vec2( -cellSize.x, 0 ) ).x - texture2D( heightmap, uv + vec2( cellSize.x, 0 ) ).x ) * WIDTH / BOUNDS,
                    ( texture2D( heightmap, uv + vec2( 0, -cellSize.y ) ).x - texture2D( heightmap, uv + vec2( 0, cellSize.y ) ).x ) * WIDTH / BOUNDS,
                    1.0 );
                `
                )
                .replace(
                    "#include <begin_vertex>",
                    `
                  float heightValue = texture2D(heightmap, uv).x;
                  vec3 transformed = vec3(position.x, position.y, heightValue);
                `
                );
        };
    }

    addUniform(name, value) {
        this.extra[name] = value;
        Object.defineProperty(this, name, {
            get: () => this.extra[name],
            set: (v) => {
                this.extra[name] = v;
                if (this.userData.shader)
                    this.userData.shader.uniforms[name].value = v;
            },
        });
    }
}

extend({ WaterMaterial });

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
    float mousePhase = clamp(length((uv - vec2(0.5)) * BOUNDS - vec2(mousePos.x, -mousePos.y)) * 3.1416 / mouseSize, 0.0, 3.1416);
    newHeight -= (cos(mousePhase) + 1.0) * deep;
    heightmapValue.y = heightmapValue.x;
    heightmapValue.x = newHeight;
    gl_FragColor = heightmapValue;
  }
`;

const smoothingFrag = `
  void main() {
    vec2 cellSize = 1.0 / resolution.xy;
    vec2 uv = gl_FragCoord.xy * cellSize;
    vec4 sum =
      texture2D(heightmap, uv + vec2(0.0, cellSize.y)) +
      texture2D(heightmap, uv - vec2(0.0, cellSize.y)) +
      texture2D(heightmap, uv + vec2(cellSize.x, 0.0)) +
      texture2D(heightmap, uv - vec2(cellSize.x, 0.0));
    gl_FragColor = sum * 0.25;
  }
`;

export default function Water() {
    const ref = useRef();
    const rayMesh = useRef();
    const { gl, camera, size, viewport } = useThree();
    const pointer = useRef(new THREE.Vector2());
    const raycaster = new THREE.Raycaster();
    const simplex = useMemo(() => new SimplexNoise(), []);

    const {
        mouseSize,
        deep,
        viscosity,
        smoothing,
        frameSkip,
        useSimplexNoise,
        baseHeight,
        renderResolution,
    } = useControls("Water Performance", {
        mouseSize: { value: 0.8, min: 0.01, max: 2, step: 0.01 },
        deep: { value: 0.004, min: 0, max: 0.02, step: 0.001 },
        viscosity: { value: 0.96, min: 0.8, max: 1, step: 0.005 },
        smoothing: { value: false },
        frameSkip: { value: isLowEnd ? 3 : 1, min: 1, max: 10, step: 1 },
        useSimplexNoise: { value: true },
        baseHeight: { value: 0.05, min: 0, max: 0.2, step: 0.005 },
        renderResolution: {
            options: {
                Low: 64,
                Medium: 128,
                High: 256,
            },
            value: DEFAULT_WIDTH,
        },
    });

    const WIDTH = renderResolution;
    const planeSize = Math.max(viewport.width, viewport.height);
    const BOUNDS = planeSize;

    const [ready, setReady] = useState(false);
    const computeRef = useRef();
    const heightmapVarRef = useRef();
    const smoothingVarRef = useRef();

    useEffect(() => {
        const gpuCompute = new GPUComputationRenderer(WIDTH, WIDTH, gl);

        const tex = gpuCompute.createTexture();
        const data = tex.image.data;
        for (let i = 0; i < data.length; i += 4) {
            const x = ((i / 4) % WIDTH) / WIDTH;
            const y = Math.floor(i / 4 / WIDTH) / WIDTH;
            const h = useSimplexNoise
                ? simplex.noise(x * 10, y * 10) * baseHeight
                : Math.random() * baseHeight;
            data[i] = h;
            data[i + 1] = h;
            data[i + 2] = 0;
            data[i + 3] = 1;
        }

        const heightmapVariable = gpuCompute.addVariable(
            "heightmap",
            heightmapFrag,
            tex
        );
        heightmapVariable.material.uniforms.mousePos = {
            value: new THREE.Vector2(10000, 10000),
        };
        heightmapVariable.material.uniforms.mouseSize = { value: mouseSize };
        heightmapVariable.material.uniforms.deep = { value: deep };
        heightmapVariable.material.uniforms.viscosity = { value: viscosity };
        heightmapVariable.material.defines.BOUNDS = BOUNDS.toFixed(1);
        gpuCompute.setVariableDependencies(heightmapVariable, [
            heightmapVariable,
        ]);

        const smoothingVariable = gpuCompute.addVariable(
            "smoothing",
            smoothingFrag,
            tex.clone()
        );
        gpuCompute.setVariableDependencies(smoothingVariable, [
            heightmapVariable,
        ]);

        const err = gpuCompute.init();
        if (err) console.error(err);
        else {
            computeRef.current = gpuCompute;
            heightmapVarRef.current = heightmapVariable;
            smoothingVarRef.current = smoothingVariable;
            setReady(true);
        }
    }, [
        gl,
        mouseSize,
        deep,
        viscosity,
        simplex,
        BOUNDS,
        WIDTH,
        useSimplexNoise,
        baseHeight,
    ]);

    useEffect(() => {
        const handleMove = (e) => {
            pointer.current.set(
                (e.clientX / size.width) * 2 - 1,
                -(e.clientY / size.height) * 2 + 1
            );
        };
        window.addEventListener("pointermove", handleMove);
        return () => window.removeEventListener("pointermove", handleMove);
    }, [size]);

    let frameCount = 0;

    useFrame(() => {
        if (!ready || !computeRef.current || !heightmapVarRef.current) return;

        frameCount++;
        if (frameCount % frameSkip !== 0) return;

        raycaster.setFromCamera(pointer.current, camera);
        const intersects = rayMesh.current
            ? raycaster.intersectObject(rayMesh.current)
            : [];
        if (intersects.length > 0) {
            const point = intersects[0].point;
            heightmapVarRef.current.material.uniforms.mousePos.value.set(
                point.x,
                point.z
            );
        } else {
            heightmapVarRef.current.material.uniforms.mousePos.value.set(
                10000,
                10000
            );
        }

        computeRef.current.compute();

        if (
            smoothing &&
            computeRef.current.getCurrentRenderTarget &&
            smoothingVarRef.current
        ) {
            computeRef.current.renderTexture(
                computeRef.current.getCurrentRenderTarget(
                    heightmapVarRef.current
                )?.texture,
                computeRef.current.getCurrentRenderTarget(
                    smoothingVarRef.current
                )
            );
            computeRef.current.renderTexture(
                computeRef.current.getCurrentRenderTarget(
                    smoothingVarRef.current
                )?.texture,
                computeRef.current.getCurrentRenderTarget(
                    heightmapVarRef.current
                )
            );
        }

        const heightmap = computeRef.current.getCurrentRenderTarget(
            heightmapVarRef.current
        )?.texture;
        if (ref.current && heightmap) ref.current.heightmap = heightmap;
    });

    return (
        <>
            <mesh rotation-x={-Math.PI / 2}>
                <planeGeometry args={[BOUNDS, BOUNDS, WIDTH - 1, WIDTH - 1]} />
                <waterMaterial
                    ref={ref}
                    color={0x8f90df}
                    metalness={0.9}
                    roughness={0}
                    transparent
                    opacity={1}
                    side={THREE.DoubleSide}
                />
            </mesh>
            <mesh ref={rayMesh} rotation-x={-Math.PI / 2} visible={false}>
                <planeGeometry args={[BOUNDS, BOUNDS]} />
                <meshBasicMaterial color={0xdad9fc} />
            </mesh>
        </>
    );
}
