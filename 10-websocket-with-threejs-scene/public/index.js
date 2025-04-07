import * as THREE from "three";
import { FirstPersonControls } from "./FirstPersonControls.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/addons/loaders/DRACOLoader.js";

// create variables and make them available globally
let scene, myRenderer, camera;

// keep track of which frame we are on
let frameCount = 0;

// keep track of our controls so we can update them in the draw loop
let controls;

let socket;

function setupMySocket(){
  socket = io();
  socket.on('msg', onMessage);
}

function onMessage(msg){
  console.log(msg);
  let geo = new THREE.TorusGeometry(2,0.1,12,12);
  let mat = new THREE.MeshNormalMaterial();
  let mesh = new THREE.Mesh(geo,mat);
  mesh.position.set(msg.x,msg.y,msg.z);
  scene.add(mesh);
}

function onKeyDown(ev){
  if (ev.key === "p"){
    let myMessage = {
      x: camera.position.x,
      y: camera.position.y,
      z: camera.position.z
    };
    socket.emit('msg', myMessage);
  }
}

// TODO:
// See if material is correct;
// Add shadows;
// Play around with the lights;

function loadModel() {
  // first create a loader
  let loader = new GLTFLoader();

  // Set up Draco loader for compressed models
  const dracoLoader = new DRACOLoader();
  dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.6/'); // Use CDN path
  dracoLoader.setDecoderConfig({ type: 'js' }); // Use JavaScript decoder
  loader.setDRACOLoader(dracoLoader);

  // Create a fallback object in case the model fails to load
  const createFallbackObject = () => {
    console.log("Creating fallback object since model failed to load");
    // Colorful cube as fallback
    const geometry = new THREE.BoxGeometry(1, 1, 1);
    const material = new THREE.MeshStandardMaterial({ color: 0x00ff00 });
    const cube = new THREE.Mesh(geometry, material);
    cube.position.set(0, 0.5, 0);
    scene.add(cube);
  };

  // then load the file and add it to scene
  loader.load(
    "./models/bricks.gltf",
    // onLoad callback
    function (gltf) {
      console.log("Model loaded successfully!");

      // DEBUG: Log the entire model structure to inspect
      console.log("Full GLTF object:", gltf);

      // Traverse to debug materials and textures
      gltf.scene.traverse((obj) => {
        if (obj.isMesh) {
          console.log("Mesh found:", obj.name);
          console.log("Material:", obj.material);

          // Check if the material has a map (texture)
          if (obj.material && obj.material.map) {
            console.log("Has texture map:", obj.material.map);
          } else {
            console.log("No texture map found on this material");

            // Refine material properties for better lighting response // A texture wasn't needed after all.
            // Stone typically has a higher roughness value
            obj.material.roughness = 0.8;
            // Very slight metalness can enhance the look of stone
            obj.material.metalness = 0.05;
            // Increase material reflectivity for better light interaction
            obj.material.envMapIntensity = 1.5;

            console.log("Optimized material properties for stone appearance");
          }

          obj.castShadow = true;
          obj.receiveShadow = true;
        }
      });

      // Scale the model if needed
      gltf.scene.scale.set(1, 1, 1);
      // Position the model
      gltf.scene.position.set(0, 0, 0);

      scene.add(gltf.scene);

      // Add a ground plane to receive shadows
      const plane = new THREE.Mesh(
        new THREE.PlaneGeometry(10, 10),
        new THREE.MeshStandardMaterial({ color: 0x973455 })
      );
      plane.receiveShadow = true;
      plane.rotation.x = -Math.PI / 2;
      plane.position.y = -0.1; // Position slightly below the model
      scene.add(plane);
    },
    // onProgress callback
    function (xhr) {
      console.log((xhr.loaded / xhr.total * 100) + '% loaded');
    },
    // onError callback
    function (error) {
      console.error('An error happened when loading the model:', error);
      // Use the fallback object
      createFallbackObject();
    }
  );
}

function lights(){
  /* Lights */
  // More subtle ambient light
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.3);

  // Key light (main illumination)
  const keyLight = new THREE.DirectionalLight(0xffffff, 1.0);
  keyLight.position.set(5, 5, 5);
  keyLight.castShadow = true;
  keyLight.shadow.mapSize.width = 2048;
  keyLight.shadow.mapSize.height = 2048;
  keyLight.shadow.camera.near = 0.1;
  keyLight.shadow.camera.far = 50;
  keyLight.shadow.bias = -0.001;

  // Fill light (softer, from another angle)
  const fillLight = new THREE.DirectionalLight(0xffffff, 0.5);
  fillLight.position.set(-5, 3, -5);
  fillLight.castShadow = true;

  // Rim light (edge highlight)
  const rimLight = new THREE.DirectionalLight(0xffffff, 0.3);
  rimLight.position.set(0, -5, 0);

  scene.add(ambientLight);
  scene.add(keyLight);
  scene.add(fillLight);
  scene.add(rimLight);

  // Helper to visualize light position (uncomment to debug)
  // scene.add(new THREE.DirectionalLightHelper(keyLight, 1));
  // scene.add(new THREE.DirectionalLightHelper(fillLight, 1));
}

function init() {
  // create a scene and give it a background color
  scene = new THREE.Scene();
  scene.background = new THREE.Color("rgb(20,20,20)");

  // create the renderer which will actually draw our scene and add it to the document
  myRenderer = new THREE.WebGLRenderer({ antialias: true });
    // Anti-aliasing smoothes out edges
  myRenderer.setSize(window.innerWidth, window.innerHeight);
  myRenderer.shadowMap.enabled = true;
  myRenderer.shadowMap.type = THREE.PCFSoftShadowMap; // Default PCFShadowMap
  document.body.appendChild(myRenderer.domElement);

  // create our camera
  camera = new THREE.PerspectiveCamera(
    60,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
  );
  camera.position.set(2, 2, 2);
  camera.lookAt(0, 0, 0);

  // add orbit controls so we can navigate our scene while testing
  controls = new FirstPersonControls(scene, camera, myRenderer);

  // mesh
  let grid = new THREE.GridHelper(100, 100);
  scene.add(grid);

  // add websocket support
  setupMySocket();

  loadModel();
  lights();

  window.addEventListener('keydown', onKeyDown);

  // start the draw loop
  draw();
}

function draw() {
  controls.update();
  frameCount = frameCount + 1;

  myRenderer.render(scene, camera);

  // ask the browser to render another frame when it is ready
  window.requestAnimationFrame(draw);
}

// get everything started by calling init
init();
