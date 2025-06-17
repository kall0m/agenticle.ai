import * as THREE from "three";
import { useRef, useMemo, useEffect, useState } from "react";
import { useThree, useFrame, extend } from "@react-three/fiber";
import { GPUComputationRenderer } from "three/addons/misc/GPUComputationRenderer.js";
import { SimplexNoise } from "three/addons/math/SimplexNoise.js";

const WIDTH = 1024;

class WaterMaterial extends THREE.MeshStandardMaterial {
    constructor(params) {
        super(params);
        this.defines = {
            STANDARD: "",
            USE_UV: "",
            WIDTH: WIDTH.toFixed(1),
            BOUNDS: "1.0", // placeholder, updated below
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
                    `#include <common>
uniform sampler2D heightmap;`
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

export default function Water({
    mouseSize = 0.2,
    deep = 0.01,
    viscosity = 0.93,
}) {
    const ref = useRef();
    const rayMesh = useRef();
    const { gl, camera, size, viewport } = useThree();
    const BOUNDS = viewport.width;
    const pointer = useRef(new THREE.Vector2());
    const raycaster = new THREE.Raycaster();
    const simplex = useMemo(() => new SimplexNoise(), []);

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
            const h = simplex.noise(x * 10, y * 10) * 0.05;
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
    }, [gl, mouseSize, deep, viscosity, simplex, BOUNDS]);

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
        if (
            !ready ||
            !computeRef.current ||
            !heightmapVarRef.current ||
            !smoothingVarRef.current
        )
            return;

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

        if (++frameCount % 2 === 0) {
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
