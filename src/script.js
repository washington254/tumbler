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
// gui.hide();
const canvas = document.querySelector('canvas.webgl');
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000000);

// Loaders
const rgbeLoader = new RGBELoader();
rgbeLoader.load("/new.hdr", (texture) => {
  texture.mapping = THREE.EquirectangularReflectionMapping;
  scene.environment = texture;
  scene.environmentIntensity = .8;
});


function isMobileDevice() {
    return (typeof window.orientation !== "undefined") || (navigator.userAgent.indexOf('IEMobile') !== -1);
}
// Models

const dracoLoader = new DRACOLoader();
dracoLoader.setDecoderPath("/draco/");
dracoLoader.setDecoderConfig({ type: 'js' });
const gltfLoader = new GLTFLoader();
gltfLoader.setDRACOLoader(dracoLoader);
gltfLoader.load("/glass1.glb", (gltf) => {
    const model = gltf.scene;
  
    // Set scale based on the device type
    if (isMobileDevice()) {
      model.scale.set(0.4, 0.4, 0.4);
    } else {
      model.scale.set(0.5, 0.5, 0.5);
    }
  
    model.position.set(0, -0.25, 0);
    scene.add(model);
  
    // Iterate through the model's children to find the glass material and set its envMap to null
    model.traverse((child) => {
      if (child instanceof THREE.Mesh && child.material) {
        child.material.envMap = null; // Disable reflections
        child.material.needsUpdate = true; // Ensure the material updates
      }
    });
  
    updateAllMaterials();
  }, undefined, (error) => {
    console.error(error);
  });
  

// Lights
const ambientLight = new THREE.AmbientLight(0xffffff, 3.5); // Soft white ambient light
// scene.add(ambientLight);

const directionalLight1 = new THREE.DirectionalLight(0xffffff, 5.8); // Soft white directional light
directionalLight1.position.set(1, 1, 1); // Position the light
// scene.add(directionalLight1);

const directionalLight2 = new THREE.DirectionalLight(0xffffff, 5.5); // Soft white directional light
directionalLight2.position.set(-1, 0, 0); // Position the light
// scene.add(directionalLight2);

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



const camera = new THREE.PerspectiveCamera(35, window.innerWidth / window.innerHeight, 0.1, 15);
//if (isMobileDevice()) {
//    camera.position.set(-0.35, 0.0, 1.75); 
//} else {
//    camera.position.set(-0.35, 0, 0.83) 
//}
//if (isMobileDevice()) {
//    camera.position.set(0.49968657353843976, 0.0610650897071002, -0.1); 
//} else {
//}

// _Vector3 {x: 1.3822157987636756, y: 0.2881737793754688, z: 0.29070793416240975}
// _Vector3 {x: 1.0211747084341387, y: 0.16511792530188898, z: 0.510358181988533}
camera.position.set( 1.0211747084341387,0.16511792530188898, 0.510358181988533); 
scene.add(camera);

const controls = new TrackballControls(camera, canvas);

controls.enableDamping = true; 
controls.noZoom = true;
controls.noPan = true;

controls.mouseButtons = {
    LEFT: THREE.MOUSE.ROTATE,
    MIDDLE: THREE.MOUSE.ROTATE, 
    RIGHT: THREE.MOUSE.ROTATE, 
};
controls.rotateSpeed = 0.8;

//////////////////////////////////////////////////
//// ON MOUSE MOVE TO GET CAMERA POSITION
document.addEventListener('mousemove', (event) => {
    event.preventDefault()

    console.log(camera.position)

}, false)


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

gui.add(params, 'environmentIntensity', 0, 20).onChange(function(value) {
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
            child.material.envMapIntensity = 1.5;
            child.material.needsUpdate = true;
            child.castShadow = true;
            child.receiveShadow = true;
        }
    });
};
