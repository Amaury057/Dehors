import * as THREE from 'https://esm.sh/three@0.132.2';
import { FlyControls } from 'https://esm.sh/three@0.132.2/examples/jsm/controls/FlyControls.js';
import Stats from 'https://cdn.jsdelivr.net/npm/stats.js@0.17.0/src/Stats.js';
import GUI from 'https://esm.sh/lil-gui';
import * as BufferGeometryUtils from 'https://esm.sh/three@0.132.2/examples/jsm/utils/BufferGeometryUtils.js';
import { MeshSurfaceSampler } from 'https://esm.sh/three@0.132.2/examples/jsm/math/MeshSurfaceSampler.js';
import { EffectComposer } from 'https://esm.sh/three@0.132.2/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'https://esm.sh/three@0.132.2/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'https://esm.sh/three@0.132.2/examples/jsm/postprocessing/UnrealBloomPass.js';
import { GLTFLoader } from 'https://esm.sh/three@0.132.2/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'https://esm.sh/three@0.132.2/examples/jsm/loaders/DRACOLoader.js';
import { ImpostorManager } from './impostor/impostor.js';

// ==========================================
// 1. VARIABLES GLOBALES
// ==========================================
let scene, camera, renderer, controls, stats, composer;
let gui, impostorManager;
let waterMaterial, bloomPass;
let fairies;
let fairiesData = [];
let clock = new THREE.Clock();
const waterParams = {
    color: '#006b5b',
    opacity: 0.85,
    speed: 1.0,
    waveIntensity: 0.5
};

let kelpMaterial, kelpVertexShader, kelpFragmentShader;
let flowerVertexShader, flowerFragmentShader;
let flowerMaterials = [];
const flowerConfigs = [
    { color: "#FF0055", threshold: 0.55, mode: 0.0, stemColor: "#2e4a1e" },
    { color: "#c37b10", threshold: 0.00, mode: 1.0, stemColor: "#2e4a1e" },
    { color: "#AA00FF", threshold: 0.15, mode: 1.0, stemColor: "#2e4a1e" },
    { color: "#19cfab", threshold: 0.00, mode: 1.0, stemColor: "#2e4a1e" },
    { color: "#FFD700", threshold: 0.10, mode: 1.0, stemColor: "#2e4a1e" },
];

// Lancement de l'application
init();


// ==========================================
// 2. FONCTION D'INITIALISATION
// ==========================================
async function init() {
    const vertexResponse = await fetch('./shaders/water/vertex.glsl');
    const vertexShader = await vertexResponse.text();

    const fragmentResponse = await fetch('./shaders/water/fragment.glsl');
    const fragmentShader = await fragmentResponse.text();

    const flowerVResponse = await fetch('./shaders/flower/vertex.glsl');
    flowerVertexShader = await flowerVResponse.text();

    const flowerFResponse = await fetch('./shaders/flower/fragment.glsl');
    flowerFragmentShader = await flowerFResponse.text();

    const kelpVResponse = await fetch('./shaders/kelp/vertex.glsl');
    kelpVertexShader = await kelpVResponse.text();

    const kelpFResponse = await fetch('./shaders/kelp/fragment.glsl');
    kelpFragmentShader = await kelpFResponse.text();

    setupStats();
    setupScene();
    setupCamera();
    setupRenderer();
    setupPostProcessing();
    lights();

    impostorManager = new ImpostorManager(scene, camera);
    setupGUI();

    environement(vertexShader, fragmentShader);
    setupSkybox();
    setupFairies();

    setupEventListeners();
    animate();
}


// ==========================================
// 3. CONFIGURATION DE BASE (SETUP)
// ==========================================
function setupStats() {
    stats = new Stats();
    stats.showPanel(0); // 0: fps, 1: ms, 2: mb
    document.body.appendChild(stats.dom);
}

function setupScene() {
    scene = new THREE.Scene();

    // Ajout d'un brouillard chaleureux (couleur pêche/orangée)
    const fogColor = new THREE.Color(0xdc9a58);
    scene.background = fogColor; // Optionnel : assortir le fond au brouillard
    scene.fog = new THREE.FogExp2(fogColor, 0.008);
}

function setupCamera() {
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 10, 10);
}

function setupRenderer() {
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);

    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    controls = new FlyControls(camera, renderer.domElement);
    controls.movementSpeed = 30; // Vitesse de déplacement (WASD / Flèches)
    controls.rollSpeed = Math.PI / 6; // Vitesse de rotation
    controls.autoForward = false;
    controls.dragToLook = true; // Clique-glisse pour regarder autour

    const container = document.getElementById('ThreeJS');
    if (container) {
        container.appendChild(renderer.domElement);
    } else {
        document.body.appendChild(renderer.domElement);
    }
}

function setupPostProcessing() {
    composer = new EffectComposer(renderer);

    const renderPass = new RenderPass(scene, camera);
    composer.addPass(renderPass);

    bloomPass = new UnrealBloomPass(
        new THREE.Vector2(window.innerWidth, window.innerHeight),
        0.4, // strength (plus doux)
        0.5, // radius
        0.9  // threshold (plus haut pour ne cibler que le très brillant)
    );
    composer.addPass(bloomPass);
}

function lights() {
    // 1. Lumière d'ambiance globale (Hemisphere) : ciel chaud, sol sombre et froid
    const hemiLight = new THREE.HemisphereLight(0xffb870, 0x2a2a45, 0.6);
    hemiLight.position.set(0, 50, 0);
    scene.add(hemiLight);

    // 2. Lumière directionnelle (Soleil couchant) : orange vif et rasant
    const dirLight = new THREE.DirectionalLight(0xff7b00, 1.5);
    dirLight.position.set(50, 20, -50);
    dirLight.castShadow = true;

    // Configuration des ombres pour plus de douceur
    dirLight.shadow.mapSize.width = 2048;
    dirLight.shadow.mapSize.height = 2048;
    dirLight.shadow.camera.near = 0.5;
    dirLight.shadow.camera.far = 150;
    dirLight.shadow.camera.left = -50;
    dirLight.shadow.camera.right = 50;
    dirLight.shadow.camera.top = 50;
    dirLight.shadow.camera.bottom = -50;
    dirLight.shadow.bias = -0.0001;

    scene.add(dirLight);
}

function setupGUI() {
    gui = new GUI();
    const params = {
        impostors: true // Activé par défaut
    };
    gui.add(params, 'impostors').name('Activer LOD (Optimisation)').onChange(value => {
        if (impostorManager) {
            impostorManager.toggle(value);
        }
    });

    // Activer le LOD immédiatement
    setTimeout(() => {
        if (impostorManager) impostorManager.toggle(true);
    }, 100);

    const lodFolder = gui.addFolder('Réglages Optimisation (LOD)');
    lodFolder.add(impostorManager, 'lowPolyThreshold', 10, 150).name('Distance Low Poly');
    lodFolder.add(impostorManager, 'impostorThreshold', 50, 300).name('Distance Imposteur');
    lodFolder.add(impostorManager, 'impostorScale', 1, 15).name('Taille Imposteur');

    const waterFolder = gui.addFolder('Eau de la mare');
    waterFolder.addColor(waterParams, 'color').name('Couleur').onChange(val => {
        if (waterMaterial) waterMaterial.uniforms.uColor.value.set(val);
    });
    waterFolder.add(waterParams, 'opacity', 0, 1).name('Opacité').onChange(val => {
        if (waterMaterial) waterMaterial.uniforms.uOpacity.value = val;
    });
    waterFolder.add(waterParams, 'speed', 0, 5).name('Vitesse Vagues').onChange(val => {
        if (waterMaterial) waterMaterial.uniforms.uSpeed.value = val;
    });
    waterFolder.add(waterParams, 'waveIntensity', 0, 2).name('Taille Vagues').onChange(val => {
        if (waterMaterial) waterMaterial.uniforms.uWaveIntensity.value = val;
    });

    const bloomFolder = gui.addFolder('Post-Processing (Bloom)');
    const bloomParams = {
        strength: 0.4,
        radius: 0.5,
        threshold: 0.9
    };

    bloomFolder.add(bloomParams, 'strength', 0, 2).name('Force').onChange(val => {
        if (bloomPass) bloomPass.strength = val;
    });
    bloomFolder.add(bloomParams, 'radius', 0, 1).name('Rayon (Radius)').onChange(val => {
        if (bloomPass) bloomPass.radius = val;
    });
    bloomFolder.add(bloomParams, 'threshold', 0, 1).name('Seuil (Threshold)').onChange(val => {
        if (bloomPass) bloomPass.threshold = val;
    });

    const fogFolder = gui.addFolder('Brouillard');
    const fogParams = {
        color: '#dc9a58',
        density: 0.008
    };

    fogFolder.addColor(fogParams, 'color').name('Couleur').onChange(val => {
        if (scene && scene.fog) scene.fog.color.set(val);
        if (scene && scene.background) scene.background.set(val);
    });
    fogFolder.add(fogParams, 'density', 0, 0.05).name('Densité').onChange(val => {
        if (scene && scene.fog) scene.fog.density = val;
    });

    const kelpFolder = gui.addFolder('Kelp (Algues)');
    const kelpParams = {
        brightness: 0.6,
        speed: 1.5,
        colorBottom: '#021804',
        colorTop: '#357e35'
    };
    kelpFolder.add(kelpParams, 'brightness', 0, 3).name('Luminosité').onChange(val => {
        if (kelpMaterial) kelpMaterial.uniforms.uBrightness.value = val;
    });
    kelpFolder.add(kelpParams, 'speed', 0, 5).name('Vitesse Ondulation').onChange(val => {
        if (kelpMaterial) kelpMaterial.uniforms.uSpeed.value = val;
    });
    kelpFolder.addColor(kelpParams, 'colorBottom').name('Couleur Base').onChange(val => {
        if (kelpMaterial) kelpMaterial.uniforms.uColorBottom.value.set(val);
    });
    kelpFolder.addColor(kelpParams, 'colorTop').name('Couleur Sommet').onChange(val => {
        if (kelpMaterial) kelpMaterial.uniforms.uColorTop.value.set(val);
    });

    const flowerFolder = gui.addFolder('Fleurs (Shader)');
    flowerConfigs.forEach((config, i) => {
        const sub = flowerFolder.addFolder(`Fleur ${i + 1}`);
        sub.addColor(config, 'color').name('Couleur').onChange(val => {
            if (flowerMaterials[i]) {
                flowerMaterials[i].uniforms.uFlowerColor.value.set(val);
            }
        });
        sub.add(config, 'threshold', 0, 1).name('Seuil').onChange(val => {
            if (flowerMaterials[i]) {
                flowerMaterials[i].uniforms.uThreshold.value = val;
            }
        });
        sub.add(config, 'mode', { 'Vertical': 0, 'Horizontal': 1 }).name('Mode').onChange(val => {
            if (flowerMaterials[i]) {
                flowerMaterials[i].uniforms.uMode.value = parseFloat(val);
            }
        });
    });
    gui.close();
}

function setupFairies() {
    const fairyCount = 15;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(fairyCount * 3);

    // Position et taille de la mare
    const pondX = 30;
    const pondZ = 40;
    const pondRadius = 35;

    for (let i = 0; i < fairyCount; i++) {
        // Point d'ancrage aléatoire au-dessus de la mare (coordonnées polaires)
        const r = Math.random() * pondRadius;
        const theta = Math.random() * Math.PI * 2;

        const anchorX = pondX + r * Math.cos(theta);
        const anchorZ = pondZ + r * Math.sin(theta);
        const anchorY = 1.0 + Math.random() * 5.0; // Hauteur

        fairiesData.push({
            anchor: new THREE.Vector3(anchorX, anchorY, anchorZ),
            phase: Math.random() * Math.PI * 2,
            speed: 0.5 + Math.random() * 1.5,
            radiusX: 0.5 + Math.random() * 2.0,
            radiusY: 0.2 + Math.random() * 1.0,
            radiusZ: 0.5 + Math.random() * 2.0
        });

        positions[i * 3] = anchorX;
        positions[i * 3 + 1] = anchorY;
        positions[i * 3 + 2] = anchorZ;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const textureLoader = new THREE.TextureLoader();
    const sprite = textureLoader.load('./textures/navi/320pxNavi.png');

    const material = new THREE.PointsMaterial({
        size: 0.5,
        map: sprite,
        blending: THREE.AdditiveBlending, // Ajoute la couleur, parfait pour faire de la lumière
        depthWrite: false, // Empêche le tri de masquer les autres particules
        transparent: true,
        color: new THREE.Color(0xaaddff).multiplyScalar(10.0),
        opacity: 1.0
    });

    fairies = new THREE.Points(geometry, material);
    fairies.renderOrder = 10; // Toujours rendu après la mare et les arbres
    scene.add(fairies);
}

function setupSkybox() {
    const loader = new THREE.CubeTextureLoader();

    // On indique le chemin du dossier où se trouvent les images
    loader.setPath('./textures/skyBox/Skybox-WebGL/sand/');

    // On charge les 6 faces dans l'ordre exact demandé par Three.js
    const textureCube = loader.load([
        'right.png',  // pos-x (Droite)
        'left.png',   // neg-x (Gauche)
        'top.png',    // pos-y (Haut)
        'bottom.png', // neg-y (Bas)
        'back.png',  // pos-z (Avant)
        'front.png'    // neg-z (Arrière)
    ]);

    // On applique cette texture cubique comme fond de notre scène
    scene.background = textureCube;
}

// ==========================================
// 4. CRÉATION DE L'ENVIRONNEMENT ET TEXTURES
// ==========================================

// Fonction utilitaire pour éviter de répéter les mêmes lignes de configuration
// On ajoute repeatX et repeatY
function applyTextureSettings(texture, rotation, repeatX, repeatY) {
    texture.center.set(0.5, 0.5);
    texture.rotation = rotation;
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(repeatX, repeatY);
}

function loadTextures() {
    const textureLoader = new THREE.TextureLoader();

    // 1. Configuration du sol (inchangée)
    const groundDiff = textureLoader.load('./textures/ground/mosse/mosse_diff.png');
    const groundRoughness = textureLoader.load('./textures/ground/mosse/mosse_rough.png');
    const groundNormal = textureLoader.load('./textures/ground/mosse/mosse_nor.png');
    const groundRotation = Math.random() * Math.PI * 2;

    applyTextureSettings(groundDiff, groundRotation, 4, 4);
    applyTextureSettings(groundRoughness, groundRotation, 4, 4);
    applyTextureSettings(groundNormal, groundRotation, 4, 4);

    // 2. Chargement de l'Atlas d'herbe ENTIER (une seule fois)
    const grassDiff = textureLoader.load('./textures/grass/color.png');
    const grassRmao = textureLoader.load('./textures/grass/rmao.png');
    const grassNormal = textureLoader.load('./textures/grass/normal.png');

    // 3. Chargement des textures pour les buissons
    const bushColor = textureLoader.load('./textures/bush/BaseColor.png');
    const bushNormal = textureLoader.load('./textures/bush/Normal.png');
    const bushORM = textureLoader.load('./textures/bush/OcclusionRoughnessMetallic.png');

    // 4. Chargement des textures pour les plantes/fleurs
    const flowerAlphas = [
        textureLoader.load('./textures/flowers/alpha1.png'),
        textureLoader.load('./textures/flowers/alpha2.png'),
        textureLoader.load('./textures/flowers/alpha3.png'),
        textureLoader.load('./textures/flowers/alpha4.png'),
        textureLoader.load('./textures/flowers/alpha5.png'),
    ];

    const kelpTexture = textureLoader.load('./textures/brick/redbrick_diff.jpg');

    const treeDiff = textureLoader.load('./textures/tree/color2.png');
    const treeNormal = textureLoader.load('./textures/tree/normal-512.jpg');
    const treeORM = textureLoader.load('./textures/tree/rmao-512.jpg');
    const treeImpostor = textureLoader.load('./textures/tree/impostor.png');

    return {
        groundDiff, groundRoughness, groundNormal,
        grassDiff, grassRmao, grassNormal,
        bushColor, bushNormal, bushORM,
        flowerAlphas,
        kelpTexture,
        treeDiff, treeNormal, treeORM, treeImpostor
    };
}

// Créer une géométrie de brin d'herbe découpée pour un quadrant de l'atlas 2x2
function createGrassGeometry(quadrantX, quadrantY) {
    const geo = new THREE.PlaneGeometry(1.0, 1.0, 1, 5);
    geo.translate(0, 0.5, 0); // On met le pivot en bas pour que l'herbe pousse du sol

    // Remapper les UVs vers le bon quadrant (2x2 atlas)
    const uvs = geo.attributes.uv;
    for (let i = 0; i < uvs.count; i++) {
        const u = uvs.getX(i) * 0.5 + quadrantX * 0.5; // 0 ou 0.5
        const v = uvs.getY(i) * 0.5 + quadrantY * 0.5; // 0 ou 0.5
        uvs.setXY(i, u, v);
    }
    return geo;
}

function setupShaders(vertexShader, fragmentShader) {

    const material = new THREE.ShaderMaterial({
        vertexShader: vertexShader,
        fragmentShader: fragmentShader,
        transparent: true,
        uniforms: {
            iTime: { value: 0.0 },
            uColor: { value: new THREE.Color(waterParams.color) },
            uOpacity: { value: waterParams.opacity },
            uSpeed: { value: waterParams.speed },
            uWaveIntensity: { value: waterParams.waveIntensity }
        }
    });

    return material;
}


function environement(vertexShader, fragmentShader) {
    // --- 1. CRÉATION DU SOL ---
    const planeGeometry = new THREE.PlaneGeometry(250, 250, 199, 199);
    const positionAttribute = planeGeometry.attributes.position;

    // Déformation du terrain
    for (let i = 0; i < positionAttribute.count; i++) {
        const x = positionAttribute.getX(i);
        const y = positionAttribute.getY(i);

        let z = Math.sin(x * 0.2) * Math.cos(y * 0.2) * 2.0;
        z += Math.sin(x * 0.5) * Math.cos(y * 0.3) * 0.5;

        // Création de la mare (Mathématiques magiques !)
        const pondX = 30;  // Position X
        const pondY = -40; // Position Y locale (Z mondial = 40)
        const pondRadius = 37; // Taille du trou
        const pondDepth = 10; // Profondeur du trou

        const dx = x - pondX;
        const dy = y - pondY;

        // On ajoute un peu de bruit pour que les bords ne soient pas parfaitement ronds
        const noise = Math.sin(x * 0.5) * Math.cos(y * 0.5) * 3.0;
        const distance = Math.sqrt(dx * dx + dy * dy) + noise;

        if (distance < pondRadius) {
            // Calcul de la pente douce (smoothstep)
            const distNormalized = distance / pondRadius;
            const ease = distNormalized * distNormalized * (3 - 2 * distNormalized);
            // On creuse le sol !
            z -= pondDepth * (1 - ease);
        }

        positionAttribute.setZ(i, z);
    }

    planeGeometry.computeVertexNormals();

    const textures = loadTextures();
    const planeMaterial = new THREE.MeshStandardMaterial({
        color: 0x888888, // Teinte plus sombre pour assombrir la texture
        map: textures.groundDiff,
        roughnessMap: textures.groundRoughness,
        normalMap: textures.groundNormal,
        normalScale: new THREE.Vector2(1, 1),
    });

    const plane = new THREE.Mesh(planeGeometry, planeMaterial);
    plane.rotation.x = -Math.PI / 2; // Coucher le plan pour faire le sol
    plane.updateMatrixWorld();
    scene.add(plane);

    // --- 1.5 CRÉATION DE L'EAU (MARE) AVEC SHADER ---
    const waterGeometry = new THREE.PlaneGeometry(70, 70, 64, 64);

    // On utilise les shaders pour créer l'effet d'eau
    waterMaterial = setupShaders(vertexShader, fragmentShader);

    const water = new THREE.Mesh(waterGeometry, waterMaterial);
    water.rotation.x = -Math.PI / 2;
    water.position.set(30, -1.5, 40); // Aligné avec le centre du trou (X=30, Z=40)
    water.renderOrder = -1; // Rendu en premier parmi les objets transparents
    scene.add(water);

    // --- 2. MISE EN PLACE DU SCATTER (4 VARIANTES D'HERBE) ---

    // On génère 4 géométries, une par quadrant : (colonne, ligne)
    const grassGeometries = [
        createGrassGeometry(0, 0), // 0: Bas-gauche
        createGrassGeometry(1, 0), // 1: Bas-droite
        createGrassGeometry(0, 1), // 2: Haut-gauche
        createGrassGeometry(1, 1)  // 3: Haut-droite
    ];

    // Un seul matériel partagé par tout le monde !
    const grassMaterial = new THREE.MeshStandardMaterial({
        side: THREE.DoubleSide,
        transparent: false,
        alphaTest: 0.3,
        map: textures.grassDiff,
        roughnessMap: textures.grassRmao,
        normalMap: textures.grassNormal,
        normalScale: new THREE.Vector2(2, 1),
    });

    const grassCount = 400000;
    const grassPerVariant = Math.floor(grassCount / 4); // ~37500 par variante

    // On crée 4 InstancedMesh, chacun reçoit un quart des brins
    const grassMeshes = grassGeometries.map(geo => {
        const mesh = new THREE.InstancedMesh(geo, grassMaterial, grassPerVariant);
        scene.add(mesh);
        return mesh;
    });

    const sampler = new MeshSurfaceSampler(plane).build();

    const dummy = new THREE.Object3D();
    const _position = new THREE.Vector3();
    const _normal = new THREE.Vector3();

    // On garde un compteur pour savoir combien de brins on a placé dans chaque variante
    const counters = [0, 0, 0, 0];

    // On boucle 150 000 fois pour placer toute l'herbe
    for (let i = 0; i < grassCount; i++) {
        sampler.sample(_position, _normal);

        _position.applyMatrix4(plane.matrixWorld);

        // Empêcher l'herbe de pousser sous l'eau !
        if (_position.y < -1.5) {
            i--; // On annule cette itération pour réessayer ailleurs
            continue;
        }

        dummy.position.copy(_position);

        // Rotation aléatoire
        dummy.rotation.y = Math.random() * Math.PI * 2;

        // Taille aléatoire (entre 0.5x et 2.0x la taille normale)
        const scale = 0.5 + Math.random() * 1.5;
        dummy.scale.set(scale, scale, scale);

        dummy.updateMatrix();

        // Assigner aléatoirement à une des 4 variantes
        let variant = Math.floor(Math.random() * 4);

        // Sécurité : Si le "groupe" tiré au sort est déjà plein, on le met dans un autre
        if (counters[variant] >= grassPerVariant) {
            for (let j = 0; j < 4; j++) {
                if (counters[j] < grassPerVariant) { variant = j; break; }
            }
        }

        // On enregistre la position dans le bon InstancedMesh
        grassMeshes[variant].setMatrixAt(counters[variant], dummy.matrix);
        counters[variant]++;
    }

    // On valide les mises à jour pour les 4 meshes
    grassMeshes.forEach(mesh => {
        mesh.instanceMatrix.needsUpdate = true;
    });

    // --- 3. MISE EN PLACE DES BUISSONS (PLANS CROISÉS) ---
    // Création de la géométrie de plans croisés pour la végétation
    const p1 = new THREE.PlaneGeometry(2, 2);
    const p2 = new THREE.PlaneGeometry(2, 2);
    p2.rotateY(Math.PI / 2);
    const crossedGeo = BufferGeometryUtils.mergeBufferGeometries([p1, p2]);
    crossedGeo.translate(0, 1, 0); // On remonte pour que la base soit sur le sol

    const bushMaterial = new THREE.MeshStandardMaterial({
        map: textures.bushColor,
        normalMap: textures.bushNormal,
        aoMap: textures.bushORM,
        roughnessMap: textures.bushORM,
        metalnessMap: textures.bushORM,
        side: THREE.DoubleSide,
        alphaTest: 0.3,
        transparent: false
    });

    const bushCount = 500;
    const bushMesh = new THREE.InstancedMesh(crossedGeo, bushMaterial, bushCount);
    scene.add(bushMesh);

    for (let i = 0; i < bushCount; i++) {
        sampler.sample(_position, _normal);
        _position.applyMatrix4(plane.matrixWorld);

        // Empêcher de pousser sous l'eau
        if (_position.y < -1.5) { i--; continue; }

        dummy.position.copy(_position);
        dummy.rotation.y = Math.random() * Math.PI;
        const scale = 0.8 + Math.random() * 1.5;
        dummy.scale.set(scale, scale, scale);
        dummy.updateMatrix();
        bushMesh.setMatrixAt(i, dummy.matrix);
    }
    bushMesh.instanceMatrix.needsUpdate = true;

    // --- 4. MISE EN PLACE DES PLANTES/FLEURS (Shaders personnalisés) ---
    function createFlowerMaterial(alphaTex, config) {
        const material = new THREE.MeshStandardMaterial({
            map: alphaTex,
            transparent: true,
            alphaTest: 0.5,
            side: THREE.DoubleSide,
        });

        // On stocke les uniforms dans le matériau pour pouvoir les mettre à jour via le GUI
        material.uniforms = {
            uFlowerColor: { value: new THREE.Color(config.color) },
            uStemColor: { value: new THREE.Color(config.stemColor) },
            uThreshold: { value: config.threshold },
            uMode: { value: config.mode }
        };

        material.onBeforeCompile = (shader) => {
            shader.uniforms.uFlowerColor = material.uniforms.uFlowerColor;
            shader.uniforms.uStemColor = material.uniforms.uStemColor;
            shader.uniforms.uThreshold = material.uniforms.uThreshold;
            shader.uniforms.uMode = material.uniforms.uMode;

            // Injection des morceaux de shaders chargés depuis les fichiers .glsl
            // On utilise le marqueur // SPLIT défini dans les fichiers .glsl
            const vertexParts = flowerVertexShader.split('// SPLIT');
            const fragmentParts = flowerFragmentShader.split('// SPLIT');

            shader.vertexShader = vertexParts[0] + "\n" + shader.vertexShader;
            shader.vertexShader = shader.vertexShader.replace('#include <uv_vertex>', vertexParts[1]);

            shader.fragmentShader = fragmentParts[0] + "\n" + shader.fragmentShader;
            shader.fragmentShader = shader.fragmentShader.replace('#include <color_fragment>', fragmentParts[1]);
        };
        return material;
    }

    const flowerCountPerVariant = 800;
    // On crée une géométrie spécifique pour les fleurs (plus petites que les buissons)
    const f1 = new THREE.PlaneGeometry(1, 1);
    const f2 = new THREE.PlaneGeometry(1, 1);
    f2.rotateY(Math.PI / 2);
    const flowerCrossedGeo = BufferGeometryUtils.mergeBufferGeometries([f1, f2]);
    flowerCrossedGeo.translate(0, 0.5, 0);

    textures.flowerAlphas.forEach((tex, i) => {
        const config = flowerConfigs[i];
        const mat = createFlowerMaterial(tex, config);
        flowerMaterials[i] = mat; // Stockage pour mise à jour lil-gui

        const fMesh = new THREE.InstancedMesh(flowerCrossedGeo, mat, flowerCountPerVariant);
        scene.add(fMesh);

        for (let j = 0; j < flowerCountPerVariant; j++) {
            sampler.sample(_position, _normal);
            _position.applyMatrix4(plane.matrixWorld);

            // Empêcher de pousser sous l'eau
            if (_position.y < -1.5) { j--; continue; }

            dummy.position.copy(_position);
            dummy.rotation.y = Math.random() * Math.PI;
            const scale = 0.3 + Math.random() * 0.5;
            dummy.scale.set(scale, scale, scale);
            dummy.updateMatrix();
            fMesh.setMatrixAt(j, dummy.matrix);
        }
        fMesh.instanceMatrix.needsUpdate = true;
    });

    // Chargement du model de l'arbre
    const dracoLoader = new DRACOLoader();
    // On utilise le décodeur depuis un CDN car il n'est pas présent localement
    dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.4.1/');

    const loader = new GLTFLoader();
    loader.setDRACOLoader(dracoLoader);

    // --- CHARGEMENT DES ARBRES (LOD HIGH ET LOW) ---
    const loadModel = (path) => {
        return new Promise((resolve) => {
            loader.load(path, (gltf) => resolve(gltf));
        });
    };

    Promise.all([
        loadModel('./models/tree.glb'),
        loadModel('./models/tree1.glb')
    ]).then(([gltfHigh, gltfLow]) => {
        textures.treeDiff.minFilter = THREE.LinearMipMapLinearFilter;
        textures.treeDiff.encoding = THREE.sRGBEncoding;
        textures.treeDiff.flipY = false;

        const setupTreeMeshes = (gltf) => {
            const meshes = [];
            gltf.scene.updateMatrixWorld(true);
            gltf.scene.traverse(child => {
                if (child.isMesh) {
                    child.material.map = textures.treeDiff;
                    child.material.normalMap = textures.treeNormal;
                    child.material.roughnessMap = textures.treeORM;
                    child.material.metalnessMap = textures.treeORM;
                    child.material.aoMap = textures.treeORM;
                    child.material.transparent = true;
                    child.material.alphaTest = 0.5;
                    child.material.side = THREE.DoubleSide;
                    child.geometry.applyMatrix4(child.matrixWorld);
                    meshes.push(child);
                }
            });
            return meshes;
        };

        const highPolyMeshes = setupTreeMeshes(gltfHigh);
        const lowPolyMeshes = setupTreeMeshes(gltfLow);

        const treeCount = 250;
        const treeTransforms = [];

        const instancedHigh = highPolyMeshes.map(m => {
            const im = new THREE.InstancedMesh(m.geometry, m.material, treeCount);
            im.renderOrder = 1; // Rendu après la mare
            scene.add(im);
            return im;
        });

        const instancedLow = lowPolyMeshes.map(m => {
            const im = new THREE.InstancedMesh(m.geometry, m.material, treeCount);
            im.renderOrder = 1; // Rendu après la mare
            // On cache le low poly par défaut (on est en High Poly au début)
            const emptyMatrix = new THREE.Matrix4().makeScale(0, 0, 0);
            for (let i = 0; i < treeCount; i++) im.setMatrixAt(i, emptyMatrix);
            scene.add(im);
            return im;
        });

        for (let i = 0; i < treeCount; i++) {
            sampler.sample(_position, _normal);
            _position.applyMatrix4(plane.matrixWorld);

            if (_position.y < -1.5) { i--; continue; }

            dummy.position.copy(_position);
            dummy.position.y -= 1;
            dummy.rotation.y = Math.random() * Math.PI * 2;
            const scale = 3 * (0.8 + Math.random() * 0.4);
            dummy.scale.set(scale, scale, scale);
            dummy.updateMatrix();

            instancedHigh.forEach(im => im.setMatrixAt(i, dummy.matrix));

            treeTransforms.push({
                position: dummy.position.clone(),
                rotation: dummy.rotation.clone(),
                scale: scale
            });
        }

        instancedHigh.forEach(im => im.instanceMatrix.needsUpdate = true);
        instancedLow.forEach(im => im.instanceMatrix.needsUpdate = true);

        // Initialisation du manager avec les 3 niveaux de détail
        impostorManager.init(instancedHigh, instancedLow, treeTransforms, textures.treeImpostor);
    });

    // --- 5. MISE EN PLACE DU KELP (ALGUES) ---
    // Le kelp ne pousse que dans le fond de la mare (profondeur > 5)
    kelpMaterial = new THREE.ShaderMaterial({
        vertexShader: kelpVertexShader,
        fragmentShader: kelpFragmentShader,
        side: THREE.DoubleSide,
        transparent: false,
        fog: true, // Activer le brouillard sur ce matériau custom
        uniforms: {
            iTime: { value: 0.0 },
            iTexture: { value: textures.kelpTexture },
            uBrightness: { value: 0.6 },
            uSpeed: { value: 1.5 },
            uColorBottom: { value: new THREE.Color('#021804') },
            uColorTop: { value: new THREE.Color('#357e35') },
            ...THREE.UniformsLib['fog']
        }
    });

    const kelpCount = 300; // Nombre d'algues
    const kelpGeometries = [];

    // On réutilise le sampler du sol déjà créé pour les fleurs/arbres
    for (let i = 0; i < kelpCount; i++) {
        sampler.sample(_position, _normal);
        _position.applyMatrix4(plane.matrixWorld);

        // Uniquement si on est dans la zone profonde de la mare (y <= -5)
        if (_position.y <= -5.0) {
            // Calcul de la hauteur : on veut que ça reste bien sous l'eau
            const depthToSurface = -1.5 - _position.y;
            const height = depthToSurface * (0.4 + Math.random() * 0.3); // 40% à 70% de la profondeur

            // Création de deux plans croisés "en X" - Plus fins (0.2 au lieu de 0.5)
            const p1 = new THREE.PlaneGeometry(0.4, height, 1, 6);
            const p2 = new THREE.PlaneGeometry(0.4, height, 1, 6);
            p2.rotateY(Math.PI / 2);

            const geometry = BufferGeometryUtils.mergeBufferGeometries([p1, p2]);
            geometry.translate(0, height / 2, 0);

            const angle = Math.random() * Math.PI * 2;
            geometry.rotateY(angle);
            geometry.translate(_position.x, _position.y, _position.z);

            kelpGeometries.push(geometry);
        } else {
            // On cherche un autre endroit si celui-ci n'est pas assez profond
            if (i < 5000) i--;
        }
    }

    if (kelpGeometries.length > 0) {
        const mergedKelpGeometry = BufferGeometryUtils.mergeBufferGeometries(kelpGeometries);
        const kelpMesh = new THREE.Mesh(mergedKelpGeometry, kelpMaterial);
        kelpMesh.receiveShadow = true;
        kelpMesh.frustumCulled = false; // Important pour les géométries fusionnées
        scene.add(kelpMesh);
    }

}

// ==========================================
// 5. ÉVÉNEMENTS ET BOUCLE D'ANIMATION
// ==========================================
function setupEventListeners() {
    window.addEventListener('resize', onWindowResize, false);
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    if (composer) composer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
    stats.begin();
    requestAnimationFrame(animate);

    const delta = clock.getDelta();

    if (controls) controls.update(delta); // Mouvements fluides de la caméra

    if (impostorManager) impostorManager.update();
    const time = clock.getElapsedTime();
    waterMaterial.uniforms.iTime.value = time;
    if (kelpMaterial) kelpMaterial.uniforms.iTime.value = time;

    // Animation des fées (mouvement d'essaim / vol stationnaire)
    if (fairies) {
        const positions = fairies.geometry.attributes.position.array;

        for (let i = 0; i < fairiesData.length; i++) {
            const data = fairiesData[i];
            const t = time * data.speed + data.phase;

            positions[i * 3] = data.anchor.x + Math.sin(t) * data.radiusX;
            positions[i * 3 + 1] = data.anchor.y + Math.sin(t * 1.3) * data.radiusY;
            positions[i * 3 + 2] = data.anchor.z + Math.cos(t * 1.1) * data.radiusZ;
        }

        fairies.geometry.attributes.position.needsUpdate = true;
    }

    composer.render();
    stats.end();
}