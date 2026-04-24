import { state } from './modules/state.js';
import { loadAllShaders } from './modules/loaders.js';
import { setupStats, setupScene, setupCamera, setupRenderer, setupPostProcessing, lights, setupSkybox } from './modules/setup.js';
import { environement } from './modules/environment.js';
import { setupFairies } from './modules/fairies.js';
import { setupGUI } from './modules/gui.js';
import { ImpostorManager } from './impostor/impostor.js';

async function init() {
    // 1. Chargement des shaders
    const { waterVertex, waterFragment } = await loadAllShaders();

    // 2. Setup de base
    setupStats();
    setupScene();
    setupCamera();
    setupRenderer();
    setupPostProcessing();
    lights();

    // 3. Systèmes spéciaux
    state.impostorManager = new ImpostorManager(state.scene, state.camera);
    setupGUI();

    // 4. Création du monde
    environement(waterVertex, waterFragment);
    setupSkybox();
    setupFairies();

    // 5. Events
    window.addEventListener('resize', onWindowResize, false);
    animate();
}

function onWindowResize() {
    state.camera.aspect = window.innerWidth / window.innerHeight;
    state.camera.updateProjectionMatrix();
    state.renderer.setSize(window.innerWidth, window.innerHeight);
    if (state.composer) state.composer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
    state.stats.begin();
    requestAnimationFrame(animate);

    const delta = state.clock.getDelta();
    if (state.controls) state.controls.update(delta);
    if (state.impostorManager) state.impostorManager.update();
    
    const time = state.clock.getElapsedTime();
    if (state.waterMaterial) state.waterMaterial.uniforms.iTime.value = time;
    if (state.kelpMaterial) state.kelpMaterial.uniforms.iTime.value = time;

    if (state.fairies) {
        const positions = state.fairies.geometry.attributes.position.array;
        for (let i = 0; i < state.fairiesData.length; i++) {
            const data = state.fairiesData[i];
            const t = time * data.speed + data.phase;
            positions[i * 3] = data.anchor.x + Math.sin(t) * data.radiusX;
            positions[i * 3 + 1] = data.anchor.y + Math.sin(t * 1.3) * data.radiusY;
            positions[i * 3 + 2] = data.anchor.z + Math.cos(t * 1.1) * data.radiusZ;
        }
        state.fairies.geometry.attributes.position.needsUpdate = true;
    }

    if (state.composer) {
        state.composer.render();
    } else {
        state.renderer.render(state.scene, state.camera);
    }
    
    state.stats.end();
}

init();