import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EXRLoader } from 'three/addons/loaders/EXRLoader.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';

// Shader personnalisé pour l'effet de pulsation
const PulseShader = {
	uniforms: {
		"tDiffuse": { value: null },
		"time": { value: 0 },
		"pulseColor": { value: new THREE.Color(0xffffff) }
	},
	vertexShader: `
		varying vec2 vUv;
		void main() {
			vUv = uv;
			gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
		}
	`,
	fragmentShader: `
		uniform sampler2D tDiffuse;
		uniform float time;
		uniform vec3 pulseColor;
		varying vec2 vUv;
		void main() {
			vec4 color = texture2D(tDiffuse, vUv);
			float pulse = 0.5 + 0.5 * sin(time * 2.0);
			vec3 glow = pulseColor * pulse * 0.1;
			color.rgb += glow;
			gl_FragColor = color;
		}
	`
};

// Shader pour l'effet de distorsion temporelle
const TimeDistortionShader = {
	uniforms: {
		"tDiffuse": { value: null },
		"time": { value: 0 },
		"distortionStrength": { value: 0.0 },
		"isReversed": { value: 0.0 }
	},
	vertexShader: `
		varying vec2 vUv;
		void main() {
			vUv = uv;
			gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
		}
	`,
	fragmentShader: `
		uniform sampler2D tDiffuse;
		uniform float time;
		uniform float distortionStrength;
		uniform float isReversed;
		varying vec2 vUv;
		void main() {
			vec2 uv = vUv;
			float dist = length(uv - vec2(0.5));
			float distortion = smoothstep(0.0, 0.5, dist) * distortionStrength;
			uv += normalize(uv - vec2(0.5)) * distortion * (isReversed * 2.0 - 1.0);
			vec4 color = texture2D(tDiffuse, uv);
			gl_FragColor = color;
		}
	`
};

let container, camera, scene, renderer, controls;
let torusMesh, light, composer, bloomPass, pulsePass, timeDistortionPass;
let exrEnv, pngEnv;
let currentEnv = 'EXR';
let pmremGenerator;
let particles;
let storyText;
let isHovered = false;
let opacity = 1.0;
let isTimeReversed = false;
let isTimeStopped = false;
let storyStates = [
	{
		click: "Il s'éveille et change sous vos yeux selon l'atmosphère qui l'entoure..."
	},
	{
		click: "Le temps retrouve son cours normal..."
	},
  {
		click: "Le temps s'arrête..."
	},
];

init();
animate();

function init() {
	container = document.getElementById('container');

	camera = new THREE.PerspectiveCamera(40, window.innerWidth / window.innerHeight, 1, 1000);
	camera.position.set(0, 0, 120);

	scene = new THREE.Scene();

	renderer = new THREE.WebGLRenderer({ antialias: true });
	renderer.setPixelRatio(window.devicePixelRatio);
	renderer.setSize(window.innerWidth, window.innerHeight);
	renderer.toneMapping = THREE.ACESFilmicToneMapping;
	container.appendChild(renderer.domElement);

	pmremGenerator = new THREE.PMREMGenerator(renderer);
	pmremGenerator.compileEquirectangularShader();

	// Postprocessing
	composer = new EffectComposer(renderer);
	composer.addPass(new RenderPass(scene, camera));
	bloomPass = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 1.5, 0.4, 0.85);
	composer.addPass(bloomPass);
	
	// Shader personnalisé pour la pulsation
	pulsePass = new ShaderPass(PulseShader);
	composer.addPass(pulsePass);

	// Ajout du shader de distorsion temporelle
	timeDistortionPass = new ShaderPass(TimeDistortionShader);
	composer.addPass(timeDistortionPass);

	// Controls
	controls = new OrbitControls(camera, renderer.domElement);
	controls.enableZoom = true;
	controls.enableDamping = true;
	controls.dampingFactor = 0.05;

	// Geometry avec textures avancées
	const geometry = new THREE.TorusKnotGeometry(18, 8, 150, 20);
	const material = new THREE.MeshStandardMaterial({
		metalness: 0.7,
		roughness: 0.2,
		envMapIntensity: 1.0,
		transparent: true,
		opacity: 1.0
	});

	// Chargement des textures avancées
	const textureLoader = new THREE.TextureLoader();
	material.normalMap = textureLoader.load('textures/normal.jpg');
	material.normalScale.set(0.5, 0.5);
	material.bumpMap = textureLoader.load('textures/bump.jpg');
	material.bumpScale = 0.1;
	material.displacementMap = textureLoader.load('textures/displacement.jpg');
	material.displacementScale = 0.2;

	torusMesh = new THREE.Mesh(geometry, material);
	scene.add(torusMesh);

	// Light inside torus
	light = new THREE.PointLight(0xffffff, 0, 100);
	scene.add(light);

	// Système de particules
	createParticles();

	// Story text
	createStoryText();

	// Environments
	new EXRLoader().load('textures/rogland.exr', (texture) => {
		texture.mapping = THREE.EquirectangularReflectionMapping;
		exrEnv = pmremGenerator.fromEquirectangular(texture).texture;
		if (currentEnv === 'EXR') setEnvironment('EXR');
	});

	new THREE.TextureLoader().load('textures/belfast.png', (texture) => {
		texture.mapping = THREE.EquirectangularReflectionMapping;
		texture.colorSpace = THREE.SRGBColorSpace;
		pngEnv = pmremGenerator.fromEquirectangular(texture).texture;
		if (currentEnv === 'PNG') setEnvironment('PNG');
	});

	// Event listeners
	window.addEventListener('resize', onWindowResize);
	window.addEventListener('click', onClick);
	window.addEventListener('mousemove', onMouseMove);
}

function createParticles() {
	const particleCount = 1000;
	const positions = new Float32Array(particleCount * 3);
	const colors = new Float32Array(particleCount * 3);

	for (let i = 0; i < particleCount * 3; i += 3) {
		positions[i] = (Math.random() - 0.5) * 200;
		positions[i + 1] = (Math.random() - 0.5) * 200;
		positions[i + 2] = (Math.random() - 0.5) * 200;

		colors[i] = Math.random();
		colors[i + 1] = Math.random();
		colors[i + 2] = Math.random();
	}

	const geometry = new THREE.BufferGeometry();
	geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
	geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

	// Chargement de la texture de particule
	const textureLoader = new THREE.TextureLoader();
	const particleTexture = textureLoader.load('particles/1.png');
	particleTexture.colorSpace = THREE.SRGBColorSpace;
	particleTexture.premultiplyAlpha = true;

	const material = new THREE.PointsMaterial({
		map: particleTexture,
		size: 2,
		vertexColors: true,
		transparent: true,
		opacity: 0.6,
		blending: THREE.AdditiveBlending,
		depthWrite: false,
		depthTest: false
	});

	particles = new THREE.Points(geometry, material);
	scene.add(particles);
}

function createStoryText() {
	// Ajout du lien vers Google Fonts
	const link = document.createElement('link');
	link.href = 'https://fonts.googleapis.com/css2?family=Cinzel:wght@600;700&display=swap';
	link.rel = 'stylesheet';
	document.head.appendChild(link);

	const storyDiv = document.createElement('div');
	storyDiv.style.position = 'absolute';
	storyDiv.style.top = '20px';
	storyDiv.style.left = '20px';
	storyDiv.style.color = 'white';
	storyDiv.style.fontFamily = 'Cinzel, serif';
	storyDiv.style.fontSize = '20px';
	storyDiv.style.maxWidth = '500px';
	storyDiv.style.textShadow = '2px 2px 4px rgba(0,0,0,0.5)';

	// Première phrase (statique)
	const staticText = document.createElement('p');
	staticText.textContent = "Un artefact ancien, oublié depuis des siècles...";
	storyDiv.appendChild(staticText);

	// Deuxième phrase (dynamique)
	const dynamicText = document.createElement('p');
	dynamicText.style.transition = 'opacity 0.5s ease-in-out, transform 0.5s ease-in-out';
	dynamicText.style.opacity = '1';
	dynamicText.style.transform = 'translateY(0)';
	dynamicText.textContent = "Cliquez pour révéler ses secrets. Le cristal sent votre présence.";
	storyDiv.appendChild(dynamicText);

	container.appendChild(storyDiv);
	storyText = { container: storyDiv, dynamic: dynamicText };
}

function onMouseMove(event) {
	const raycaster = new THREE.Raycaster();
	const mouse = new THREE.Vector2();
	mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
	mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

	raycaster.setFromCamera(mouse, camera);
	const intersects = raycaster.intersectObject(torusMesh);

	if (intersects.length > 0 && !isHovered) {
		isHovered = true;
		torusMesh.material.color = new THREE.Color(0xabcdef);
		storyText.dynamic.style.opacity = '0';
		storyText.dynamic.style.transform = 'translateY(-20px)';
		setTimeout(() => {
			let stateIndex;
			if (isTimeStopped) {
				stateIndex = 2;
			} else if (isTimeReversed) {
				stateIndex = 1;
			} else {
				stateIndex = 0;
			}
			storyText.dynamic.style.opacity = '1';
			storyText.dynamic.style.transform = 'translateY(0)';
		}, 500);
	} else if (intersects.length === 0 && isHovered) {
		isHovered = false;
		torusMesh.material.color = new THREE.Color(0xffffff);
		storyText.dynamic.style.opacity = '0';
		storyText.dynamic.style.transform = 'translateY(-20px)';
		setTimeout(() => {
			let stateIndex;
			if (isTimeStopped) {
				stateIndex = 2;
			} else if (isTimeReversed) {
				stateIndex = 1;
			} else {
				stateIndex = 0;
			}
			storyText.dynamic.textContent = storyStates[stateIndex].click;
			storyText.dynamic.style.opacity = '1';
			storyText.dynamic.style.transform = 'translateY(0)';
		}, 500);
	}
}

function onClick(event) {
	const raycaster = new THREE.Raycaster();
	const mouse = new THREE.Vector2();
	mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
	mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

	raycaster.setFromCamera(mouse, camera);
	const intersects = raycaster.intersectObject(torusMesh);

	if (intersects.length > 0) {
		if (!isTimeStopped) {
			if (!isTimeReversed) {
				isTimeReversed = true;
				currentEnv = 'PNG';
				setEnvironment('PNG');
			} else {
				isTimeStopped = true;
				// Pas de changement d'environnement pour l'état arrêté
			}
		} else {
			isTimeStopped = false;
			isTimeReversed = false;
			currentEnv = 'EXR';
			setEnvironment('EXR');
		}

		// Animation de pulsation temporelle
		animateTimePulse();
		
		// Mise à jour du texte
		updateStoryText();
	}
}

function setEnvironment(type) {
	if (type === 'EXR') {
		torusMesh.material.envMap = exrEnv;
		scene.background = exrEnv;
		bloomPass.enabled = true;
		bloomPass.strength = 0.4;
		bloomPass.radius = 0.05;
		light.intensity = 0.1;
		pulsePass.enabled = true;
		timeDistortionPass.enabled = true;
	} else {
		torusMesh.material.envMap = pngEnv;
		scene.background = pngEnv;
		bloomPass.enabled = false;
		light.intensity = 0.5;
		pulsePass.enabled = false;
		timeDistortionPass.enabled = false;
	}
	torusMesh.material.needsUpdate = true;
}

function animatePulse() {
	torusMesh.scale.set(1.2, 1.2, 1.2);
	setTimeout(() => {
		torusMesh.scale.set(1, 1, 1);
	}, 200);
}

function animateTimePulse() {
	let scale;
	if (isTimeStopped) {
		scale = 1.0; // Pas de changement d'échelle quand le temps est arrêté
	} else {
		scale = isTimeReversed ? 0.8 : 1.2;
	}
	torusMesh.scale.set(scale, scale, scale);
	
	// Animation de distorsion
	timeDistortionPass.uniforms.distortionStrength.value = isTimeStopped ? 0 : 0.2;
	
	setTimeout(() => {
		torusMesh.scale.set(1, 1, 1);
		timeDistortionPass.uniforms.distortionStrength.value = 0;
	}, 500);
}

function updateStoryText() {
	storyText.dynamic.style.opacity = '0';
	storyText.dynamic.style.transform = 'translateY(-20px)';
	
	setTimeout(() => {
		let stateIndex;
		if (isTimeStopped) {
			stateIndex = 2;
		} else if (isTimeReversed) {
			stateIndex = 1;
		} else {
			stateIndex = 0;
		}
		storyText.dynamic.textContent = storyStates[stateIndex].click;
		storyText.dynamic.style.opacity = '1';
		storyText.dynamic.style.transform = 'translateY(0)';
	}, 500);
}

function onWindowResize() {
	camera.aspect = window.innerWidth / window.innerHeight;
	camera.updateProjectionMatrix();
	renderer.setSize(window.innerWidth, window.innerHeight);
	composer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
	requestAnimationFrame(animate);
	const time = Date.now() * 0.001;
	
	// Gestion du fade avec une transition plus douce
	if (isHovered) {
		opacity = Math.min(1.0, opacity + 0.02);
	} else {
		opacity = Math.max(0.85, opacity - 0.015);
	}
	torusMesh.material.opacity = opacity;
	
	// Rotation en fonction du temps
	if (!isTimeStopped) {
		const rotationSpeed = isTimeReversed ? -0.005 : 0.005;
		torusMesh.rotation.y += rotationSpeed;
		particles.rotation.y += rotationSpeed * 0.2;
	}
	
	// Mise à jour des shaders
	pulsePass.uniforms.time.value = time;
	timeDistortionPass.uniforms.time.value = time;
	timeDistortionPass.uniforms.isReversed.value = isTimeReversed ? 1.0 : 0.0;
	
	controls.update();
	composer.render();
}
