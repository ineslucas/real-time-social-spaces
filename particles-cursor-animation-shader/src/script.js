import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import particlesVertexShader from './shaders/particles/vertex.glsl'
import particlesFragmentShader from './shaders/particles/fragment.glsl'

/**
 * Base
 */
// Canvas
const canvas = document.querySelector('canvas.webgl')

// Scene
const scene = new THREE.Scene()

// Loaders
const textureLoader = new THREE.TextureLoader()

/**
 * Sizes
 */
const sizes = {
    width: window.innerWidth,
    height: window.innerHeight,
    pixelRatio: Math.min(window.devicePixelRatio, 2)
}

window.addEventListener('resize', () =>
{
    // Update sizes
    sizes.width = window.innerWidth
    sizes.height = window.innerHeight
    sizes.pixelRatio = Math.min(window.devicePixelRatio, 2)

    // Materials
    particlesMaterial.uniforms.uResolution.value.set(sizes.width * sizes.pixelRatio, sizes.height * sizes.pixelRatio)

    // Update camera
    camera.aspect = sizes.width / sizes.height
    camera.updateProjectionMatrix()

    // Update renderer
    renderer.setSize(sizes.width, sizes.height)
    renderer.setPixelRatio(sizes.pixelRatio)
})

/**
 * Camera
 */
// Base camera
const camera = new THREE.PerspectiveCamera(35, sizes.width / sizes.height, 0.1, 100)
camera.position.set(0, 0, 18)
scene.add(camera)

// Controls
const controls = new OrbitControls(camera, canvas)
controls.enableDamping = true

/**
 * Renderer
 */
const renderer = new THREE.WebGLRenderer({
    canvas: canvas,
    antialias: true
})
renderer.setClearColor('#181818')
renderer.setSize(sizes.width, sizes.height)
renderer.setPixelRatio(sizes.pixelRatio)

/**
 * Displacement
 */
const displacement = {}

// 2D canvas
displacement.canvas = document.createElement('canvas')
displacement.canvas.width = 128
displacement.canvas.height = 128
displacement.canvas.style.position = 'fixed'
displacement.canvas.style.width = '256px'
displacement.canvas.style.height = '256px'
displacement.canvas.style.top = 0
displacement.canvas.style.left = 0
displacement.canvas.style.zIndex = 10
document.body.append(displacement.canvas)

// Context
displacement.context = displacement.canvas.getContext('2d')
displacement.context.fillRect(0, 0, displacement.canvas.width, displacement.canvas.height)

// Glow image - Creating an instance of Image and update its src to the path where to find the glow.png:
displacement.glowImage = new Image()
displacement.glowImage.src = './glow.png'

  /**
   * Our canvas is ready and we know how to draw the glow on it.
   */

// Interactive plane
displacement.interactivePlane = new THREE.Mesh(
    new THREE.PlaneGeometry(10, 10),
    new THREE.MeshBasicMaterial({ color: 'red', side: THREE.DoubleSide })
)
displacement.interactivePlane.visible = false // hide the interactivePlane 🚨
scene.add(displacement.interactivePlane)

// Raycaster
displacement.raycaster = new THREE.Raycaster()

// We now need cursor coordinates:
displacement.screenCursor = new THREE.Vector2(9999, 9999)
displacement.canvasCursor = new THREE.Vector2(9999, 9999) // create canvasCursor also using a Vector2
displacement.canvasCursorPrevious = new THREE.Vector2(9999, 9999)

// Repeat process for touch screens:
window.addEventListener('pointermove', (event) =>
  {
      displacement.screenCursor.x = (event.clientX / sizes.width) * 2 - 1
      displacement.screenCursor.y = - (event.clientY / sizes.height) * 2 + 1
  })

// Texture
// create a texture property, to which we assign a CanvasTexture instance, which is being sent the canvas itself (not the context)
displacement.texture = new THREE.CanvasTexture(displacement.canvas)

/**
 * Particles
 */
const particlesGeometry = new THREE.PlaneGeometry(10, 10, 128, 128)
  // Nr of particles: Added more particles by increasing the subdivision on the PlaneGeometry to 128:


// Random intensity for each particle after displacement animation:
const intensitiesArray = new Float32Array(particlesGeometry.attributes.position.count)
// Random angle
const anglesArray = new Float32Array(particlesGeometry.attributes.position.count)


for(let i = 0; i < particlesGeometry.attributes.position.count; i++)
{
    intensitiesArray[i] = Math.random()
    anglesArray[i] = Math.random() * Math.PI * 2

}

particlesGeometry.setAttribute('aIntensity', new THREE.BufferAttribute(intensitiesArray, 1))
particlesGeometry.setAttribute('aAngle', new THREE.BufferAttribute(anglesArray, 1))


const particlesMaterial = new THREE.ShaderMaterial({
    vertexShader: particlesVertexShader,
    fragmentShader: particlesFragmentShader,
    uniforms:
    {
        uResolution: new THREE.Uniform(new THREE.Vector2(sizes.width * sizes.pixelRatio, sizes.height * sizes.pixelRatio)),
          // CHOOSING PICTURE 🌸
        uPictureTexture: new THREE.Uniform(textureLoader.load('./picture-1.png')),
        uDisplacementTexture: new THREE.Uniform(displacement.texture)
    }
    // blending: THREE.AdditiveBlending
})
const particles = new THREE.Points(particlesGeometry, particlesMaterial);
scene.add(particles)

/**
 * Animate
 */
const tick = () =>
{
    // Update controls
    controls.update()

    /**
     * Raycaster
     */
    // Test the intersection with the interactivePlane and since it’s a single object, we can use intersectObject() (singular) :
    displacement.raycaster.setFromCamera(displacement.screenCursor, camera)
    const intersections = displacement.raycaster.intersectObject(displacement.interactivePlane)
      // BTW:intersectObject() will return an array in case there are multiple intersections. But since we are testing on a plane, we know there can be only one intersection.

    if(intersections.length)
      {
        // console.log(intersections[0])
        const uv = intersections[0].uv
        // console.log(uv)

        // Updating the canvasCursor using the uv and
        // multiply by the canvas.width and canvas.height so that we transform from normalized coordinates to canvas coordinates:
        displacement.canvasCursor.x = uv.x * displacement.canvas.width
        displacement.canvasCursor.y = (1 - uv.y) * displacement.canvas.height
      }

    /**
     * Displacement
     */
    // Fade out
    displacement.context.globalCompositeOperation = 'source-over'
    displacement.context.globalAlpha = 0.02
    displacement.context.fillRect(0, 0, displacement.canvas.width, displacement.canvas.height)

    // Speed alpha
    const cursorDistance = displacement.canvasCursorPrevious.distanceTo(displacement.canvasCursor)
    displacement.canvasCursorPrevious.copy(displacement.canvasCursor)
    const alpha = Math.min(cursorDistance * 0.05, 1)

    // Draw glow // in the tick, after the whole Raycaster
    const glowSize = displacement.canvas.width * 0.25 // glowSize variable based on the canvas.width
    displacement.context.globalCompositeOperation = 'lighten'
    displacement.context.globalAlpha = alpha
    displacement.context.drawImage( // Center the glow on the canvasCursor
        displacement.glowImage,
        displacement.canvasCursor.x - glowSize * 0.5,
        displacement.canvasCursor.y - glowSize * 0.5,
        glowSize,
        glowSize
    )

    // Texture
    displacement.texture.needsUpdate = true

    // Render
    renderer.render(scene, camera)

    // Call tick again on the next frame
    window.requestAnimationFrame(tick)
}

tick()
