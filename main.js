// Basic Inception Totem Scene in Three.js
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import gsap from 'gsap';
import { TextureLoader } from 'three';
import { Reflector } from 'three/examples/jsm/objects/Reflector';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass';
import { AfterimagePass } from 'three/examples/jsm/postprocessing/AfterimagePass';

let scene, camera, renderer, totem, controls, clock, ground;
let isSpinning = false;
let mirrorScene, mirrorObjects = [];
let pastelScene, pastelObjects = [];
let stars = [];
let starField;
let bubbles = [];
let bubbleField;
let neonScene;
let neonLights = [];
let gardenScene, spaceScene;
let flowers = [], butterflies = [];
let asteroids = [], spaceDust = [];
let moonTexture, moonBumpMap;
let textOverlay;
let composer, bloomPass, pastelComposer, afterimagePass;

init();
animate();

function init() {
  // Scene
  scene = new THREE.Scene();
  scene.background = new THREE.Color('#101018');
  
  // Camera
  camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
  );
  camera.position.set(0, 2, 5);

  // Renderer
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(renderer.domElement);

  // Lights
  const ambient = new THREE.AmbientLight(0xffffff, 0.5);
  scene.add(ambient);

  const directional = new THREE.DirectionalLight(0xffffff, 1);
  directional.position.set(5, 10, 7.5);
  scene.add(directional);

  // Ground
  const groundGeo = new THREE.CircleGeometry(5, 64);
  const groundMat = new THREE.MeshStandardMaterial({ color: '#666' });
  ground = new THREE.Mesh(groundGeo, groundMat);
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  // Totem (simple cone on top of a cylinder)
  const base = new THREE.CylinderGeometry(0.2, 0.2, 0.1, 32);
  const top = new THREE.ConeGeometry(0.15, 0.4, 32);
  const metalMat = new THREE.MeshStandardMaterial({ color: '#fff', metalness: 0.1, roughness: 0.3 });

  const baseMesh = new THREE.Mesh(base, metalMat);
  const topMesh = new THREE.Mesh(top, metalMat);
  topMesh.position.y = 0.25;

  totem = new THREE.Group();
  totem.add(baseMesh);
  totem.add(topMesh);
  totem.position.y = 0.1;
  scene.add(totem);

  // Controls
  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;

  function createStarField() {
    starField = new THREE.Group();
    const starsGeometry = new THREE.BufferGeometry();
    const starsMaterial = new THREE.PointsMaterial({
      color: 0xFFFFFF,
      size: 0.02,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending
    });

    const starsVertices = [];
    for(let i = 0; i < 1000; i++) {
      const x = (Math.random() - 0.5) * 20;
      const y = (Math.random() - 0.5) * 20;
      const z = (Math.random() - 0.5) * 20;
      starsVertices.push(x, y, z);
      stars.push({
        velocity: Math.random() * 0.02,
        brightness: Math.random()
      });
    }

    starsGeometry.setAttribute('position', new THREE.Float32BufferAttribute(starsVertices, 3));
    const starPoints = new THREE.Points(starsGeometry, starsMaterial);
    starField.add(starPoints);
    scene.add(starField);
    starField.visible = false;
  }

  function createBubbleField() {
    bubbleField = new THREE.Group();
    
    // Créer 50 bulles
    for(let i = 0; i < 50; i++) {
      const geometry = new THREE.SphereGeometry(0.05 + Math.random() * 0.05, 16, 16);
      const material = new THREE.MeshPhysicalMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.3,
        roughness: 0.2,
        metalness: 0.1,
        transmission: 0.9,
      });
      
      const bubble = new THREE.Mesh(geometry, material);
      
      // Position aléatoire
      bubble.position.set(
        (Math.random() - 0.5) * 10,
        Math.random() * 5,
        (Math.random() - 0.5) * 10
      );
      
      // Données pour l'animation
      bubbles.push({
        mesh: bubble,
        speed: 0.2 + Math.random() * 0.3,
        offset: Math.random() * Math.PI * 2
      });
      
      bubbleField.add(bubble);
    }
    
    scene.add(bubbleField);
    bubbleField.visible = false;
  }

  function createNeonScene() {
    neonScene = new THREE.Group();
    
    // Sol réfléchissant
    const reflectiveGroundMat = new THREE.MeshStandardMaterial({
      color: '#0a0014',
      metalness: 0.9,
      roughness: 0.1,
      envMapIntensity: 1
    });
    ground.material = reflectiveGroundMat;
    
    // Lumières néon
    const colors = [0x00ffff, 0xff00ff, 0x9900ff];
    const positions = [
      [-2, 2, -2],
      [2, 1, 2],
      [0, 3, 0]
    ];
    
    colors.forEach((color, i) => {
      const light = new THREE.PointLight(color, 2, 10);
      light.position.set(...positions[i]);
      neonLights.push({
        light,
        baseY: positions[i][1],
        phase: Math.random() * Math.PI * 2,
        rotationRadius: 2
      });
      neonScene.add(light);
      
      // Sphère visible pour la lumière
      const sphereGeo = new THREE.SphereGeometry(0.05, 16, 16);
      const sphereMat = new THREE.MeshBasicMaterial({ color: color });
      const sphere = new THREE.Mesh(sphereGeo, sphereMat);
      light.add(sphere);
    });
    
    // Objets flottants
    const geometries = [
      new THREE.BoxGeometry(0.3, 0.3, 0.3),
      new THREE.SphereGeometry(0.2, 16, 16),
      new THREE.TetrahedronGeometry(0.2)
    ];
    
    for(let i = 0; i < 15; i++) {
      const geometry = geometries[Math.floor(Math.random() * geometries.length)];
      const material = new THREE.MeshStandardMaterial({
        color: colors[Math.floor(Math.random() * colors.length)],
        metalness: 0.8,
        roughness: 0.2,
        transparent: true,
        opacity: 0.7
      });
      
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(
        (Math.random() - 0.5) * 8,
        Math.random() * 4 + 1,
        (Math.random() - 0.5) * 8
      );
      
      neonScene.add(mesh);
      
      // Données pour l'animation
      mesh.userData = {
        rotationSpeed: (Math.random() - 0.5) * 0.02,
        floatSpeed: 0.2 + Math.random() * 0.3,
        floatOffset: Math.random() * Math.PI * 2
      };
    }
    
    scene.add(neonScene);
    neonScene.visible = false;
  }

  function createGardenScene() {
    gardenScene = new THREE.Group();
    
    // Sol nuageux
    const cloudGroundMat = new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.8,
      metalness: 0.2,
      roughness: 0.3,
      transmission: 0.5
    });
    ground.material = cloudGroundMat;
    
    // Création des fleurs
    const flowerColors = [0xffb7d5, 0xffffff, 0xffe3e3];
    const flowerGeometry = new THREE.Group();
    // Centre de la fleur
    const center = new THREE.SphereGeometry(0.03, 8, 8);
    // Pétales
    const petal = new THREE.ConeGeometry(0.02, 0.08, 4);
    
    for(let i = 0; i < 30; i++) {
      const flower = new THREE.Group();
      const centerMesh = new THREE.Mesh(
        center,
        new THREE.MeshStandardMaterial({ color: 0xffef9f })
      );
      flower.add(centerMesh);
      
      // Ajouter 5 pétales
      for(let j = 0; j < 5; j++) {
        const petalMesh = new THREE.Mesh(
          petal,
          new THREE.MeshStandardMaterial({ 
            color: flowerColors[Math.floor(Math.random() * flowerColors.length)]
          })
        );
        petalMesh.position.y = 0.04;
        petalMesh.rotation.y = (j / 5) * Math.PI * 2;
        petalMesh.rotation.x = Math.PI / 3;
        flower.add(petalMesh);
      }
      
      flower.position.set(
        (Math.random() - 0.5) * 10,
        Math.random() * 5 + 1,
        (Math.random() - 0.5) * 10
      );
      flower.scale.setScalar(0.5 + Math.random() * 0.5);
      
      flowers.push({
        mesh: flower,
        speed: 0.2 + Math.random() * 0.3,
        rotationSpeed: (Math.random() - 0.5) * 0.02,
        offset: Math.random() * Math.PI * 2
      });
      
      gardenScene.add(flower);
    }
    
    // Création des papillons
    const butterflyGeometry = new THREE.Group();
    const wing = new THREE.CircleGeometry(0.1, 8);
    
    for(let i = 0; i < 15; i++) {
      const butterfly = new THREE.Group();
      const wingMaterial = new THREE.MeshPhysicalMaterial({
        color: flowerColors[Math.floor(Math.random() * flowerColors.length)],
        transparent: true,
        opacity: 0.7,
        transmission: 0.3
      });
      
      const leftWing = new THREE.Mesh(wing, wingMaterial);
      const rightWing = new THREE.Mesh(wing, wingMaterial);
      leftWing.position.x = -0.1;
      rightWing.position.x = 0.1;
      butterfly.add(leftWing, rightWing);
      
      butterfly.position.set(
        (Math.random() - 0.5) * 8,
        Math.random() * 4 + 1,
        (Math.random() - 0.5) * 8
      );
      
      butterflies.push({
        mesh: butterfly,
        wingAngle: 0,
        speed: 0.5 + Math.random() * 0.5,
        offset: Math.random() * Math.PI * 2
      });
      
      gardenScene.add(butterfly);
    }
    
    scene.add(gardenScene);
    gardenScene.visible = false;
  }

  function createSpaceScene() {
    spaceScene = new THREE.Group();
    
    // Sol lunaire
    const textureLoader = new TextureLoader();
    
    const moonGroundMat = new THREE.MeshStandardMaterial({
      color: 0x1b1d2a,
      map: moonTexture,
      bumpMap: moonBumpMap,
      bumpScale: 0.04,
      roughness: 0.8
    });
    ground.material = moonGroundMat;
    
    // Lumières
    const spotLight = new THREE.SpotLight(0xffffff, 1);
    spotLight.position.set(5, 10, 0);
    spotLight.angle = Math.PI / 6;
    spotLight.penumbra = 0.5;
    spotLight.decay = 1;
    spotLight.distance = 30;
    spotLight.castShadow = true;
    spaceScene.add(spotLight);
    
    const distantLight = new THREE.DirectionalLight(0x4466ff, 0.2);
    distantLight.position.set(-20, 2, -10);
    spaceScene.add(distantLight);
    
    // Rochers flottants
    const asteroidGeometries = [
      new THREE.IcosahedronGeometry(0.3, 0),
      new THREE.IcosahedronGeometry(0.2, 1),
      new THREE.DodecahedronGeometry(0.25, 0)
    ];
    
    for(let i = 0; i < 10; i++) {
      const geometry = asteroidGeometries[Math.floor(Math.random() * asteroidGeometries.length)];
      const material = new THREE.MeshStandardMaterial({
        color: 0x1b1d2a,
        roughness: 0.9,
        metalness: 0.1
      });
      
      const asteroid = new THREE.Mesh(geometry, material);
      asteroid.position.set(
        (Math.random() - 0.5) * 12,
        Math.random() * 6 + 1,
        (Math.random() - 0.5) * 12
      );
      
      asteroids.push({
        mesh: asteroid,
        rotationSpeed: {
          x: (Math.random() - 0.5) * 0.01,
          y: (Math.random() - 0.5) * 0.01,
          z: (Math.random() - 0.5) * 0.01
        },
        floatSpeed: 0.1 + Math.random() * 0.2,
        offset: Math.random() * Math.PI * 2
      });
      
      spaceScene.add(asteroid);
    }
    
    // Particules en lévitation
    const dustGeometry = new THREE.BufferGeometry();
    const dustVertices = [];
    const dustColors = [];
    
    for(let i = 0; i < 200; i++) {
      dustVertices.push(
        (Math.random() - 0.5) * 20,
        Math.random() * 10,
        (Math.random() - 0.5) * 20
      );
      
      const color = new THREE.Color();
      color.setHSL(0.6, 0.8, Math.random() * 0.3 + 0.7);
      dustColors.push(color.r, color.g, color.b);
    }
    
    dustGeometry.setAttribute('position', new THREE.Float32BufferAttribute(dustVertices, 3));
    dustGeometry.setAttribute('color', new THREE.Float32BufferAttribute(dustColors, 3));
    
    const dustMaterial = new THREE.PointsMaterial({
      size: 0.02,
      vertexColors: true,
      transparent: true,
      opacity: 0.6
    });
    
    const spaceDustSystem = new THREE.Points(dustGeometry, dustMaterial);
    spaceScene.add(spaceDustSystem);
    
    spaceDust.push(spaceDustSystem);
    scene.add(spaceScene);
    spaceScene.visible = false;
  }

  function createTextOverlay() {
    textOverlay = document.createElement('div');
    textOverlay.style.position = 'absolute';
    textOverlay.style.bottom = '15%';
    textOverlay.style.left = '50%';
    textOverlay.style.transform = 'translateX(-50%)';
    textOverlay.style.color = 'white';
    textOverlay.style.fontFamily = 'Arial, sans-serif';
    textOverlay.style.fontSize = '24px';
    textOverlay.style.textAlign = 'center';
    textOverlay.style.textShadow = '2px 2px 4px rgba(0, 0, 0, 0.5)';
    textOverlay.style.transition = 'opacity 1s ease-in-out';
    textOverlay.style.pointerEvents = 'none';
    textOverlay.style.opacity = '1';
    textOverlay.style.maxWidth = '80%';
    textOverlay.style.padding = '20px';
    textOverlay.innerHTML = "Et si tout ça n'était qu'un rêve ?<br>Cliquez sur la toupie… et découvrez la vérité.";
    document.body.appendChild(textOverlay);
  }

  function createMirrorScene() {
    mirrorScene = new THREE.Group();
    
    // Fond sombre
    scene.background = new THREE.Color('#0a0a0a');
    
    // Sol réfléchissant
    const reflectorGeometry = new THREE.PlaneGeometry(10, 10);
    const reflectorMaterial = new THREE.MeshPhysicalMaterial({
      color: '#b1b1c1',
      metalness: 0.9,
      roughness: 0.1,
      clearcoat: 1.0,
      clearcoatRoughness: 0.1,
      envMapIntensity: 1
    });
    
    const reflector = new Reflector(reflectorGeometry, {
      clipBias: 0.003,
      textureWidth: window.innerWidth,
      textureHeight: window.innerHeight,
      color: '#b1b1c1'
    });
    
    reflector.rotation.x = -Math.PI / 2;
    reflector.position.y = 0.1;
    mirrorScene.add(reflector);
    
    // Objets flottants symétriques
    const geometries = [
      new THREE.BoxGeometry(0.5, 0.5, 0.5),
      new THREE.SphereGeometry(0.3, 32, 32),
      new THREE.OctahedronGeometry(0.4, 0),
      new THREE.IcosahedronGeometry(0.3, 0)
    ];
    
    const materials = [
      new THREE.MeshPhysicalMaterial({
        color: '#ccd4e0',
        metalness: 0.8,
        roughness: 0.2,
        clearcoat: 1.0,
        clearcoatRoughness: 0.1,
        transparent: true,
        opacity: 0.8
      }),
      new THREE.MeshPhysicalMaterial({
        color: '#b1b1c1',
        metalness: 0.9,
        roughness: 0.1,
        clearcoat: 1.0,
        clearcoatRoughness: 0.1,
        transparent: true,
        opacity: 0.7
      })
    ];
    
    // Créer des paires d'objets symétriques
    for(let i = 0; i < 8; i++) {
      const geometry = geometries[Math.floor(Math.random() * geometries.length)];
      const material = materials[Math.floor(Math.random() * materials.length)];
      
      // Objet principal
      const mainObject = new THREE.Mesh(geometry, material);
      mainObject.position.set(
        (Math.random() - 0.5) * 8,
        Math.random() * 4 + 1,
        (Math.random() - 0.5) * 8
      );
      
      // Objet miroir (inversé)
      const mirrorObject = mainObject.clone();
      mirrorObject.scale.y = -1; // Inverser verticalement
      mirrorObject.position.y = -mainObject.position.y;
      
      mirrorObjects.push({
        main: mainObject,
        mirror: mirrorObject,
        rotationSpeed: {
          x: (Math.random() - 0.5) * 0.01,
          y: (Math.random() - 0.5) * 0.01,
          z: (Math.random() - 0.5) * 0.01
        },
        floatSpeed: 0.1 + Math.random() * 0.2,
        offset: Math.random() * Math.PI * 2
      });
      
      mirrorScene.add(mainObject);
      mirrorScene.add(mirrorObject);
    }
    
    // Ajouter un effet de bloom
    composer = new EffectComposer(renderer);
    const renderPass = new RenderPass(scene, camera);
    composer.addPass(renderPass);
    
    bloomPass = new UnrealBloomPass(
      new THREE.Vector2(window.innerWidth, window.innerHeight),
      0.5,  // strength
      0.4,  // radius
      0.85  // threshold
    );
    composer.addPass(bloomPass);
    
    scene.add(mirrorScene);
    mirrorScene.visible = false;
  }

  function createPastelScene() {
    pastelScene = new THREE.Group();
    
    // Fond pastel
    scene.background = new THREE.Color('#ffe9f3');
    
    // Création des nuages
    const cloudGeometry = new THREE.SphereGeometry(0.5, 16, 16);
    const cloudMaterial = new THREE.MeshStandardMaterial({
      color: '#ffffff',
      roughness: 0.9,
      metalness: 0.1,
      transparent: true,
      opacity: 0.8
    });
    
    for(let i = 0; i < 10; i++) {
      const cloud = new THREE.Mesh(cloudGeometry, cloudMaterial);
      cloud.position.set(
        (Math.random() - 0.5) * 8,
        Math.random() * 4 + 1,
        (Math.random() - 0.5) * 8
      );
      cloud.scale.set(
        1 + Math.random() * 0.5,
        0.5 + Math.random() * 0.3,
        1 + Math.random() * 0.5
      );
      
      pastelObjects.push({
        mesh: cloud,
        floatSpeed: 0.1 + Math.random() * 0.2,
        rotationSpeed: (Math.random() - 0.5) * 0.01,
        offset: Math.random() * Math.PI * 2
      });
      
      pastelScene.add(cloud);
    }
    
    // Formes géométriques colorées
    const shapes = [
      { geometry: new THREE.BoxGeometry(0.3, 0.3, 0.3), color: '#ffb7d5' },
      { geometry: new THREE.SphereGeometry(0.2, 16, 16), color: '#c6e2ff' },
      { geometry: new THREE.OctahedronGeometry(0.2, 0), color: '#fff8e1' },
      { geometry: new THREE.TetrahedronGeometry(0.2), color: '#ffd1dc' }
    ];
    
    for(let i = 0; i < 15; i++) {
      const shape = shapes[Math.floor(Math.random() * shapes.length)];
      const material = new THREE.MeshStandardMaterial({
        color: shape.color,
        roughness: 0.7,
        metalness: 0.1,
        transparent: true,
        opacity: 0.8
      });
      
      const mesh = new THREE.Mesh(shape.geometry, material);
      mesh.position.set(
        (Math.random() - 0.5) * 8,
        Math.random() * 4 + 1,
        (Math.random() - 0.5) * 8
      );
      
      pastelObjects.push({
        mesh: mesh,
        floatSpeed: 0.1 + Math.random() * 0.2,
        rotationSpeed: (Math.random() - 0.5) * 0.01,
        offset: Math.random() * Math.PI * 2
      });
      
      pastelScene.add(mesh);
    }
    
    // Particules douces (confettis)
    const confettiGeometry = new THREE.BufferGeometry();
    const confettiVertices = [];
    const confettiColors = [];
    
    for(let i = 0; i < 100; i++) {
      confettiVertices.push(
        (Math.random() - 0.5) * 10,
        Math.random() * 5,
        (Math.random() - 0.5) * 10
      );
      
      const color = new THREE.Color();
      color.setHSL(Math.random(), 0.5, 0.8);
      confettiColors.push(color.r, color.g, color.b);
    }
    
    confettiGeometry.setAttribute('position', new THREE.Float32BufferAttribute(confettiVertices, 3));
    confettiGeometry.setAttribute('color', new THREE.Float32BufferAttribute(confettiColors, 3));
    
    const confettiMaterial = new THREE.PointsMaterial({
      size: 0.05,
      vertexColors: true,
      transparent: true,
      opacity: 0.6
    });
    
    const confettiSystem = new THREE.Points(confettiGeometry, confettiMaterial);
    pastelScene.add(confettiSystem);
    
    // Lumière diffuse
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    pastelScene.add(ambientLight);
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(5, 5, 5);
    pastelScene.add(directionalLight);
    
    // Post-processing pour l'effet de souvenir
    pastelComposer = new EffectComposer(renderer);
    const renderPass = new RenderPass(scene, camera);
    pastelComposer.addPass(renderPass);
    
    afterimagePass = new AfterimagePass(0.95);
    pastelComposer.addPass(afterimagePass);
    
    scene.add(pastelScene);
    pastelScene.visible = false;
  }

  createStarField();
  createBubbleField();
  createNeonScene();
  createGardenScene();
  createSpaceScene();
  createTextOverlay();
  createMirrorScene();
  createPastelScene();

  function spinTotem() {
    isSpinning = true;
    const isDream = Math.random() > 0.5;
    
    // Faire disparaître le texte initial avec une animation
    gsap.to(textOverlay, {
      opacity: 0,
      duration: 1,
      onComplete: () => {
        // Mettre à jour le texte selon le mode
        textOverlay.innerHTML = isDream ? 
          "Vous rêvez.<br>Laissez-vous emporter par les flots de l'inconscience…" :
          "Vous êtes éveillé.<br>Mais pour combien de temps encore… ?";
        
        // Faire réapparaître le texte
        gsap.to(textOverlay, {
          opacity: 1,
          duration: 1
        });
      }
    });

    const maxRotationSpeed = 25;
    const duration = isDream ? 60 : 10;
    let elapsed = 0;
    let initialTilt = 0.5;
    let lastEnvironmentChange = 0;
  
    // Couleurs pour le mode rêve
    const dreamColors = [
      { bg: '#0a0a0a', ground: '#b1b1c1', type: 'mirror' },
      { bg: '#b8c6f1', ground: '#fcd0ed', type: 'pastel' },
      { bg: '#ffeaf4', ground: '#ffffff', type: 'garden' },
      { bg: '#0a0014', ground: '#0a0014', type: 'neon' },
      { bg: '#1b1d2a', ground: '#1b1d2a', type: 'space' },
      { bg: '#c9f0ff', ground: '#7ec8e3', type: 'bubbles' }
    ];
    let colorIndex = 0;

    function updateDreamEnvironment() {
      if (!isDream) return;
      
      const colors = dreamColors[colorIndex];
      
      // Gérer la visibilité des effets selon le type
      mirrorScene.visible = colors.type === 'mirror';
      pastelScene.visible = colors.type === 'pastel';
      bubbleField.visible = colors.type === 'bubbles';
      neonScene.visible = colors.type === 'neon';
      gardenScene.visible = colors.type === 'garden';
      spaceScene.visible = colors.type === 'space';
      
      if (colors.type === 'mirror' || colors.type === 'pastel') {
        scene.fog = null;
      } else if (colors.type === 'bubbles') {
        scene.fog = new THREE.Fog(new THREE.Color(colors.bg), 2, 15);
      } else if (colors.type === 'neon') {
        scene.fog = new THREE.Fog(new THREE.Color(colors.bg), 3, 20);
      } else if (colors.type === 'garden') {
        scene.fog = new THREE.Fog(new THREE.Color(colors.bg), 5, 25);
      } else if (colors.type === 'space') {
        scene.fog = null;
      }

      // Fond et sol
      gsap.to(scene.background, {
        r: new THREE.Color(colors.bg).r,
        g: new THREE.Color(colors.bg).g,
        b: new THREE.Color(colors.bg).b,
        duration: 0.5
      });

      // Toujours mettre à jour la couleur du sol principal
      gsap.to(ground.material.color, {
        r: new THREE.Color(colors.ground).r,
        g: new THREE.Color(colors.ground).g,
        b: new THREE.Color(colors.ground).b,
        duration: 0.5
      });

      colorIndex = (colorIndex + 1) % dreamColors.length;
    }

    function updateSpin() {
      const delta = clock.getDelta();
      elapsed += delta;

      if (elapsed < duration) {
        const progress = elapsed / duration;
        const currentSpeed = maxRotationSpeed * (1 - Math.pow(progress, 0.5));
        
        // Rotation principale
        totem.rotation.y += currentSpeed * delta;
        
        // Effet d'oscillation
        const tiltDecay = initialTilt * (1 - progress);
        totem.rotation.x = Math.cos(elapsed * 2) * tiltDecay;
        totem.rotation.z = Math.sin(elapsed * 2) * tiltDecay;

        // Changement de décor toutes les 2s UNIQUEMENT si c'est un rêve
        if (isDream && elapsed - lastEnvironmentChange >= 2) {
          updateDreamEnvironment();
          lastEnvironmentChange = elapsed;
        }
        
        requestAnimationFrame(updateSpin);
      } else {
        isSpinning = false;
        
        // Faire disparaître le texte à la fin
        gsap.to(textOverlay, {
          opacity: 0,
          duration: 1,
          onComplete: () => {
            // Remettre le texte initial
            textOverlay.innerHTML = "Et si tout ça n'était qu'un rêve ?<br>Cliquez sur la toupie… et découvrez la vérité.";
            gsap.to(textOverlay, {
              opacity: 1,
              duration: 1
            });
          }
        });
        
        // Remet la toupie droite à la fin
        gsap.to(totem.rotation, {
          x: 0,
          z: 0,
          duration: 0.5
        });
        
        // Si ce n'était pas un rêve, on s'assure que les couleurs sont celles de la réalité
        if (!isDream) {
          // Désactiver le champ d'étoiles
          gsap.to(starField.children[0].material, {
            opacity: 0,
            duration: 0.5,
            onComplete: () => {
              starField.visible = false;
            }
          });
          
          gsap.to(scene.background, {
            r: new THREE.Color('#101018').r,
            g: new THREE.Color('#101018').g,
            b: new THREE.Color('#101018').b,
            duration: 0.5
          });

          gsap.to(ground.material.color, {
            r: new THREE.Color('#555').r,
            g: new THREE.Color('#555').g,
            b: new THREE.Color('#555').b,
            duration: 0.5
          });
        }
      }
    }

    updateSpin();
  }

  // Raycaster for click
  const raycaster = new THREE.Raycaster();
  const mouse = new THREE.Vector2();

  window.addEventListener('click', (event) => {
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObject(totem, true);
    if (intersects.length > 0 && !isSpinning) {
      spinTotem();
    }
  });

  clock = new THREE.Clock();
  window.addEventListener('resize', onWindowResize);
}

function changeEnvironment(forceDream = false) {
  const isDream = forceDream ? true : Math.random() > 0.5;
  const bgColor = isDream ? '#2b0a3d' : '#101018';
  const groundColor = isDream ? '#331a5d' : '#555';

  gsap.to(scene.background, {
    r: new THREE.Color(bgColor).r,
    g: new THREE.Color(bgColor).g,
    b: new THREE.Color(bgColor).b,
    duration: 1
  });

  gsap.to(ground.material.color, {
    r: new THREE.Color(groundColor).r,
    g: new THREE.Color(groundColor).g,
    b: new THREE.Color(groundColor).b,
    duration: 1
  });
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  
  if (composer) {
    composer.setSize(window.innerWidth, window.innerHeight);
  }
  
  // Mettre à jour la position du texte si nécessaire
  textOverlay.style.bottom = '15%';
  textOverlay.style.left = '50%';
}

function animate() {
  requestAnimationFrame(animate);
  
  // Animation des étoiles
  if (starField && starField.visible) {
    const positions = starField.children[0].geometry.attributes.position.array;
    for(let i = 0; i < positions.length; i += 3) {
      // Faire "pulser" les étoiles
      const star = stars[i/3];
      star.brightness = Math.sin(Date.now() * star.velocity) * 0.5 + 0.5;
      
      // Faire tourner légèrement le champ d'étoiles
      const x = positions[i];
      const z = positions[i + 2];
      const angle = 0.0001;
      positions[i] = x * Math.cos(angle) - z * Math.sin(angle);
      positions[i + 2] = x * Math.sin(angle) + z * Math.cos(angle);
    }
    starField.children[0].geometry.attributes.position.needsUpdate = true;
    starField.rotation.y += 0.0002;
  }

  // Animation des bulles
  if (bubbleField && bubbleField.visible) {
    bubbles.forEach((bubble, i) => {
      // Mouvement vertical ondulant
      bubble.mesh.position.y += Math.sin(Date.now() * 0.001 + bubble.offset) * 0.01 * bubble.speed;
      
      // Mouvement latéral léger
      bubble.mesh.position.x += Math.sin(Date.now() * 0.0005 + bubble.offset) * 0.01;
      bubble.mesh.position.z += Math.cos(Date.now() * 0.0005 + bubble.offset) * 0.01;
      
      // Réinitialiser la position si trop haute
      if (bubble.mesh.position.y > 5) {
        bubble.mesh.position.y = 0;
      }
      
      // Rotation douce
      bubble.mesh.rotation.x += 0.001;
      bubble.mesh.rotation.y += 0.001;
    });
  }

  // Animation de la scène néon
  if (neonScene && neonScene.visible) {
    // Animation des lumières
    neonLights.forEach((neonLight, i) => {
      const time = Date.now() * 0.001;
      
      // Mouvement circulaire
      neonLight.light.position.x = Math.cos(time + neonLight.phase) * neonLight.rotationRadius;
      neonLight.light.position.z = Math.sin(time + neonLight.phase) * neonLight.rotationRadius;
      neonLight.light.position.y = neonLight.baseY + Math.sin(time * 2) * 0.2;
      
      // Pulsation de l'intensité
      neonLight.light.intensity = 2 + Math.sin(time * 3 + neonLight.phase) * 0.5;
    });
    
    // Animation des objets flottants
    neonScene.children.forEach(child => {
      if (child.userData.floatSpeed) {
        const time = Date.now() * 0.001;
        
        // Rotation
        child.rotation.x += child.userData.rotationSpeed;
        child.rotation.y += child.userData.rotationSpeed;
        
        // Mouvement flottant
        child.position.y += Math.sin(time + child.userData.floatOffset) * 0.01 * child.userData.floatSpeed;
        
        // Mouvement circulaire lent
        const radius = child.position.length();
        const angle = time * 0.1;
        child.position.x = Math.cos(angle) * radius;
        child.position.z = Math.sin(angle) * radius;
      }
    });
  }

  // Animation du jardin
  if (gardenScene && gardenScene.visible) {
    flowers.forEach(flower => {
      flower.mesh.position.y -= 0.005 * flower.speed;
      flower.mesh.rotation.y += flower.rotationSpeed;
      
      if (flower.mesh.position.y < 0) {
        flower.mesh.position.y = 5;
      }
    });
    
    butterflies.forEach(butterfly => {
      butterfly.wingAngle += 0.1 * butterfly.speed;
      butterfly.mesh.children[0].rotation.y = Math.sin(butterfly.wingAngle) * 0.5;
      butterfly.mesh.children[1].rotation.y = -Math.sin(butterfly.wingAngle) * 0.5;
      
      const time = Date.now() * 0.001;
      butterfly.mesh.position.x += Math.sin(time + butterfly.offset) * 0.01;
      butterfly.mesh.position.z += Math.cos(time + butterfly.offset) * 0.01;
      butterfly.mesh.position.y += Math.sin(time * 0.5 + butterfly.offset) * 0.005;
    });
  }

  // Animation de l'espace
  if (spaceScene && spaceScene.visible) {
    asteroids.forEach(asteroid => {
      asteroid.mesh.rotation.x += asteroid.rotationSpeed.x;
      asteroid.mesh.rotation.y += asteroid.rotationSpeed.y;
      asteroid.mesh.rotation.z += asteroid.rotationSpeed.z;
      
      const time = Date.now() * 0.001;
      asteroid.mesh.position.y += Math.sin(time + asteroid.offset) * 0.002 * asteroid.floatSpeed;
    });
    
    // Animation des particules
    const positions = spaceDust[0].geometry.attributes.position.array;
    for(let i = 0; i < positions.length; i += 3) {
      positions[i + 1] += Math.sin(Date.now() * 0.001 + i) * 0.001;
    }
    spaceDust[0].geometry.attributes.position.needsUpdate = true;
  }

  // Animation du monde miroir
  if (mirrorScene && mirrorScene.visible) {
    const time = Date.now() * 0.001;
    
    mirrorObjects.forEach(obj => {
      // Rotation
      obj.main.rotation.x += obj.rotationSpeed.x;
      obj.main.rotation.y += obj.rotationSpeed.y;
      obj.main.rotation.z += obj.rotationSpeed.z;
      
      obj.mirror.rotation.x += obj.rotationSpeed.x;
      obj.mirror.rotation.y += obj.rotationSpeed.y;
      obj.mirror.rotation.z += obj.rotationSpeed.z;
      
      // Flottement vertical
      obj.main.position.y += Math.sin(time + obj.offset) * 0.002 * obj.floatSpeed;
      obj.mirror.position.y = -obj.main.position.y;
      
      // Flottement horizontal léger
      obj.main.position.x += Math.sin(time * 0.5 + obj.offset) * 0.001;
      obj.main.position.z += Math.cos(time * 0.5 + obj.offset) * 0.001;
      obj.mirror.position.x = obj.main.position.x;
      obj.mirror.position.z = obj.main.position.z;
    });
  }

  // Animation du monde pastel
  if (pastelScene && pastelScene.visible) {
    const time = Date.now() * 0.001;
    
    pastelObjects.forEach(obj => {
      // Rotation douce
      obj.mesh.rotation.x += obj.rotationSpeed;
      obj.mesh.rotation.y += obj.rotationSpeed;
      
      // Flottement vertical
      obj.mesh.position.y += Math.sin(time + obj.offset) * 0.002 * obj.floatSpeed;
      
      // Flottement horizontal léger
      obj.mesh.position.x += Math.sin(time * 0.5 + obj.offset) * 0.001;
      obj.mesh.position.z += Math.cos(time * 0.5 + obj.offset) * 0.001;
    });
  }

  controls.update();
  
  if (mirrorScene && mirrorScene.visible) {
    composer.render();
  } else if (pastelScene && pastelScene.visible) {
    pastelComposer.render();
  } else {
    renderer.render(scene, camera);
  }
}

// Optionnel : Ajouter des styles CSS pour améliorer l'apparence
const style = document.createElement('style');
style.textContent = `
  @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;700&display=swap');

  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }

  @keyframes float {
    0% { transform: translateX(-50%) translateY(0); }
    50% { transform: translateX(-50%) translateY(-10px); }
    100% { transform: translateX(-50%) translateY(0); }
  }
`;
document.head.appendChild(style);

// Appliquer l'animation de flottement au texte
textOverlay.style.animation = 'float 4s ease-in-out infinite';
textOverlay.style.fontFamily = 'Cinzel, serif';