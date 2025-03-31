import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';

// Configuration de base
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
// (field of view: angle of the camera, aspect ratio: always the same, how near/far the camera can see)


const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);

// create a cube
const geometry = new THREE.BoxGeometry(1, 1, 1); // (width, height, depth)
const material = new THREE.MeshBasicMaterial({ color: 0x00ff00 }); // (color)
const cube = new THREE.Mesh(geometry, material); // to create a mesh
scene.add(cube); // add the cube to the scene

camera.position.z = 5;
document.body.appendChild(renderer.domElement);

// animate the cube
function animate() {
  // animation
  cube.rotation.x += 0.01;
  cube.rotation.y += 0.01;

  // render the scene
  renderer.render(scene, camera);
}
renderer.setAnimationLoop(animate);




