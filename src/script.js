import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { TrackballControls } from 'three/examples/jsm/controls/TrackballControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';

import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { GammaCorrectionShader } from 'three/examples/jsm/shaders/GammaCorrectionShader.js';
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { SMAAPass } from 'three/examples/jsm/postprocessing/SMAAPass.js';
import { ACESFilmicToneMappingShader } from 'three/examples/jsm/Addons.js';
import * as dat from 'lil-gui';


// Base
const gui = new dat.GUI();
gui.hide();
const canvas = document.querySelector('canvas.webgl');
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000000);

// Loaders
const rgbeLoader = new RGBELoader();
rgbeLoader.load("/env-metal-1.hdr", (texture) => {
  texture.mapping = THREE.EquirectangularReflectionMapping;
  scene.environment = texture;
  scene.environmentIntensity = 3.0;
});

// Models

const dracoLoader = new DRACOLoader();
dracoLoader.setDecoderPath("/draco/");
dracoLoader.setDecoderConfig({ type: 'js' });
const gltfLoader = new GLTFLoader();
gltfLoader.setDRACOLoader(dracoLoader);
gltfLoader.load("/Tumbler.glb", (gltf) => {
  const model = gltf.scene;
  model.scale.set(2, 2,2);
  model.position.set(0,-0.09,0);
  scene.add(model);
  updateAllMaterials();
}, undefined, (error) => {
  console.error(error);
});

// Lights
const ambientLight = new THREE.AmbientLight(0xffffff, 3.5); // Soft white ambient light
scene.add(ambientLight);

const directionalLight1 = new THREE.DirectionalLight(0xffffff, 5.8); // Soft white directional light
directionalLight1.position.set(1, 1, 1); // Position the light
scene.add(directionalLight1);

const directionalLight2 = new THREE.DirectionalLight(0xffffff, 5.5); // Soft white directional light
directionalLight2.position.set(-1, 0, 0); // Position the light
scene.add(directionalLight2);

// Sizes
const sizes = {
    width: window.innerWidth,
    height: window.innerHeight
};
window.addEventListener('resize', () => {
    sizes.width = window.innerWidth;
    sizes.height = window.innerHeight;
    camera.aspect = sizes.width / sizes.height;
    camera.updateProjectionMatrix();
    renderer.setSize(sizes.width, sizes.height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    effectComposer.setSize(sizes.width, sizes.height);
    effectComposer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
});

// Camera
const camera = new THREE.PerspectiveCamera(35, window.innerWidth / window.innerHeight, 0.1, 15);
camera.position.set(0.1327, 0.3490, 0.4392);
scene.add(camera);

// Controls
const controls = new TrackballControls(camera, canvas);
controls.enableDamping = true;
controls.enableZoom = false;



// Renderer
const renderer = new THREE.WebGLRenderer({
    canvas: canvas,
    antialias: true,
});
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;
renderer.physicallyCorrectLights = true;
renderer.outputEncoding = THREE.sRGBEncoding;
renderer.toneMapping = THREE.ReinhardToneMapping;
renderer.toneMappingExposure = 1.5;
renderer.setSize(sizes.width, sizes.height);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

// Post processing
const renderTarget = new THREE.WebGLRenderTarget(800, 600, { samples: 2 });
const effectComposer = new EffectComposer(renderer, renderTarget);
effectComposer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
effectComposer.setSize(sizes.width, sizes.height);

// Render pass
const renderPass = new RenderPass(scene, camera);
effectComposer.addPass(renderPass);



// ACESFILMIC  pass
const ACESFilmShiftPass = new ShaderPass(ACESFilmicToneMappingShader);
ACESFilmShiftPass.enabled = true;
effectComposer.addPass(ACESFilmShiftPass);

// Gamma correction pass
const gammaCorrectionPass = new ShaderPass(GammaCorrectionShader);
effectComposer.addPass(gammaCorrectionPass);

// Antialias pass
if(renderer.getPixelRatio() === 1 && !renderer.capabilities.isWebGL2) {
    const smaaPass = new SMAAPass();
    effectComposer.addPass(smaaPass);
}

const params = {
    environmentIntensity: scene.environmentIntensity
};

gui.add(params, 'environmentIntensity', 1, 100).onChange(function(value) {
    scene.environmentIntensity = value;
});




// Animate
const clock = new THREE.Clock();
const tick = () => {
    const elapsedTime = clock.getElapsedTime();
    controls.update();
    effectComposer.render();
    window.requestAnimationFrame(tick);
};

tick();

// Function to update all materials
const updateAllMaterials = () => {
    scene.traverse((child) => {
        if(child instanceof THREE.Mesh && child.material instanceof THREE.MeshStandardMaterial) {
            child.material.envMapIntensity = 8.5;
            child.material.needsUpdate = true;
            child.castShadow = true;
            child.receiveShadow = true;
        }
    });
};
