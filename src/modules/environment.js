import * as THREE from 'three';
import * as BufferGeometryUtils from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { MeshSurfaceSampler } from 'three/examples/jsm/math/MeshSurfaceSampler.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { state } from './state.js';
import { loadTextures } from './loaders.js';


function setupShaders(vertexShader, fragmentShader) {
    const material = new THREE.ShaderMaterial({
        vertexShader: vertexShader,
        fragmentShader: fragmentShader,
        transparent: true,
        // Utiliser pas les fichier glsl (shaders)
        uniforms: {
            iTime: { value: 0.0 },
            uColor: { value: new THREE.Color(state.waterParams.color) },
            uOpacity: { value: state.waterParams.opacity },
            uSpeed: { value: state.waterParams.speed },
            uWaveIntensity: { value: state.waterParams.waveIntensity }
        }
    });
    return material;
}

function createGrassGeometry(quadrantX, quadrantY) {
    const geo = new THREE.PlaneGeometry(1.0, 1.0, 1, 5);
    geo.translate(0, 0.5, 0);
    const uvs = geo.attributes.uv;
    for (let i = 0; i < uvs.count; i++) {
        const u = uvs.getX(i) * 0.5 + quadrantX * 0.5;
        const v = uvs.getY(i) * 0.5 + quadrantY * 0.5;
        uvs.setXY(i, u, v);
    }
    return geo;
}

export function environement(vertexShader, fragmentShader) {
    const planeGeometry = new THREE.PlaneGeometry(250, 250, 199, 199);
    const positionAttribute = planeGeometry.attributes.position;

    // Algorithme qui permet de créer le relief du sol
    for (let i = 0; i < positionAttribute.count; i++) {
        const x = positionAttribute.getX(i);
        const y = positionAttribute.getY(i);
        let z = Math.sin(x * 0.2) * Math.cos(y * 0.2) * 2.0;
        z += Math.sin(x * 0.5) * Math.cos(y * 0.3) * 0.5;

        // Position de la mare
        const pondX = 30; 
        const pondY = -40;

        // Rayon de la mare 
        const pondRadius = 37;

        // Profondeur de la mare
        const pondDepth = 10;
        
        const dx = x - pondX; 
        const dy = y - pondY;

        // Bruit autour de la mare pour un aspect plus naturelle
        const noise = Math.sin(x * 0.5) * Math.cos(y * 0.5) * 3.0;

        const distance = Math.sqrt(dx * dx + dy * dy) + noise;
        if (distance < pondRadius) {
            const distNormalized = distance / pondRadius;
            const ease = distNormalized * distNormalized * (3 - 2 * distNormalized);
            z -= pondDepth * (1 - ease);
        }
        positionAttribute.setZ(i, z);
    }
    planeGeometry.computeVertexNormals();

    const textures = loadTextures();
    const planeMaterial = new THREE.MeshStandardMaterial({
        color: 0x888888,
        map: textures.groundDiff,
        roughnessMap: textures.groundRoughness,
        normalMap: textures.groundNormal,
        normalScale: new THREE.Vector2(1, 1),
    });

    const plane = new THREE.Mesh(planeGeometry, planeMaterial);
    plane.rotation.x = -Math.PI / 2;
    plane.castShadow = true;
    plane.receiveShadow = true;
    plane.updateMatrixWorld();
    state.scene.add(plane);

    const waterGeometry = new THREE.PlaneGeometry(70, 70, 64, 64);
    state.waterMaterial = setupShaders(vertexShader, fragmentShader);
    const water = new THREE.Mesh(waterGeometry, state.waterMaterial);
    water.rotation.x = -Math.PI / 2;
    water.position.set(30, -1.5, 40);
    water.renderOrder = -1;
    state.scene.add(water);

    // Découpe le png en 4
    const grassGeometries = [
        createGrassGeometry(0, 0), createGrassGeometry(1, 0),
        createGrassGeometry(0, 1), createGrassGeometry(1, 1)
    ];

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
    const grassPerVariant = Math.floor(grassCount / 4);
    const grassMeshes = grassGeometries.map(geo => {
        const mesh = new THREE.InstancedMesh(geo, grassMaterial, grassPerVariant);
        state.scene.add(mesh);
        return mesh;
    });

    // Permet de placer de l'herbe sur le sol
    const sampler = new MeshSurfaceSampler(plane).build();

    // On utilise un "dummy" (objet invisible) pour calculer la position/rotation/taille 
    // de chaque brin d'herbe avant de l'envoyer au GPU
    const dummy = new THREE.Object3D();
    const _position = new THREE.Vector3(); // Stocke la position trouvée par le sampler
    const _normal = new THREE.Vector3();   // Stocke l'orientation du sol à cet endroit
    const counters = [0, 0, 0, 0];         // Chaque variant de l'herbe

    for (let i = 0; i < grassCount; i++) {
        // 1. Point aléatoire sur le sol
        sampler.sample(_position, _normal);

        // 2. Convertit les coordonnées locales du sol en coordonnées mondiales (World Space)
        _position.applyMatrix4(plane.matrixWorld);

        // 3. Si le point est sous y < -1.5, on annule et on recommence ailleurs
        if (_position.y < -1.5) { i--; continue; }

        // 4. On configure notre objet invisible (dummy) à cet endroit
        dummy.position.copy(_position);
        dummy.rotation.y = Math.random() * Math.PI * 2; // Rotation aléatoire sur 360°
        const scale = 0.5 + Math.random() * 1.5;        // Taille aléatoire
        dummy.scale.set(scale, scale, scale);

        // 5. On calcule la "Matrix" (le condensé de position/rotation/scale)
        dummy.updateMatrix();

        // 6. On choisit une des 4 variantes d'herbe au hasard
        let variant = Math.floor(Math.random() * 4);

        // 7. Si le groupe ( grassCount / 4 : 100000 dans mon cas) choisi est déjà plein, on cherche le prochain groupe disponible
        if (counters[variant] >= grassPerVariant) {
            for (let j = 0; j < 4; j++) { 
                if (counters[j] < grassPerVariant) { variant = j; break; } 
            }
        }

        // 8. On enregistre cette instance dans le bon InstancedMesh
        grassMeshes[variant].setMatrixAt(counters[variant], dummy.matrix);
        counters[variant]++;
    }

    // Prévient Three.js que les données ont changé pour qu'il mette à jour l'affichage
    grassMeshes.forEach(mesh => { mesh.instanceMatrix.needsUpdate = true; });


    const p1 = new THREE.PlaneGeometry(2, 2);
    const p2 = new THREE.PlaneGeometry(2, 2);
    p2.rotateY(Math.PI / 2);
    const crossedGeo = BufferGeometryUtils.mergeBufferGeometries([p1, p2]);
    crossedGeo.translate(0, 1, 0);

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
    bushMesh.castShadow = true;
    bushMesh.receiveShadow = true;
    state.scene.add(bushMesh);

    for (let i = 0; i < bushCount; i++) {
        sampler.sample(_position, _normal);
        _position.applyMatrix4(plane.matrixWorld);
        if (_position.y < -1.5) { i--; continue; }
        dummy.position.copy(_position);
        dummy.rotation.y = Math.random() * Math.PI;
        const scale = 0.8 + Math.random() * 1.5;
        dummy.scale.set(scale, scale, scale);
        dummy.updateMatrix();
        bushMesh.setMatrixAt(i, dummy.matrix);
    }
    bushMesh.instanceMatrix.needsUpdate = true;

    function createFlowerMaterial(alphaTex, config) {
        const material = new THREE.MeshStandardMaterial({
            map: alphaTex, 
            transparent: true, 
            alphaTest: 0.5, 
            side: THREE.DoubleSide,
        });
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
            const vertexParts = state.flowerVertexShader.split('// SPLIT');
            const fragmentParts = state.flowerFragmentShader.split('// SPLIT');
            shader.vertexShader = vertexParts[0] + "\n" + shader.vertexShader;
            shader.vertexShader = shader.vertexShader.replace('#include <uv_vertex>', vertexParts[1]);
            shader.fragmentShader = fragmentParts[0] + "\n" + shader.fragmentShader;
            shader.fragmentShader = shader.fragmentShader.replace('#include <color_fragment>', fragmentParts[1]);
        };
        return material;
    }

    const flowerCountPerVariant = 800;
    const f1 = new THREE.PlaneGeometry(1, 1);
    const f2 = new THREE.PlaneGeometry(1, 1);
    f2.rotateY(Math.PI / 2);
    const flowerCrossedGeo = BufferGeometryUtils.mergeBufferGeometries([f1, f2]);
    flowerCrossedGeo.translate(0, 0.5, 0);

    textures.flowerAlphas.forEach((tex, i) => {
        const config = state.flowerConfigs[i];
        const mat = createFlowerMaterial(tex, config);
        state.flowerMaterials[i] = mat;
        const fMesh = new THREE.InstancedMesh(flowerCrossedGeo, mat, flowerCountPerVariant);
        state.scene.add(fMesh);
        for (let j = 0; j < flowerCountPerVariant; j++) {
            sampler.sample(_position, _normal);
            _position.applyMatrix4(plane.matrixWorld);
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
                    child.castShadow = true;
                    child.receiveShadow = true;
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
            im.castShadow = true;
            im.receiveShadow = true;
            state.scene.add(im);
            return im;
        });

        const instancedLow = lowPolyMeshes.map(m => {
            const im = new THREE.InstancedMesh(m.geometry, m.material, treeCount);
            im.renderOrder = 1; // Rendu après la mare
            // On cache le low poly par défaut (on est en High Poly au début)
            const emptyMatrix = new THREE.Matrix4().makeScale(0, 0, 0);
            for (let i = 0; i < treeCount; i++) im.setMatrixAt(i, emptyMatrix);
            state.scene.add(im);
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
        state.impostorManager.init(instancedHigh, instancedLow, treeTransforms, textures.treeImpostor);
    });

    // --- 5. MISE EN PLACE DU KELP (ALGUES) ---
    // Le kelp ne pousse que dans le fond de la mare (profondeur > 5)
    state.kelpMaterial = new THREE.ShaderMaterial({
        vertexShader: state.kelpVertexShader,
        fragmentShader: state.kelpFragmentShader,
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
        const kelpMesh = new THREE.Mesh(mergedKelpGeometry, state.kelpMaterial);
        kelpMesh.receiveShadow = true;
        kelpMesh.frustumCulled = false; // Important pour les géométries fusionnées
        state.scene.add(kelpMesh);
    }
}
