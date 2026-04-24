import GUI from 'lil-gui';
import { state } from './state.js';

export function setupGUI() {
    state.gui = new GUI();
    const params = {
        impostors: true
    };
    state.gui.add(params, 'impostors').name('Activer LOD (Optimisation)').onChange(value => {
        if (state.impostorManager) {
            state.impostorManager.toggle(value);
        }
    });

    setTimeout(() => {
        if (state.impostorManager) state.impostorManager.toggle(true);
    }, 100);

    const lodFolder = state.gui.addFolder('Réglages Optimisation (LOD)');
    lodFolder.add(state.impostorManager, 'lowPolyThreshold', 10, 150).name('Distance Low Poly');
    lodFolder.add(state.impostorManager, 'impostorThreshold', 50, 300).name('Distance Imposteur');
    lodFolder.add(state.impostorManager, 'impostorScale', 1, 15).name('Taille Imposteur');

    const waterFolder = state.gui.addFolder('Eau de la mare');
    waterFolder.addColor(state.waterParams, 'color').name('Couleur').onChange(val => {
        if (state.waterMaterial) state.waterMaterial.uniforms.uColor.value.set(val);
    });
    waterFolder.add(state.waterParams, 'opacity', 0, 1).name('Opacité').onChange(val => {
        if (state.waterMaterial) state.waterMaterial.uniforms.uOpacity.value = val;
    });
    waterFolder.add(state.waterParams, 'speed', 0, 5).name('Vitesse Vagues').onChange(val => {
        if (state.waterMaterial) state.waterMaterial.uniforms.uSpeed.value = val;
    });
    waterFolder.add(state.waterParams, 'waveIntensity', 0, 2).name('Taille Vagues').onChange(val => {
        if (state.waterMaterial) state.waterMaterial.uniforms.uWaveIntensity.value = val;
    });

    const bloomFolder = state.gui.addFolder('Post-Processing (Bloom)');
    // Paramètre affiché au chargement de la page (n'affecte pas l'affichage final: setupPostProcessing)
    const bloomParams = {
        strength: 0.4,
        radius: 0.5,
        threshold: 0.9
    };

    bloomFolder.add(bloomParams, 'strength', 0, 2).name('Force').onChange(val => {
        if (state.bloomPass) state.bloomPass.strength = val;
    });
    bloomFolder.add(bloomParams, 'radius', 0, 1).name('Rayon (Radius)').onChange(val => {
        if (state.bloomPass) state.bloomPass.radius = val;
    });
    bloomFolder.add(bloomParams, 'threshold', 0, 1).name('Seuil (Threshold)').onChange(val => {
        if (state.bloomPass) state.bloomPass.threshold = val;
    });

    const lightFolder = state.gui.addFolder('Position du Soleil');
    const updateSun = () => {
        if (state.sun && state.dirLight) {
            state.sun.position.copy(state.dirLight.position);
        }
    };
    lightFolder.add(state.dirLight.position, 'x', -200, 200).name('Position X').onChange(updateSun);
    lightFolder.add(state.dirLight.position, 'y', 0, 100).name('Position Y (Hauteur)').onChange(updateSun);
    lightFolder.add(state.dirLight.position, 'z', -200, 200).name('Position Z').onChange(updateSun);
    lightFolder.add(state.dirLight, 'intensity', 0, 5).name('Intensité Lumineuse');
    lightFolder.add(state.sun, 'visible').name('Afficher le Soleil (Source)');

    const fogFolder = state.gui.addFolder('Brouillard');
    const fogParams = {
        color: '#dc9a58',
        density: 0.008
    };

    fogFolder.addColor(fogParams, 'color').name('Couleur').onChange(val => {
        if (state.scene && state.scene.fog) state.scene.fog.color.set(val);
        if (state.scene && state.scene.background) state.scene.background.set(val);
    });
    fogFolder.add(fogParams, 'density', 0, 0.05).name('Densité').onChange(val => {
        if (state.scene && state.scene.fog) state.scene.fog.density = val;
    });

    const kelpFolder = state.gui.addFolder('Kelp (Algues)');
    const kelpParams = {
        brightness: 0.6,
        speed: 1.5,
        colorBottom: '#021804',
        colorTop: '#357e35'
    };
    kelpFolder.add(kelpParams, 'brightness', 0, 3).name('Luminosité').onChange(val => {
        if (state.kelpMaterial) state.kelpMaterial.uniforms.uBrightness.value = val;
    });
    kelpFolder.add(kelpParams, 'speed', 0, 5).name('Vitesse Ondulation').onChange(val => {
        if (state.kelpMaterial) state.kelpMaterial.uniforms.uSpeed.value = val;
    });
    kelpFolder.addColor(kelpParams, 'colorBottom').name('Couleur Base').onChange(val => {
        if (state.kelpMaterial) state.kelpMaterial.uniforms.uColorBottom.value.set(val);
    });
    kelpFolder.addColor(kelpParams, 'colorTop').name('Couleur Sommet').onChange(val => {
        if (state.kelpMaterial) state.kelpMaterial.uniforms.uColorTop.value.set(val);
    });

    const flowerFolder = state.gui.addFolder('Fleurs (Shader)');
    state.flowerConfigs.forEach((config, i) => {
        const sub = flowerFolder.addFolder(`Fleur ${i + 1}`);
        sub.addColor(config, 'color').name('Couleur').onChange(val => {
            if (state.flowerMaterials[i]) {
                state.flowerMaterials[i].uniforms.uFlowerColor.value.set(val);
            }
        });
        sub.add(config, 'threshold', 0, 1).name('Seuil').onChange(val => {
            if (state.flowerMaterials[i]) {
                state.flowerMaterials[i].uniforms.uThreshold.value = val;
            }
        });
        sub.add(config, 'mode', { 'Vertical': 0, 'Horizontal': 1 }).name('Mode').onChange(val => {
            if (state.flowerMaterials[i]) {
                state.flowerMaterials[i].uniforms.uMode.value = parseFloat(val);
            }
        });
    });
    state.gui.close();
}
