import * as THREE from 'three';
import { FlyControls } from 'three/examples/jsm/controls/FlyControls.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import Stats from 'stats.js';
import { state } from './state.js';


export function setupStats() {
    state.stats = new Stats();
    state.stats.showPanel(0);
    document.body.appendChild(state.stats.dom);
}

export function setupScene() {
    state.scene = new THREE.Scene();
    const fogColor = new THREE.Color(0xdc9a58);
    state.scene.background = fogColor;
    state.scene.fog = new THREE.FogExp2(fogColor, 0.008);
}

export function setupCamera() {
    state.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    state.camera.position.set(30, 10, 0);
    state.camera.lookAt(30, 0, 40);
}

export function setupRenderer() {
    state.renderer = new THREE.WebGLRenderer({ antialias: true });
    state.renderer.setPixelRatio(window.devicePixelRatio);
    state.renderer.setSize(window.innerWidth, window.innerHeight);

    state.renderer.shadowMap.enabled = true;
    state.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    state.controls = new FlyControls(state.camera, state.renderer.domElement);
    state.controls.movementSpeed = 30;
    state.controls.rollSpeed = Math.PI / 6;     
    state.controls.autoForward = false;
    state.controls.dragToLook = true;

    const container = document.getElementById('ThreeJS');
    if (container) {
        container.appendChild(state.renderer.domElement);
    } else {
        document.body.appendChild(state.renderer.domElement);
    }
}

export function setupPostProcessing() {
    state.composer = new EffectComposer(state.renderer);
    const renderPass = new RenderPass(state.scene, state.camera);
    state.composer.addPass(renderPass);

    state.bloomPass = new UnrealBloomPass(
        new THREE.Vector2(window.innerWidth, window.innerHeight),
        0.4, // strength: force du bloom (luminosité)
        0.5, // radius: rayon du bloom
        0.9 // threshold: seuil de luminosité (plus c'est haut, plus il faut de lumière pour que ça brille)
    );
    state.composer.addPass(state.bloomPass);
}

export function lights() {
    const hemiLight = new THREE.HemisphereLight(0xffb870, 0x2a2a45, 0.6);
    hemiLight.position.set(0, 50, 0);
    state.scene.add(hemiLight);

    state.dirLight = new THREE.DirectionalLight(0xff7b00, 2);
    state.dirLight.position.set(-135, 100, -145);
    state.dirLight.castShadow = true;
    state.dirLight.shadow.mapSize.width = 4096; // Augmenté pour garder de la précision sur une grande zone
    state.dirLight.shadow.mapSize.height = 4096;
    state.dirLight.shadow.camera.near = 0.5;
    state.dirLight.shadow.camera.far = 300; // Augmenté pour couvrir toute la profondeur
    state.dirLight.shadow.camera.left = -150; // Couvre les 250 unités du plan (avec de la marge)
    state.dirLight.shadow.camera.right = 150;
    state.dirLight.shadow.camera.top = 150;
    state.dirLight.shadow.camera.bottom = -150;
    state.dirLight.shadow.bias = -0.0005; // Ajusté pour éviter le shadow acne sur une grande zone
    // 3. Création d'un "Soleil" visuel qui va briller grâce au Bloom
    const sunGeometry = new THREE.SphereGeometry(10, 32, 32);
    const sunMaterial = new THREE.MeshBasicMaterial({
        color: 0xffcc00,
    });
    // On multiplie la couleur par une grosse valeur pour dépasser le threshold du Bloom (0.9)
    sunMaterial.color.multiplyScalar(20); 

    state.sun = new THREE.Mesh(sunGeometry, sunMaterial);
    state.sun.position.copy(state.dirLight.position);
    state.sun.visible = false; // Caché par défaut
    state.scene.add(state.sun);

    state.scene.add(state.dirLight);
}


export function setupSkybox() {
    const loader = new THREE.CubeTextureLoader();
    loader.setPath('./textures/skyBox/Skybox-WebGL/sand/');
    const textureCube = loader.load([
        'right.png', 'left.png', 'top.png', 'bottom.png', 'back.png', 'front.png'
    ]);
    state.scene.background = textureCube;
}
