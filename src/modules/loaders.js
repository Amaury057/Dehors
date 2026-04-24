import * as THREE from 'three';
import { state } from './state.js';

// Fonction utilitaire pour configurer les textures
function applyTextureSettings(texture, rotation, repeatX, repeatY) {
    texture.center.set(0.5, 0.5);
    texture.rotation = rotation;
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(repeatX, repeatY);
}

// Chargement des textures
export function loadTextures() {
    const textureLoader = new THREE.TextureLoader();

    // 1. Configuration du sol
    const groundDiff = textureLoader.load('./textures/ground/mosse/mosse_diff.png');
    const groundRoughness = textureLoader.load('./textures/ground/mosse/mosse_rough.png');
    const groundNormal = textureLoader.load('./textures/ground/mosse/mosse_nor.png');
    const groundRotation = Math.random() * Math.PI * 2;

    // les chiffres (4, 4) correspondent a repeatX et repeatY
    applyTextureSettings(groundDiff, groundRotation, 4, 4);
    applyTextureSettings(groundRoughness, groundRotation, 4, 4);
    applyTextureSettings(groundNormal, groundRotation, 4, 4);

    // 2. Chargement de l'Atlas d'herbe (une seule fois)
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

export async function loadAllShaders() {
    const vertexResponse = await fetch('./shaders/water/vertex.glsl');
    const waterVertex = await vertexResponse.text();

    const fragmentResponse = await fetch('./shaders/water/fragment.glsl');
    const waterFragment = await fragmentResponse.text();

    const flowerVResponse = await fetch('./shaders/flower/vertex.glsl');
    state.flowerVertexShader = await flowerVResponse.text();

    const flowerFResponse = await fetch('./shaders/flower/fragment.glsl');
    state.flowerFragmentShader = await flowerFResponse.text();

    const kelpVResponse = await fetch('./shaders/kelp/vertex.glsl');
    state.kelpVertexShader = await kelpVResponse.text();

    const kelpFResponse = await fetch('./shaders/kelp/fragment.glsl');
    state.kelpFragmentShader = await kelpFResponse.text();
    
    return { waterVertex, waterFragment };
}
