import * as THREE from 'three';

export const state = {
    scene: null,
    camera: null,
    renderer: null,
    controls: null,
    stats: null,
    composer: null,
    gui: null,
    impostorManager: null,
    waterMaterial: null,
    bloomPass: null,
    dirLight: null,
    sun: null,
    fairies: null,
    fairiesData: [],
    clock: new THREE.Clock(),
    waterParams: {
        color: '#006b5b',
        opacity: 0.85,
        speed: 1.0,
        waveIntensity: 0.5
    },
    kelpMaterial: null,
    kelpVertexShader: null,
    kelpFragmentShader: null,
    flowerVertexShader: null,
    flowerFragmentShader: null,
    flowerMaterials: [],
    flowerConfigs: [
        { color: "#FF0055", threshold: 0.55, mode: 0.0, stemColor: "#2e4a1e" },
        { color: "#c37b10", threshold: 0.00, mode: 1.0, stemColor: "#2e4a1e" },
        { color: "#AA00FF", threshold: 0.15, mode: 1.0, stemColor: "#2e4a1e" },
        { color: "#19cfab", threshold: 0.00, mode: 1.0, stemColor: "#2e4a1e" },
        { color: "#FFD700", threshold: 0.10, mode: 1.0, stemColor: "#2e4a1e" },
    ]
};
