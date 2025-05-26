import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import GUI from "lil-gui";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import holographicVertexShader from "./shaders/holographic/vertex.glsl";
import holographicFragmentShader from "./shaders/holographic/fragment.glsl";

/**
 * Base
 */
// Debug
const gui = new GUI();
gui.close();

// Canvas
const canvas = document.querySelector("canvas.webgl");

// Scene
const scene = new THREE.Scene();

// Loaders
const gltfLoader = new GLTFLoader();

/**
 * Sizes
 */
const sizes = {
    width: window.innerWidth,
    height: window.innerHeight,
};

window.addEventListener("resize", () => {
    // Update sizes
    sizes.width = window.innerWidth;
    sizes.height = window.innerHeight;

    // Update camera
    camera.aspect = sizes.width / sizes.height;
    camera.updateProjectionMatrix();

    // Update renderer
    renderer.setSize(sizes.width, sizes.height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
});

/**
 * Camera
 */

const radToDeg = (r) => r * (180 / Math.PI);
const degToRad = (d) => d * (Math.PI / 180);

// Base camera
const camera = new THREE.PerspectiveCamera(
    70,
    sizes.width / sizes.height,
    0.01,
    1000
);
camera.position.set(0, 0, 0);
camera.rotation.set(degToRad(10), degToRad(0), degToRad(45));
scene.add(camera);

// Controls
// const controls = new OrbitControls(camera, canvas);
// controls.enableDamping = true;

const cameraFolder = gui.addFolder("Camera");

const cameraPerspective = {
    fov: camera.fov,
};

cameraFolder.add(cameraPerspective, "fov", 0, 100, 1).onChange(() => {
    camera.fov = cameraPerspective.fov;
    camera.updateProjectionMatrix();
});

const cameraPosition = {
    x: camera.position.x,
    y: camera.position.y,
    z: camera.position.z,
};

cameraFolder.add(cameraPosition, "x", -100, 100, 0.00001).onChange(() => {
    camera.position.x = cameraPosition.x;
});
cameraFolder.add(cameraPosition, "y", -100, 100, 0.00001).onChange(() => {
    camera.position.y = cameraPosition.y;
});
cameraFolder.add(cameraPosition, "z", -100, 100, 0.00001).onChange(() => {
    camera.position.z = cameraPosition.z;
});

const cameraRotationDegrees = {
    x: radToDeg(camera.rotation.x),
    y: radToDeg(camera.rotation.y),
    z: radToDeg(camera.rotation.z),
};

cameraFolder.add(cameraRotationDegrees, "x", -180, 180, 0.1).onChange(() => {
    camera.rotation.x = degToRad(cameraRotationDegrees.x);
});
cameraFolder.add(cameraRotationDegrees, "y", -180, 180, 0.1).onChange(() => {
    camera.rotation.y = degToRad(cameraRotationDegrees.y);
});
cameraFolder.add(cameraRotationDegrees, "z", -180, 180, 0.1).onChange(() => {
    camera.rotation.z = degToRad(cameraRotationDegrees.z);
});

/**
 * Renderer
 */
const rendererParameters = {};
rendererParameters.clearColor = "#040307";

const renderer = new THREE.WebGLRenderer({
    canvas: canvas,
    antialias: true,
});
renderer.setClearColor(rendererParameters.clearColor);
renderer.setSize(sizes.width, sizes.height);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

gui.addColor(rendererParameters, "clearColor").onChange(() => {
    renderer.setClearColor(rendererParameters.clearColor);
});

/**
 * Material
 */
const materialParameters = {};
materialParameters.color = "#88afd3";

gui.addColor(materialParameters, "color").onChange(() => {
    material.uniforms.uColor.value.set(materialParameters.color);
});

const material = new THREE.ShaderMaterial({
    vertexShader: holographicVertexShader,
    fragmentShader: holographicFragmentShader,
    uniforms: {
        uTime: new THREE.Uniform(0),
        uColor: new THREE.Uniform(new THREE.Color(materialParameters.color)),
    },
    transparent: true,
    side: THREE.DoubleSide,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
});

/**
 * Objects
 */
let mixer = null;

// Tentacle
let tentacle = null;
gltfLoader.load("./tentacle.glb", (gltf) => {
    mixer = new THREE.AnimationMixer(gltf.scene);
    const action = mixer.clipAction(gltf.animations[0]);

    action.play();

    tentacle = gltf.scene;
    tentacle.traverse((child) => {
        if (child.isMesh) child.material = material;
    });

    tentacle.position.set(-7, -3, -5.2);
    tentacle.rotation.set(degToRad(50), degToRad(-108), degToRad(50));

    const tentacleFolder = gui.addFolder("Tentacle");

    const tentaclePosition = {
        x: tentacle.position.x,
        y: tentacle.position.y,
        z: tentacle.position.z,
    };

    tentacleFolder.add(tentaclePosition, "x", -100, 100, 0.01).onChange(() => {
        tentacle.position.x = tentaclePosition.x;
    });
    tentacleFolder.add(tentaclePosition, "y", -100, 100, 0.01).onChange(() => {
        tentacle.position.y = tentaclePosition.y;
    });
    tentacleFolder.add(tentaclePosition, "z", -100, 100, 0.01).onChange(() => {
        tentacle.position.z = tentaclePosition.z;
    });

    const tentacleRotationDegrees = {
        x: radToDeg(tentacle.rotation.x),
        y: radToDeg(tentacle.rotation.y),
        z: radToDeg(tentacle.rotation.z),
    };

    tentacleFolder
        .add(tentacleRotationDegrees, "x", -180, 180, 0.1)
        .onChange(() => {
            tentacle.rotation.x = degToRad(tentacleRotationDegrees.x);
        });
    tentacleFolder
        .add(tentacleRotationDegrees, "y", -180, 180, 0.1)
        .onChange(() => {
            tentacle.rotation.y = degToRad(tentacleRotationDegrees.y);
        });
    tentacleFolder
        .add(tentacleRotationDegrees, "z", -180, 180, 0.1)
        .onChange(() => {
            tentacle.rotation.z = degToRad(tentacleRotationDegrees.z);
        });

    scene.add(tentacle);
});

/**
 * Animate
 */
const clock = new THREE.Clock();
let previousTime = 0;

const tick = () => {
    const elapsedTime = clock.getElapsedTime();
    const deltaTime = elapsedTime - previousTime;
    previousTime = elapsedTime;

    // Update material
    material.uniforms.uTime.value = elapsedTime;

    // Rotate objects
    // if (tentacle) {
    //     tentacle.rotation.x = -elapsedTime * 0.1;
    //     tentacle.rotation.y = elapsedTime * 0.2;
    // }

    // Update mixer
    if (mixer !== null) {
        mixer.update(deltaTime);
    }

    // Update controls
    // controls.update();

    // Render
    renderer.render(scene, camera);

    // Call tick again on the next frame
    window.requestAnimationFrame(tick);
};

tick();
