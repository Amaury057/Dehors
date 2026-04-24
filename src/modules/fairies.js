import * as THREE from 'three';
import { state } from './state.js';

export function setupFairies() {
    const fairyCount = 15;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(fairyCount * 3);

    const pondX = 30;
    const pondZ = 40;
    const pondRadius = 35;

    for (let i = 0; i < fairyCount; i++) {
        const r = Math.random() * pondRadius;
        const theta = Math.random() * Math.PI * 2;

        const anchorX = pondX + r * Math.cos(theta);
        const anchorZ = pondZ + r * Math.sin(theta);
        const anchorY = 1.0 + Math.random() * 5.0;

        state.fairiesData.push({
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
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        transparent: true,
        color: new THREE.Color(0xaaddff).multiplyScalar(10.0),
        opacity: 1.0
    });

    state.fairies = new THREE.Points(geometry, material);
    state.fairies.renderOrder = 10;
    state.scene.add(state.fairies);
}
