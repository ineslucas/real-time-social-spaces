// Aidan will send a threejs-webrtc.

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

// 3D models
let leek; // Global variable to store the leek model

function loadBricksModel() {
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

function loadLeekModel(){
  let loader = new GLTFLoader(); // handles both glb and gltf files

  // Set up Draco loader for compressed models
  const dracoLoader = new DRACOLoader();
  dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.6/'); // Use CDN path
  dracoLoader.setDecoderConfig({ type: 'js' }); // Use JavaScript decoder
  loader.setDRACOLoader(dracoLoader);

  // then load the file and add it to scene
  loader.load(
    "./models/leek.gltf",
    // onLoad callback
    function (gltf) {
      console.log("Leek Model loaded successfully!");

      // Assigning the loaded model to the global leek variable
      leek = gltf;

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

            obj.material.roughness = 0.8;
            obj.material.metalness = 0.05;
            obj.material.envMapIntensity = 1.5; // Increase material reflectivity for better light interaction

            console.log("Optimized material properties for leek appearance");
          }

          obj.castShadow = true;
          obj.receiveShadow = true;
        }
      });
    },
    // onProgress callback
    function (xhr) {
      console.log((xhr.loaded / xhr.total * 100) + '% loaded');
    },
    // onError callback without fallback object atm.
    function (error) {
      console.error('An error happened when loading the model:', error);
    }
  );
}

/*
   WEBSOCKET
             */

function setupMySocket(){ // Initializing the socket connection - which needs to be called in init().
  // Step 1: Import library in index.html
  // Step 2: Initialize the socket connection.
  socket = io(); // This establishes the connection to the websocket server.

  socket.on('connect', onConnection); // Not needed, but good to have.

  // Step 3: Event handler for the connection.
  socket.on('msg', onMessage);
    // msg has been set up in the server as a message that will be sent out to everyone.
    // could also be socket.on('connect', onConnection);
      // connect is a built-in event that is triggered when the connection is established - which is why 'connection' does not work
      // onConnection or onMessage are the callback functions that are triggered when the message is received.
      // connect is a websocket event for frontend where as connection is a websocket event for the server.

  // Later:
  // Emit takes the data type, wraps it in an envelope and gives the variable a name, in this case we used msg, but this is just an arbitrary
  // Once the message is emitted by the sender, the server will then send it to all participants, including the one who initially emitted it.
}

function onConnection(){
  console.log("Our socket is connected to the server");
}

// this comes later!! triggered by onKeyDown event, should be underneath. 
function onMessage(msg){
  console.log(msg);
  // TBD understand what exactly is triggering the torus;
    // This is triggered from server side in response to onKeyDown.
  let geo = new THREE.TorusGeometry(2,0.1,12,12);
  let mat = new THREE.MeshNormalMaterial({color: msg.color});
  let mesh = new THREE.Mesh(geo,mat);
  mesh.position.set(msg.x,msg.y,msg.z);
  scene.add(mesh);
}

// onKeyDown is the function to follow the keydown event we set up in init.
function onKeyDown(ev){
  if (ev.key === "p"){
    let myColor = document.getElementById('colorInput').value;
      // Could be a global variable.
        // This color will be changed for all toruses depending on whether we're creating a new one or changing an existing one.
    let myMessage = {
      // Here you can add whatever data you want to send to the frontend from each client connected through websocket.
      // Here we're triggering it through the keydown event, but we could also add it to the draw loop, if we want it to keep hapenning.
      x: camera.position.x,
      y: camera.position.y,
      z: camera.position.z,
      color: myColor, // Client sends this to the server. Now server can send it to all clients.
    };
    socket.emit('msg', myMessage);
  }

  // Now how do you link so that it's only one persons's position being referenced? Aidan will send a repo.

  if (ev.key === "l" || ev.key === "L"){
    if (leek){
      // Simple positioning - not dynamic.
      // leek.scene.position.set(0, 1, 0); // y=1 above the brick
      // leek.scene.rotation.set(0, 4, 80);

      // Dynamic positioning - based on camera position.
        // Calculate position in front of the player
      // Get forward direction vector
      const forwardDir = new THREE.Vector3(0, 0, -1);
      forwardDir.applyQuaternion(camera.quaternion);

      // Scale it to place the leek 2 units in front of the camera
      const distance = 2;
      const targetPosition = new THREE.Vector3(
        camera.position.x + forwardDir.x * distance,
        camera.position.y - 0.5, // Slightly below eye level
        camera.position.z + forwardDir.z * distance
      );

      // Position the leek at the calculated position
      leek.scene.position.copy(targetPosition);

      // Make the leek face the player
      leek.scene.lookAt(camera.position);

      // Optional: adjust rotation for a better appearance
      leek.scene.rotation.y += Math.PI; // Make it face the player

      scene.add(leek.scene);

      console.log("Leek added in front of player at position:", targetPosition);

    } else {
      console.log("Leek model not loaded yet");
    }
  }
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

  lights();
  loadBricksModel();
  loadLeekModel();

  // WEBSOCKET event listener, not related to Three.js. Only if we do actions over a variable with Three JS properties.
  window.addEventListener('keydown', onKeyDown);

  // Start the draw loop
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
