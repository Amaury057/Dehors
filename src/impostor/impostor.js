import * as THREE from 'https://esm.sh/three@0.132.2';

export class ImpostorManager {
    constructor(scene, camera) {
        this.scene = scene;
        this.camera = camera;
        this.lodEnabled = false;
        
        // Seuils de distance pour le changement de niveau de détail (LOD)
        this.lowPolyThreshold = 75;   
        this.impostorThreshold = 100; 
        
        // Taille de l'imposteur (à ajuster selon la taille réelle des arbres)
        this.impostorScale = 5.0; 
        
        this.highPolyMeshes = [];
        this.lowPolyMeshes = [];
        this.impostorMesh = null;
        
        this.treeTransforms = [];
        this.states = null; 
    }

    init(highPolyMeshes, lowPolyMeshes, treeTransforms, impostorTexture) {
        this.highPolyMeshes = highPolyMeshes;
        this.lowPolyMeshes = lowPolyMeshes;
        this.treeTransforms = treeTransforms;
        this.states = new Array(treeTransforms.length).fill(0);

        // On utilise un plan plus grand par défaut
        const geometry = new THREE.PlaneGeometry(1, 1);
        geometry.translate(0, 0.5, 0);

        const material = new THREE.MeshStandardMaterial({
            map: impostorTexture,
            transparent: true,
            alphaTest: 0.5,
            side: THREE.DoubleSide,
        });

        this.impostorMesh = new THREE.InstancedMesh(geometry, material, treeTransforms.length);
        
        const dummy = new THREE.Object3D();
        dummy.scale.set(0, 0, 0);
        for (let i = 0; i < treeTransforms.length; i++) {
            this.impostorMesh.setMatrixAt(i, dummy.matrix);
        }
        
        this.scene.add(this.impostorMesh);
    }

    toggle(enabled) {
        this.lodEnabled = enabled;
        
        if (!enabled) {
            const dummy = new THREE.Object3D();
            for (let i = 0; i < this.treeTransforms.length; i++) {
                const transform = this.treeTransforms[i];
                this._updateInstanceScale(this.impostorMesh, i, 0);
                this.lowPolyMeshes.forEach(mesh => this._updateInstanceScale(mesh, i, 0));

                dummy.position.copy(transform.position);
                dummy.rotation.copy(transform.rotation);
                dummy.scale.set(transform.scale, transform.scale, transform.scale);
                dummy.updateMatrix();
                this.highPolyMeshes.forEach(mesh => mesh.setMatrixAt(i, dummy.matrix));
                
                this.states[i] = 0;
            }
            this._triggerUpdates();
        }
    }

    _updateInstanceScale(mesh, index, scaleValue, transform = null) {
        const dummy = new THREE.Object3D();
        if (transform) {
            dummy.position.copy(transform.position);
            // Si c'est l'imposteur, on fera le lookAt dans l'update principal
            if (mesh !== this.impostorMesh) {
                dummy.rotation.copy(transform.rotation);
            }
            dummy.scale.set(scaleValue, scaleValue, scaleValue);
        } else {
            dummy.scale.set(0, 0, 0);
        }
        dummy.updateMatrix();
        mesh.setMatrixAt(index, dummy.matrix);
    }

    _triggerUpdates() {
        if (this.impostorMesh) this.impostorMesh.instanceMatrix.needsUpdate = true;
        this.highPolyMeshes.forEach(mesh => mesh.instanceMatrix.needsUpdate = true);
        this.lowPolyMeshes.forEach(mesh => mesh.instanceMatrix.needsUpdate = true);
    }

    update() {
        if (!this.lodEnabled || !this.impostorMesh) return;

        const cameraPosition = new THREE.Vector3();
        this.camera.getWorldPosition(cameraPosition);

        let stateChanged = false;
        const dummy = new THREE.Object3D();

        for (let i = 0; i < this.treeTransforms.length; i++) {
            const transform = this.treeTransforms[i];
            const distance = cameraPosition.distanceTo(transform.position);
            
            let targetState = 0; 
            if (distance > this.impostorThreshold) targetState = 2;
            else if (distance > this.lowPolyThreshold) targetState = 1;

            // 1. Gérer le changement d'état
            if (targetState !== this.states[i]) {
                // High Poly
                this.highPolyMeshes.forEach(mesh => {
                    this._updateInstanceScale(mesh, i, targetState === 0 ? transform.scale : 0, transform);
                });

                // Low Poly
                this.lowPolyMeshes.forEach(mesh => {
                    this._updateInstanceScale(mesh, i, targetState === 1 ? transform.scale : 0, transform);
                });

                // Imposteur (initial)
                if (targetState !== 2) {
                    this._updateInstanceScale(this.impostorMesh, i, 0);
                }

                this.states[i] = targetState;
                stateChanged = true;
            }

            // 2. Toujours orienter l'imposteur vers la caméra s'il est actif (Billboarding)
            if (this.states[i] === 2) {
                dummy.position.copy(transform.position);
                
                // On oriente le plan vers la caméra (uniquement sur l'axe Y pour éviter qu'il ne penche)
                const eye = new THREE.Vector3(cameraPosition.x, transform.position.y, cameraPosition.z);
                dummy.lookAt(eye);
                
                // Utiliser l'échelle multipliée par la taille de l'imposteur
                const s = transform.scale * this.impostorScale;
                dummy.scale.set(s, s, s);
                
                dummy.updateMatrix();
                this.impostorMesh.setMatrixAt(i, dummy.matrix);
            }
        }

        // Si des imposteurs sont actifs, on doit mettre à jour la matrice à chaque frame 
        // car leur rotation change avec la caméra
        if (stateChanged || this.states.includes(2)) {
            this._triggerUpdates();
        }
    }
}
