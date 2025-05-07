// Aidan will send a threejs-webrtc.
// npm install + node server.js to run the server
// What if I could make a 3D editor where the physics stay in place?
// Or each player has their own bubble?

// If changes are happening on the frontend, no need to restart the server.

// Inspo/resources:
// https://threejs.org/examples/webgl_marchingcubes.html // Q: How do we see what's actually being passed through?
// https://threejs.org/examples/?q=march#webgl_marchingcubes


// See also downloads/Metaballs-with-Physics-main 🚨

import * as THREE from "three";
import { FirstPersonControls } from "./FirstPersonControls.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/addons/loaders/DRACOLoader.js";
import RAPIER from 'https://cdn.skypack.dev/@dimforge/rapier3d-compat@0.11.2';
import { getBody } from "./getBody.js";
// import getLayer from "./getLayer.js";
import { MarchingCubes } from "three/addons/objects/MarchingCubes.js";

// create variables and make them available globally
let scene, myRenderer, camera, mousePos;

// keep track of which frame we are on
let frameCount = 0;

// keep track of our controls so we can update them in the draw loop
let controls;

let socket;

// 3D models
let leek; // Global variable to store the leek model

// Initialize Rapier
await RAPIER.init();
let gravity = { x: 0, y: 0, z: 0 };
let world = new RAPIER.World(gravity);

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
      gltf.scene.position.set(0, -3, 0);

      scene.add(gltf.scene);

      // Add a ground plane to receive shadows
      const plane = new THREE.Mesh(
        new THREE.PlaneGeometry(10, 10),
        new THREE.MeshStandardMaterial({ color: 0x973455 })
      );
      plane.receiveShadow = true;
      plane.rotation.x = -Math.PI / 2;
      plane.position.y = -3.1; // Position slightly below the model
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

      // Can adjust rotation for a better appearance, so each time it's different.
      leek.scene.rotation.y += Math.PI; // Making it face the player

      scene.add(leek.scene);

      console.log("Leek added in front of player at position:", targetPosition);

      // SENDING THROUGH WEBSOCKET
      // Then after the leek has been added for one single player, time to add it also to everyone else's machine.
        // But we're still moving around the same leek.
      // ⁉️ Is there a better structure in terms of order of operations?

      // ‼️ ‼️ ‼️ ‼️ ‼️ ‼️
      let myColor = document.getElementById('colorInput').value;
      let myMessage = {
        // Here you can add whatever data you want to send to the frontend from each client connected through websocket.
        // Here we're triggering it through the keydown event, but we could also add it to the draw loop, if we want it to keep hapenning.
        x: camera.position.x,
        y: camera.position.y,
        z: camera.position.z,
        color: myColor, // Client sends this to the server. Now server can send it to all clients.
      };

      socket.emit('msg', myMessage); // In theory, this triggers onMessage which triggers the torus.
    } else {
      console.log("Leek model not loaded yet");
    }
  }
}

// Triggered by onKeyDown event above - this happens:
function onMessage(msg){
  console.log(msg);
  // TBD understand what exactly is triggering the torus;
    // This is triggered from server side in response to onKeyDown.
  let geo = new THREE.TorusGeometry(2,0.1,12,12);
  let mat = new THREE.MeshNormalMaterial({color: msg.color});
  let mesh = new THREE.Mesh(geo,mat);
  mesh.position.set(msg.x,msg.y,msg.z);
  scene.add(mesh);

  // ++++
  // ‼️‼️‼️ If there's no leek information here, then we won't see a leek on other people's machines.
  // ⁉️ Also DB is still not getting filled.
  // ++++
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

/*
  RAPIER
  BODIES
*/

// How much of this is coming from MarchingCubes vs from rapier?

let numBodies, bodies, debugBodies, body;
let matcap, bodyDesc, mouseRigid, dynamicCollider;
let icoGeometry, icoMaterial, mouseMesh;
const textureLoader = new THREE.TextureLoader();

function addingBodies() {
  numBodies = 10;
  bodies = [];
  debugBodies = false;
  for (let i = 0; i < numBodies; i++) {
    body = getBody({debug: debugBodies, RAPIER, world});
    bodies.push(body);
    if (debugBodies) {
      scene.add(body.mesh);
    }
  }

  matcap = textureLoader.load("./assets/black-n-shiney.jpg");
  bodyDesc = RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(0, 0, 0)
  mouseRigid = world.createRigidBody(bodyDesc); // Look into this!
  dynamicCollider = RAPIER.ColliderDesc.ball(0.5);
  world.createCollider(dynamicCollider, mouseRigid);

  icoGeometry = new THREE.IcosahedronGeometry(0.35, 3);
  icoMaterial = new THREE.MeshMatcapMaterial({
    matcap
  });
  mouseMesh = new THREE.Mesh(icoGeometry, icoMaterial);
  mouseMesh.userData = {
    update() {
      // mouseRigid.setTranslation({ x: mousePos.x * 4, y: mousePos.y * 4, z: 0 }); // For Vector2
      // mouseRigid.setTranslation({ x: mousePos.x * 4, y: mousePos.y * 4, z: mousePos.z * 4 });
      mouseRigid.setTranslation({
        x: mousePos.x,
        y: mousePos.y,
        // z: mousePos.z
        z: 0
      });
      let { x, y, z } = mouseRigid.translation();
      mouseMesh.position.set(x, y, z);
    }
  };
  scene.add(mouseMesh);
}

// META BALLS
let metaMat, metaballs;

function createMetaballs() {
  metaMat = new THREE.MeshMatcapMaterial({
    matcap,
    vertexColors: true,
    // transparent: true, // debug
    // opacity: 0.8,
  });
  metaballs = new MarchingCubes(
    96, // resolution,
    metaMat,
    true, // enableUVs
    true, // enableColors
    90000 // max poly count
  );
  metaballs.scale.setScalar(5);
  metaballs.position.set(0, 0, 0); // Doesn't seem to work.
  metaballs.isolation = 1000;
  metaballs.userData = {
    update() {
      metaballs.reset();
      const strength = 0.5; // size-y
      const subtract = 10; // lightness
      bodies.forEach((b) => {
        const { x, y, z } = b.update();
        metaballs.addBall(x, y, z, strength, subtract, b.color.getHex());
      });
      metaballs.update();
    }
  };

  scene.add(metaballs);
}

// Add gradient background 🌸

function init() {
  scene = new THREE.Scene();
  scene.background = new THREE.Color("rgb(20,20,20)");

  // create the renderer which will actually draw our scene and add it to the document
  myRenderer = new THREE.WebGLRenderer({ antialias: true });
    // Anti-aliasing smoothes out edges
  myRenderer.setSize(window.innerWidth, window.innerHeight);
  myRenderer.shadowMap.enabled = true;
  myRenderer.shadowMap.type = THREE.PCFSoftShadowMap; // Default PCFShadowMap
  myRenderer.toneMapping = THREE.ACESFilmicToneMapping;
  myRenderer.outputColorSpace = THREE.SRGBColorSpace;
  document.body.appendChild(myRenderer.domElement);

  // create our camera
  // camera = new THREE.PerspectiveCamera(
  //   60,
  //   window.innerWidth / window.innerHeight,
  //   0.1,
  //   1000
  // );
  // camera.position.set(2, 2, 2);
  // camera.lookAt(0, 0, 0);

  // Matching video tutorial: 🌸
  camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
  camera.position.z = 5;

  // add orbit controls so we can navigate our scene while testing
  controls = new FirstPersonControls(scene, camera, myRenderer);

  mousePos = new THREE.Vector3(); // not using Vector3
  console.log(mousePos); // This is the initial version of mousePos.
  // Then we have to update it.

  // Added mouse move event listener 🌸
  document.addEventListener('mousemove', (event) => {
    // Perhaps normalizing is not even the move.
    // Calculate normalized device coordinates (-1 to +1)
    const x = (event.clientX / window.innerWidth) * 2 - 1;
    const y = -(event.clientY / window.innerHeight) * 2 + 1;
    const z = (event.clientZ / window.innerWidth) * 2 - 1; // ???????

    // Create a raycaster from the camera
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(new THREE.Vector3(x, y, z), camera);

    // Calculate intersection with the ground plane (y = -3)
    const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -3); // -3
    const intersectionPoint = new THREE.Vector3();
    raycaster.ray.intersectPlane(groundPlane, intersectionPoint);

    // Update mousePos with the 3D position
    mousePos.copy(intersectionPoint).multiplyScalar(4);
      // 🌸 go back to this to have the ball out of sight since I can't make it go in the right direction.
    // mousePos.copy(intersectionPoint);

    // mousePos.copy(intersectionPoint).divideScalar(3);
      // Worked now y=0 always.
      // But why is it always 0?
    // mousePos.copy(intersectionPoint).divideScalar(10); // Increased divisor to make values smaller
      // Feels like it's moving around like a circle around the origin.
    console.log("updated mousePos", mousePos);
  });

  // mesh
  // let grid = new THREE.GridHelper(100, 100);
  // scene.add(grid);

  // Add grid and axes helpers
  // const gridHelper = new THREE.GridHelper(20, 20, 0x444444, 0x888888);
  // scene.add(gridHelper);

  const axesHelper = new THREE.AxesHelper(5);
  scene.add(axesHelper);

    // Red line: X-axis
    // Green line: Y-axis
    // Blue line: Z-axis

  // add websocket support
  setupMySocket();

  lights();
  loadBricksModel();
  loadLeekModel();
  addingBodies();
  createMetaballs();

  // WEBSOCKET event listener, not related to Three.js. Only if we do actions over a variable with Three JS properties.
  window.addEventListener('keydown', onKeyDown);

  // Start the draw loop
  draw();
}

function draw() {
  controls.update();
  frameCount = frameCount + 1;

  world.step();
  mouseMesh.userData.update();
  metaballs.userData.update();
  myRenderer.render(scene, camera);

  // ask the browser to render another frame when it is ready
  window.requestAnimationFrame(draw);
}

// get everything started by calling init
init();
