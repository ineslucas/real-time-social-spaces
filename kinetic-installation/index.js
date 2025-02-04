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







// ~~ PREMADE CODE ~~ //

// Because this is a module script, we can import code from other modules
// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Modules
import * as THREE from "three";

// create a scene container in which all other objects will exist
let scene = new THREE.Scene();

// create a camera and position it in space
let aspect = window.innerWidth / window.innerHeight;
let camera = new THREE.PerspectiveCamera(75, aspect, 0.1, 1000);
camera.position.z = 10; // place the camera in space

// the renderer will actually show the camera view within our <canvas>
let renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// create a texture loader:
let textureLoader = new THREE.TextureLoader();
let myTexture = textureLoader.load("https://cdn.glitch.global/18ea5c93-0dd1-4772-b259-e401c006dff9/cat.jpeg?v=1706576535456");

// change the texture parameters if you like!
myTexture.wrapS = THREE.RepeatWrapping;
myTexture.wrapT = THREE.RepeatWrapping;
myTexture.repeat.set(2, 2);

// create a sphere
let geometry = new THREE.BoxGeometry(2, 2, 2);
let material = new THREE.MeshPhongMaterial({ map: myTexture });
let myMesh = new THREE.Mesh(geometry, material);

scene.add(new THREE.AmbientLight());
let dirLight = new THREE.DirectionalLight(0xffffff, 1 );
scene.add(dirLight);



// and add it to the scene container
scene.add(myMesh);

// change background color:
scene.background = new THREE.Color(0.9,0.4,0.3)


let frameCount = 0;

function draw() {
  frameCount = frameCount + 1;
  myMesh.rotateX(0.01);
  myMesh.rotateY(0.01);
  myMesh.position.x = Math.sin(frameCount/40)*1;
  // myMesh.scale.y= Math.sin(frameCount/10)*1;
  myMesh.scale.set(2,3,4);

  // or move the camera
  // camera.position.z -= 0.1;

  // finally, take a picture of the scene and show it in the <canvas>
  renderer.render(scene, camera);

  window.requestAnimationFrame(draw);
}

draw();
