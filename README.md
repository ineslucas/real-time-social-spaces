# real-time-social-spaces

// ~~ Base Code for Three.JS Library ~~ //

// Create variables and make them available globally
let scene;
let renderer;
let camera;
let myMesh;
let box;

function init() {
  // create a scene container in which all other objects will exist
  scene = new THREE.Scene();

  // the renderer will actually show the camera view within our <canvas>
  renderer = new THREE.WebGLRenderer();
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(renderer.domElement);

  // create a camera and position it in space
  let aspect = window.innerWidth / window.innerHeight;
  camera = new THREE.PerspectiveCamera(75, aspect, 0.1, 1000);
  camera.position.set(0, 0, 10);

  // Make a box and add it
  let boxGeo = new THREE.BoxGeometry(1, 2, 3);
  let boxMat = new THREE.MeshNormalMaterial();
  myMesh = new THREE.Mesh(boxGeo, boxMat);
  scene.add(myMesh);

  draw();
}

function draw() {
  myMesh.rotateX(0.002);
  myMesh.rotateY(0.01);
  myMesh.rotateZ(0.002);

  // finally, take a picture of the scene and show it in the <canvas>
  renderer.render(scene, camera);

  window.requestAnimationFrame(draw);
}

init();
