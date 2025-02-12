/*
What we're going to do today:

-initial scene setup (revisit)

- using an init function to clean up code

- add a texture
- textures can describe more than just images
- they can describe surface properties like opacity or shinyness

- add a draw loop (use window.requestAnimationFrame)

- exercise - do something dynamic within the draw loop

- define and use frameCount to have things happen along frame

*/


// ~~ Base Code ~~ //

// It's a module -> console logging from browser won't work.

// Because this is a module script, we can import code from other modules
// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Modules

// LINK TO PROFS SKETCH:
// https://glitch.com/edit/#!/rtss-spring-2025-week-03?path=index.js%3A10%3A37

import * as THREE from "three";
// import { OrbitControls } from 'three/addons/';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'; // Need to use the path on the reference. Issue was how I was calling it.

// Create variables and make them available globally
let scene;
let renderer;
let camera;
let myMesh;
let box;
let orbitControls;

let bird;
let wingL, wingR;
let wingContainerL, wingContainerR;

function init() {
  // create a scene container in which all other objects will exist
  scene = new THREE.Scene();
  scene.background = new THREE.Color("rgb(200,100,200)");

  // the renderer will actually show the camera view within our <canvas>
  renderer = new THREE.WebGLRenderer();
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(renderer.domElement);

  // create a camera and position it in space
  let aspect = window.innerWidth / window.innerHeight;
  camera = new THREE.PerspectiveCamera(75, aspect, 0.1, 1000);
  camera.position.set(0, 0, 10);

  // Create texture and load in image file
  let textureLoader = new THREE.TextureLoader();
  let catTexture = textureLoader.load("https://cdn.glitch.global/18ea5c93-0dd1-4772-b259-e401c006dff9/cat.jpeg?v=1706576535456");

  // create a normal texture
  let normTex = textureLoader.load("https://cdn.glitch.global/1979d611-eb79-4e73-b9d0-5cfd17969b7c/rocky_terrain_nor_gl_1k.jpg?v=1739233992220");

  // wrap our texture a few times
  catTexture.wrapS = THREE.RepeatWrapping;
  catTexture.wrapT = THREE.RepeatWrapping;
  catTexture.repeat.set(3,3);

  // same with our normal texture
  normTex.wrapS = THREE.RepeatWrapping;
  normTex.wrapT = THREE.RepeatWrapping;
  normTex.repeat.set(3,3);

  // Scene background texture
  let backgroundTex = textureLoader.load("https://cdn.glitch.global/1979d611-eb79-4e73-b9d0-5cfd17969b7c/warm_restaurant_1k.jpeg?v=1739234447905");
  backgroundTex.mapping = THREE.EquirectangularReflectionMapping;
  // scene.background = backgroundTex;

  // Make a box and add it
  let boxGeo = new THREE.BoxGeometry(1, 2, 3);
  let boxMat = new THREE.MeshBasicMaterial({ map: catTexture });
  myMesh = new THREE.Mesh(boxGeo, boxMat);
  // scene.add(myMesh);

  // add a directional light from above
  let directionalLight = new THREE.DirectionalLight( 0xffffff, 2.5 );
  scene.add( directionalLight );

  // add an ambient light
  let ambientLight = new THREE.AmbientLight(0xffffff, 1.0);
  scene.add(ambientLight);

  orbitControls = new OrbitControls(camera, renderer.domElement);
    // DEBUG: check network tab to see if script has been loaded + check link and paste on browser.
    // OrbitControls shouldn't be imported from THREE namespace because it's not coming from that library.
    // https://unpkg.com/three@0.172.0/examples/jsm/controls/OrbitControls.js
    // OrbitControls also need to be added after creating the camera.

  orbitControls.enableDamping = true;
  console.log("orbitControls", orbitControls);

  addBird();

  // Start the draw loop
  draw();
}

function addBird() {
  // Creating box for bird
  let birdBodyGeo = new THREE.BoxGeometry(3,1,1);
  let birdBodyMat = new THREE.MeshPhongMaterial({color: new THREE.Color("rgb(250,0,0)")})
  let birdBodyMesh = new THREE.Mesh(birdBodyGeo, birdBodyMat);
  scene.add(birdBodyMesh);

  bird = birdBodyMesh;

  let birdWingGeometry = new THREE.BoxGeometry(1,0.2,3);
  let birdWingMat = new THREE.MeshBasicMaterial({color: new THREE.Color("rgb(0,0,250)")})

  // Right wing
  wingR = new THREE.Mesh(birdWingGeometry,birdWingMat);
  wingContainerR = new THREE.Group();
  wingContainerR.add(wingR);
  wingR.position.z = 1.5;
  bird.add(wingContainerR);

  // Left wing
  wingL = new THREE.Mesh(birdWingGeometry,birdWingMat);
  wingL.position.z = -1.5;
  wingContainerL = new THREE.Group();
  wingContainerL.add(wingL);
  bird.add(wingContainerL);
      // What is bird.add doing? Creating a group already?

  // Creating beak
  let birdBeakGeo = new THREE.ConeGeometry(0.15,0.5,10);
  let birdBeakMat = new THREE.MeshBasicMaterial({color: new THREE.Color("rgb(250,250,0)")})
  let birdBeakMesh = new THREE.Mesh(birdBeakGeo, birdBeakMat);
  birdBeakMesh.position.set(-1.7,-0.2,0);
    // Q: Is there a way to place the birdBeakMesh on the surface of birdBodyMesh?
  birdBeakMesh.rotation.z = Math.PI / 2; // Math.PI = 180 degrees -> then divide by 2, 4, 6, ect.
  bird.add(birdBeakMesh);

  // Create group so I can move them all together.
  let birdGroup = new THREE.Group();
  birdGroup.add(bird);
  scene.add(birdGroup);

  // Moving the whole bird
    // Though moving the camera would respect bird physics.
  birdGroup.rotation.y = Math.PI / 3;
  bird.rotation.x = Math.PI / 8;
  bird.rotation.z = Math.PI / 8;
}


let frameCount = 0;
let birdDirection = -0.002; // for direction and speed
let birdWingRotationSpeed = 0.02;

function draw() {
  // Animate the bird
  frameCount = frameCount + 1;

  // let rotationX = Math.sin(frameCount/100);

  // bird.position.x += birdDirection; // Continuous increase of positionX, with no limit

  // Animate positionX of bird in a range
  bird.position.x += birdDirection;
  if (bird.position.x >= 2 || bird.position.x <= -2) {
    birdDirection = -birdDirection; // Reverse direction
  }

  // Animate the wings
  // reverse our bird wing rotation every 30 frames
  if (frameCount % 30 == 0){
    birdWingRotationSpeed = birdWingRotationSpeed * -1;
  }
  wingContainerR.rotateX(birdWingRotationSpeed);
  wingContainerL.rotateX(-1 * birdWingRotationSpeed);

  // finally, take a picture of the scene and show it in the <canvas>
  renderer.render(scene, camera);

  // We can also...
    // camera.position.z -= 0.1; // Move the camera
    // myMesh.scale.set(2,3,4);
    // myMesh.scale.y= Math.sin(frameCount/10)*1;
    // myMesh.position.x = Math.sin(frameCount/40)*1;
    // myMesh.rotateX(0.01);

  // Browser's requestAnimationFrame function, calling draw 60 times per second
  // The p5 library would automatically call this function internally.
  window.requestAnimationFrame(draw);
}

// // Create a texture loader:


// // change the texture parameters if you like!
// myTexture.wrapS = THREE.RepeatWrapping;
// myTexture.wrapT = THREE.RepeatWrapping;
// myTexture.repeat.set(2, 2);

// // create a sphere
// let geometry = new THREE.BoxGeometry(2, 2, 2);
// let material = new THREE.MeshPhongMaterial({ map: myTexture });
// let myMesh = new THREE.Mesh(geometry, material);

// scene.add(new THREE.AmbientLight());
// let dirLight = new THREE.DirectionalLight(0xffffff, 1 );
// scene.add(dirLight);


// // and add it to the scene container
// scene.add(myMesh);

// // change background color:
// scene.background = new THREE.Color(0.9,0.4,0.3)

init();
