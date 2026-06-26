import * as THREE from "three";
// Post-processing add-ons that ship with Three.js. These let us run the
// rendered image through filters (like glow) before it hits the screen.
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";

// 1. The scene: the container that holds everything we want to show.
const scene = new THREE.Scene();

// 2. The camera: our point of view. A perspective camera mimics human eyes.
//    (field of view, aspect ratio, near clip, far clip)
const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);
camera.position.z = 3; // step back so the sphere (at origin) is in front of us

// 3. The renderer: draws the scene onto a <canvas> using WebGL.
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// 4. The sphere = geometry (its shape) + material (its surface look).
//    SphereGeometry(radius, widthSegments, heightSegments).
//    MeshNormalMaterial colors each face by the direction it points,
//    so the ball reads as 3D even while it sits still — no lights needed.
const geometry = new THREE.SphereGeometry(1, 32, 32);

// COLOR TUNE: paint a cyan -> magenta gradient across the ball by giving each
// vertex (corner point) its own color based on how high up it sits. We walk
// every vertex, look at its y (-1 at the bottom, +1 at the top), remap that to
// 0..1, and blend (lerp) from cyan up to magenta.
const cyan = new THREE.Color(0x00ffff);
const magenta = new THREE.Color(0xff00ff);
const positions = geometry.attributes.position; // the list of vertex locations
const colors = [];
for (let i = 0; i < positions.count; i++) {
  const y = positions.getY(i); // -1 .. +1
  const t = (y + 1) / 2; // remap to 0 (bottom) .. 1 (top)
  const color = cyan.clone().lerp(magenta, t); // blend the two by t
  colors.push(color.r, color.g, color.b);
}
// Attach that color list to the geometry as a "color" attribute.
geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));

//    wireframe: true draws only the triangle edges (the glowing-grid look).
//    vertexColors: true tells the material to use the per-vertex colors above
//    instead of one flat color, giving the gradient.
const material = new THREE.MeshBasicMaterial({
  wireframe: true,
  vertexColors: true,
});
const sphere = new THREE.Mesh(geometry, material);
scene.add(sphere);

// --- PARTICLES (starfield) ----------------------------------------------
// A cloud of tiny points scattered behind the sphere for depth + atmosphere.
const starCount = 800;
const starPositions = new Float32Array(starCount * 3); // x,y,z for each star
for (let i = 0; i < starPositions.length; i++) {
  starPositions[i] = (Math.random() - 0.5) * 20; // random spot in a 20-unit cube
}
const starGeometry = new THREE.BufferGeometry();
starGeometry.setAttribute(
  "position",
  new THREE.BufferAttribute(starPositions, 3)
);
const starMaterial = new THREE.PointsMaterial({ color: 0x8888ff, size: 0.05 });
const stars = new THREE.Points(starGeometry, starMaterial);
scene.add(stars);

// --- BLOOM (neon glow) ---------------------------------------------------
// A composer is a pipeline: the frame passes through each "pass" in order
// before being shown. Pass 1 draws the scene; pass 2 layers a glow on top.
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const bloomPass = new UnrealBloomPass(
  new THREE.Vector2(window.innerWidth, window.innerHeight),
  0.9, // strength  - how intense the glow is
  0.4, // radius    - how far the glow spreads from bright pixels
  0.0 // threshold - brightness needed before something glows (0 = all of it)
);
composer.addPass(bloomPass);

// A clock just tracks how much time has passed since the page loaded.
// We need a steady sense of "time" to drive a smooth, looping pulse.
const clock = new THREE.Clock();

// --- AUDIO ---------------------------------------------------------------
// These start as null. They stay null (so the fake beat runs) until the
// user clicks the button and grants mic access, which fills them in.
let analyser = null; // the "meter" that reads the mic's loudness
let audioData = null; // a reusable array we copy each frame's readings into

async function startMic() {
  // 1. Ask the browser for the microphone. This is what pops the
  //    permission prompt; it waits (await) until the user clicks Allow.
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

  // 2. The Web Audio API works as a chain of nodes. We build:
  //    mic source --> analyser
  const audioContext = new AudioContext();
  const source = audioContext.createMediaStreamSource(stream);
  analyser = audioContext.createAnalyser();
  analyser.fftSize = 256; // controls how many frequency "bins" we get back
  source.connect(analyser);

  // 3. Make the array the analyser will write its readings into.
  //    frequencyBinCount is half of fftSize, so 128 numbers here.
  audioData = new Uint8Array(analyser.frequencyBinCount);

  // 4. Hide the button now that the mic is live.
  document.getElementById("start-btn").style.display = "none";
}

document.getElementById("start-btn").addEventListener("click", startMic);

// Reads the mic and returns a single loudness value from 0 (silent) to 1 (loud).
function getVolume() {
  // Fill audioData with the current loudness of each frequency band (0-255).
  analyser.getByteFrequencyData(audioData);

  // Average all the bands together to get one overall "how loud is it" number.
  let sum = 0;
  for (let i = 0; i < audioData.length; i++) {
    sum += audioData[i];
  }
  const average = sum / audioData.length; // 0-255

  return average / 255; // squish into 0-1 so it's easy to work with
}

// 5. The animation loop: instead of drawing once, we draw ~60 times a second.
//    requestAnimationFrame asks the browser to call animate() again on the
//    next frame, so this function keeps re-scheduling itself forever.
function animate() {
  requestAnimationFrame(animate);

  // Nudge the sphere's rotation a touch every frame. Do it on two axes so
  // the spin reads as 3D and not just a flat turntable.
  sphere.rotation.y += 0.01;
  sphere.rotation.x += 0.005;

  // Decide the sphere's size. Two modes:
  let scale;
  if (analyser) {
    // REAL AUDIO: drive the size straight from how loud the mic is.
    //   1 +          -> normal size when silent
    //   volume * 1.5 -> grow up to +150% at full volume (the punch)
    const volume = getVolume();
    scale = 1 + volume * 1.5;
  } else {
    // FAKE BEAT (Box 3): runs until the mic is granted, just so the
    // sphere isn't dead on arrival. Same sine pulse as before.
    const elapsed = clock.getElapsedTime();
    scale = 1 + Math.sin(elapsed * 2) * 0.15;
  }
  sphere.scale.setScalar(scale); // setScalar = same value on x, y, z at once

  stars.rotation.y += 0.0003; // drift the starfield slowly for a living backdrop

  // Render THROUGH the composer (draw scene + glow), not the bare renderer.
  composer.render();
}
animate();

// Keep it looking right if the window is resized. We no longer call
// renderer.render() here — the animation loop is already redrawing every
// frame, so it'll pick up the new size on its own.
window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  composer.setSize(window.innerWidth, window.innerHeight); // keep glow in sync
});
